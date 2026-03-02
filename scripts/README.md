# 🚀 Quick Stripe Setup via CLI

The fastest way to set up Stripe for ducky.

## Prerequisites

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Install jq (for JSON parsing)
brew install jq

# Login to Stripe
stripe login
```

## One-Command Setup

```bash
./scripts/setup-stripe-cli.sh
```

This script will:
1. ✅ Delete any existing ducky products
2. ✅ Create "ducky Pro" ($9/mo, $90/yr)
3. ✅ Create "ducky Enterprise" ($49/mo, $490/yr)
4. ✅ Update your `.env` file automatically
5. ✅ Show you next steps

## What Gets Created

### Products & Prices
- **ducky Pro**
  - Monthly: $9/month (`STRIPE_PRICE_PRO_MONTHLY`)
  - Yearly: $90/year (`STRIPE_PRICE_PRO_YEARLY`) - Save 17%

- **ducky Enterprise**
  - Monthly: $49/month (`STRIPE_PRICE_ENTERPRISE_MONTHLY`)
  - Yearly: $490/year (`STRIPE_PRICE_ENTERPRISE_YEARLY`) - Save 17%

### Environment Variables Updated
```bash
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_yyy
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_zzz
STRIPE_PRICE_ENTERPRISE_YEARLY=price_www
```

## After Running the Script

### 1. Start Webhook Forwarding
```bash
stripe listen --forward-to localhost:3002/api/billing/webhook
```

Copy the webhook secret it displays (`whsec_xxx`) and add to `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2. Start Your App
```bash
npm run dev
```

### 3. Test a Payment
1. Open http://localhost:5173
2. Login or signup
3. Navigate to `/pricing`
4. Toggle between Monthly/Yearly billing
5. Click "Start Pro Monthly" (or Yearly)
6. Use test card: `4242 4242 4242 4242`
7. Watch the webhook terminal for the success event

## Verify Setup

```bash
# Check your Stripe setup
./scripts/check-stripe-setup.sh

# View products in dashboard
open https://dashboard.stripe.com/test/products

# View webhooks
open https://dashboard.stripe.com/test/webhooks
```

## Manual Cleanup (if needed)

```bash
# List all products
stripe products list

# Delete a specific product
stripe products delete prod_xxx

# Delete all ducky products
stripe products list --limit 100 | grep -A 1 "ducky" | grep "id:" | awk '{print $2}' | xargs -I {} stripe products delete {}
```

## Production Setup

For production, see:
- [`docs/STRIPE_PRODUCTION_TEST_MODE.md`](../docs/STRIPE_PRODUCTION_TEST_MODE.md) - Test mode on production
- [`docs/STRIPE_PRODUCTION_QUICK.md`](../docs/STRIPE_PRODUCTION_QUICK.md) - Quick production guide
- [`scripts/setup-stripe-production.sh`](setup-stripe-production.sh) - Interactive Railway setup

## Troubleshooting

### "stripe: command not found"
```bash
brew install stripe/stripe-brew/stripe
```

### "jq: command not found"
```bash
brew install jq
```

### "Not logged in to Stripe CLI"
```bash
stripe login
```

### Products already exist
The script automatically deletes existing ducky products before creating new ones.

### Webhook not receiving events
1. Make sure backend is running: `npm run dev:web-backend`
2. Check webhook forwarding is active
3. Verify webhook secret in `.env` matches the CLI output

## Related Docs

- [STRIPE_QUICK_START.md](../docs/STRIPE_QUICK_START.md) - Manual 5-minute setup
- [STRIPE_SETUP_WALKTHROUGH.md](../docs/STRIPE_SETUP_WALKTHROUGH.md) - Detailed guide
- [STRIPE_README.md](../docs/STRIPE_README.md) - Full Stripe documentation index

---

**Time to complete:** ~2 minutes  
**Lines of code you write:** 0  
**Stripe commands you run:** 1
