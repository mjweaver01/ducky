# Stripe Integration Setup Guide

## Overview

Stripe payment integration is fully implemented for Pro and Enterprise subscriptions. This guide covers setup and testing.

## Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret

# Monthly Prices (required)
STRIPE_PRICE_PRO_MONTHLY=price_...your_pro_monthly_price_id
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...your_enterprise_monthly_price_id

# Yearly Prices (optional, for 17% discount)
STRIPE_PRICE_PRO_YEARLY=price_...your_pro_yearly_price_id
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...your_enterprise_yearly_price_id
```

**Backward Compatibility:** The old variable names `STRIPE_PRO_PRICE_ID` and `STRIPE_ENTERPRISE_PRICE_ID` still work but are deprecated.

## Stripe Dashboard Setup

### 1. Create Products & Prices

**In Stripe Dashboard → Products:**

**Pro Plan (Monthly):**
- Name: "ducky Pro"
- Description: "Static tunnel URLs, custom subdomains, priority support"
- Pricing: $9/month recurring
- Copy the Price ID → `STRIPE_PRICE_PRO_MONTHLY`

**Pro Plan (Yearly - Optional):**
- On the same product, click "Add another price"
- Pricing: $90/year recurring  
- Copy the Price ID → `STRIPE_PRICE_PRO_YEARLY`

**Enterprise Plan (Monthly):**
- Name: "ducky Enterprise"
- Description: "Everything in Pro + custom domains, team management, SLA"
- Pricing: $49/month recurring
- Copy the Price ID → `STRIPE_PRICE_ENTERPRISE_MONTHLY`

**Enterprise Plan (Yearly - Optional):**
- On the same product, click "Add another price"
- Pricing: $490/year recurring
- Copy the Price ID → `STRIPE_PRICE_ENTERPRISE_YEARLY`

### 2. Setup Webhook

**In Stripe Dashboard → Developers → Webhooks:**

1. Click "Add endpoint"
2. Endpoint URL: `https://your-domain.com/api/billing/webhook`
   - For local testing: Use Stripe CLI (see below)
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the Signing secret → `STRIPE_WEBHOOK_SECRET`

## Local Testing with Stripe CLI

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-brew/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### Login & Forward Webhooks

```bash
# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3002/api/billing/webhook
```

This will output a webhook signing secret starting with `whsec_`. Use this for `STRIPE_WEBHOOK_SECRET` in development.

### Trigger Test Events

```bash
# Test checkout completed
stripe trigger checkout.session.completed

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted
```

## Payment Flow

### User Upgrading to Pro

1. User navigates to `/pricing`
2. Selects billing interval (monthly or yearly)
3. Clicks "Start Pro Monthly" (or Yearly)
4. `POST /api/billing/create-checkout-session { plan: 'pro', interval: 'month' }`
5. Backend creates Stripe Checkout Session with appropriate price ID
6. User redirected to Stripe hosted checkout
7. User enters payment details
8. On success, Stripe sends webhook to `/api/billing/webhook`
9. Backend handles `checkout.session.completed`:
   - Updates user plan to 'pro'
   - Saves stripe_customer_id and stripe_subscription_id
   - Sets plan_expires_at
10. User redirected to `/dashboard/settings?success=true`
11. Future tokens created by this user will have static subdomains

### Managing Billing

1. User goes to Dashboard → Settings
2. Clicks "Manage Billing"
3. `POST /api/billing/create-portal-session`
4. Backend creates Stripe Customer Portal session
5. User redirected to Stripe hosted portal
6. User can:
   - Update payment method
   - Cancel subscription
   - View invoices
   - Update billing details

### Subscription Changes

**Upgrade/Downgrade:**
- Handled automatically in Customer Portal
- Webhook `customer.subscription.updated` fires
- Backend updates user plan

**Cancellation:**
- User cancels in Customer Portal
- Webhook `customer.subscription.deleted` fires
- Backend downgrades user to 'free'
- Existing tokens keep their subdomains until next token creation

## API Endpoints

### Create Checkout Session
```
POST /api/billing/create-checkout-session
Authorization: Bearer <jwt>
Body: { "plan": "pro" | "enterprise" }
Response: { "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }
```

### Create Portal Session
```
POST /api/billing/create-portal-session
Authorization: Bearer <jwt>
Response: { "url": "https://billing.stripe.com/..." }
```

### Webhook Handler
```
POST /api/billing/webhook
Headers: stripe-signature
Body: <raw Stripe event>
Response: { "received": true }
```

## Database Schema Impact

**users table** (already has these fields):
- `plan` VARCHAR(50) — 'free', 'pro', 'enterprise'
- `plan_expires_at` TIMESTAMP
- `stripe_customer_id` VARCHAR(255)
- `stripe_subscription_id` VARCHAR(255)

**auth_tokens table**:
- `subdomain` is only set for Pro/Enterprise users

## Testing Checklist

- [ ] Environment variables set
- [ ] Stripe CLI forwarding webhooks
- [ ] Can create Pro checkout session
- [ ] Checkout redirects to Stripe
- [ ] Test card works (4242 4242 4242 4242)
- [ ] Webhook fires on successful payment
- [ ] User plan upgraded in database
- [ ] New tokens have static subdomains
- [ ] Can access Customer Portal
- [ ] Can cancel subscription
- [ ] Webhook fires on cancellation
- [ ] User downgraded to free

## Test Cards

```
# Successful payment
4242 4242 4242 4242

# Requires authentication (3D Secure)
4000 0025 0000 3155

# Declined
4000 0000 0000 9995
```

Use any future expiration date and any 3-digit CVC.

## Production Deployment

1. **Update environment variables** with production keys
2. **Configure webhook** with production URL
3. **Test webhook** is receiving events
4. **Enable Stripe's email receipts** (Stripe Dashboard → Settings → Emails)
5. **Configure tax** if needed (Stripe Tax)
6. **Set up billing alerts** (Stripe Dashboard → Settings → Alerts)

## Webhook Security

The webhook endpoint verifies the Stripe signature to ensure events are authentic:

```typescript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

⚠️ **Important**: The webhook route uses `express.raw()` middleware to preserve the raw body for signature verification. Don't add JSON parsing middleware before this route.

## Monitoring

### In Stripe Dashboard

- **Payments** — View all payments
- **Subscriptions** — View all subscriptions
- **Webhooks** — View webhook delivery status
- **Logs** — View API requests

### In Your Application

Check backend logs for:
```
User <userId> upgraded to <plan>
User <userId> subscription updated to <plan>
User <userId> subscription cancelled, downgraded to free
```

## Troubleshooting

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook secret matches
- Check Stripe CLI is running (`stripe listen`)
- View webhook attempts in Stripe Dashboard

**Payment fails:**
- Check Stripe API key is correct (test vs live)
- Verify price IDs are correct
- Check customer has valid payment method

**Plan not updating:**
- Check webhook secret is correct
- View webhook logs in Stripe Dashboard
- Check backend logs for errors
- Verify price ID mapping in `lib/stripe.ts`

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Test Cards: https://stripe.com/docs/testing
