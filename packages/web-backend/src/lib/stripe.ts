import Stripe from 'stripe';

// Use dummy key if not configured (prevents startup errors in dev)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_development';

const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-02-25.clover',
});

export default stripe;

export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

// Product and Price IDs (set these in Stripe Dashboard or create programmatically)
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRO_PRICE_ID || '',
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  ENTERPRISE_MONTHLY:
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  ENTERPRISE_YEARLY: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
};

// Log Stripe configuration status on startup
const isFullyConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

if (isFullyConfigured) {
  const hasMonthly = !!(STRIPE_PRICES.PRO_MONTHLY && STRIPE_PRICES.ENTERPRISE_MONTHLY);
  const hasYearly = !!(STRIPE_PRICES.PRO_YEARLY && STRIPE_PRICES.ENTERPRISE_YEARLY);

  console.log('✓ Stripe configured');
  console.log(`  → Monthly pricing: ${hasMonthly ? '✓ Pro + Enterprise' : '✗ Missing'}`);
  console.log(
    `  → Yearly pricing: ${hasYearly ? '✓ Pro + Enterprise (17% savings)' : '⚠ Not configured (optional)'}`
  );

  if (!hasMonthly) {
    console.warn(
      '⚠ Warning: Monthly price IDs not configured. Set STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_ENTERPRISE_MONTHLY'
    );
  }
} else {
  console.log('⚠ Stripe not configured - billing features disabled');
  console.log('  Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable');
}

// Helper function to get price ID based on plan and interval
export function getPriceId(plan: 'pro' | 'enterprise', interval: 'month' | 'year'): string {
  if (plan === 'pro') {
    return interval === 'month' ? STRIPE_PRICES.PRO_MONTHLY : STRIPE_PRICES.PRO_YEARLY;
  }
  return interval === 'month' ? STRIPE_PRICES.ENTERPRISE_MONTHLY : STRIPE_PRICES.ENTERPRISE_YEARLY;
}

// Price to plan mapping (for webhooks)
export const PRICE_TO_PLAN: Record<string, string> = {
  [STRIPE_PRICES.PRO_MONTHLY]: 'pro',
  [STRIPE_PRICES.PRO_YEARLY]: 'pro',
  [STRIPE_PRICES.ENTERPRISE_MONTHLY]: 'enterprise',
  [STRIPE_PRICES.ENTERPRISE_YEARLY]: 'enterprise',
};
