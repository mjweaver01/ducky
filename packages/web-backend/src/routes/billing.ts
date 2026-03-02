import { Router } from 'express';
import { UserRepository } from '@ducky.wtf/database';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/handlers';
import stripe, { getPriceId, PRICE_TO_PLAN, isStripeConfigured } from '../lib/stripe';
import Stripe from 'stripe';

const router = Router();
const userRepo = new UserRepository();

// Create checkout session
router.post(
  '/create-checkout-session',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const { plan, interval = 'month' } = req.body;

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    if (!interval || !['month', 'year'].includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval' });
    }

    const priceId = getPriceId(plan as 'pro' | 'enterprise', interval as 'month' | 'year');
    if (!priceId || priceId === '') {
      return res.status(400).json({ error: 'Price not configured for this plan and interval' });
    }

    const user = await userRepo.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      await userRepo.update(user.id, { stripe_customer_id: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.WEB_URL}/dashboard/settings?success=true`,
      cancel_url: `${process.env.WEB_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  })
);

// Create customer portal session
router.post(
  '/create-portal-session',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const user = await userRepo.findById(req.user!.id);
    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.WEB_URL}/dashboard/settings`,
    });

    res.json({ url: session.url });
  })
);

// Webhook handler
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  })
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Get subscription to find the plan - expand to get full subscription object
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'customer'],
  });
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? PRICE_TO_PLAN[priceId] : null;

  if (!plan) {
    console.error('Could not determine plan from price ID:', priceId);
    return;
  }

  // Type assertion for current_period_end which exists at runtime
  const periodEnd = (subscription as typeof subscription & { current_period_end?: number })
    .current_period_end;

  // Update user
  await userRepo.update(userId, {
    plan: plan as 'free' | 'pro' | 'enterprise',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_expires_at: periodEnd ? new Date(periodEnd * 1000) : undefined,
  });

  console.log(`User ${userId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const users = await userRepo.list(1000, 0);
  const user = users.find((u) => u.stripe_customer_id === customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? PRICE_TO_PLAN[priceId] : user.plan;

  // Type assertion for current_period_end which exists at runtime
  const periodEnd = (subscription as typeof subscription & { current_period_end?: number })
    .current_period_end;

  await userRepo.update(user.id, {
    plan: plan as 'free' | 'pro' | 'enterprise',
    stripe_subscription_id: subscription.id,
    plan_expires_at: periodEnd ? new Date(periodEnd * 1000) : undefined,
  });

  console.log(`User ${user.id} subscription updated to ${plan}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const users = await userRepo.list(1000, 0);
  const user = users.find((u) => u.stripe_customer_id === customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Downgrade to free
  await userRepo.update(user.id, {
    plan: 'free',
    stripe_subscription_id: undefined,
    plan_expires_at: undefined,
  });

  console.log(`User ${user.id} subscription cancelled, downgraded to free`);
}

export default router;
