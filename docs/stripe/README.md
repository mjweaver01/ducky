# Stripe Payment Integration

Complete guide to setting up Stripe payments in ducky.

## 📁 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute local setup
- **[PRODUCTION.md](PRODUCTION.md)** - Production deployment guide
- **[SETUP.md](SETUP.md)** - Complete technical reference
- **[WALKTHROUGH.md](WALKTHROUGH.md)** - Detailed step-by-step guide
- **[PRODUCTION_DETAILED.md](PRODUCTION_DETAILED.md)** - Extended production setup

## 🚀 Quick Start

**For local development:**
```bash
./scripts/setup-stripe-cli.sh
```

Then follow [QUICK_START.md](QUICK_START.md) for manual steps.

**For production:**
See [PRODUCTION.md](PRODUCTION.md) for Railway/Vercel setup.

## 💳 Plans & Pricing

- **Pro**: $9/month or $90/year (save 17%)
- **Enterprise**: $49/month or $490/year (save 17%)

## 📋 Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...          # Optional
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...   # Optional
```

## 🧪 Test Cards

```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

## 🛠️ Helper Scripts

- `scripts/setup-stripe-cli.sh` - Automated setup
- `scripts/check-stripe-setup.sh` - Validate configuration
- `scripts/setup-stripe-production.sh` - Railway helper

See [scripts/README.md](../../scripts/README.md) for details.
