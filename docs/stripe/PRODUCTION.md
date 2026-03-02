# 🚀 Stripe Production Setup - Quick Guide

Set up Stripe in **test mode** on production (Railway/Vercel) to test payments safely.

## ⚡ Quick Setup (5 minutes)

### 1. Get Test Keys
```
https://dashboard.stripe.com/test/apikeys
→ Copy: sk_test_... (Secret key)
→ Copy: pk_test_... (Publishable key)
```

### 2. Create Products
```
https://dashboard.stripe.com/test/products

Monthly Prices:
→ Create "ducky Pro" - $9/month → Copy price_xxx
→ Create "ducky Enterprise" - $49/month → Copy price_yyy

Yearly Prices (same products):
→ Add price to "ducky Pro" - $90/year → Copy price_xxx
→ Add price to "ducky Enterprise" - $490/year → Copy price_yyy

Total: 4 price IDs (monthly + yearly for each plan)
```

### 3. Create Webhook
```
https://dashboard.stripe.com/test/webhooks
→ Add endpoint: https://YOUR-APP-URL/api/billing/webhook
→ Select events:
  ✅ checkout.session.completed
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted
  ✅ invoice.payment_succeeded
  ✅ invoice.payment_failed
→ Copy: whsec_... (Signing secret)
```

### 4. Configure Environment Variables

**Railway (Recommended):**
```bash
# Option A: Use the helper script
./scripts/setup-stripe-production.sh

# Option B: Manual via CLI
railway variables set STRIPE_SECRET_KEY=sk_test_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set STRIPE_PRICE_PRO_MONTHLY=price_...
railway variables set STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
railway variables set STRIPE_PRICE_PRO_YEARLY=price_...
railway variables set STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

**Vercel:**
```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRICE_PRO_MONTHLY production
vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production
vercel env add STRIPE_PRICE_PRO_YEARLY production
vercel env add STRIPE_PRICE_ENTERPRISE_YEARLY production
```

### 5. Test Webhook
```
https://dashboard.stripe.com/test/webhooks
→ Click your endpoint
→ "Send test webhook" → checkout.session.completed
→ Should show ✅ 200 Success
```

### 6. Test Payment
```
1. Go to: https://your-production-app.com
2. Sign up / Login
3. Go to /pricing
4. Toggle "Monthly" or "Yearly"
5. Click "Start Pro Monthly" (or Yearly)
6. Use: 4242 4242 4242 4242
7. Complete checkout
8. Verify "Pro Plan" appears in dashboard
```

---

## 🧪 Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0025 0000 3155` | 🔐 3D Secure |
| `4000 0000 0000 9995` | ❌ Declined |

All: Any future date, any CVC, any ZIP

---

## 🔍 Verify It Works

### Check Webhook Fired
```
Stripe Dashboard → Webhooks → Click endpoint → Events
→ Should see checkout.session.completed with 200
```

### Check Plan Updated
```
Your app → Dashboard → Sidebar
→ Should show "Pro Plan" badge with crown icon
```

### Check Logs
```bash
# Railway
railway logs

# Vercel  
vercel logs

# Look for:
✓ User 123 upgraded to pro
```

---

## 🚨 Troubleshooting

### Webhook returns 404
```
❌ Problem: Endpoint not found
✅ Fix: Verify URL is correct
   https://your-app.com/api/billing/webhook
```

### Webhook returns 400
```
❌ Problem: Invalid signature
✅ Fix: Copy fresh webhook secret from Stripe
   Update STRIPE_WEBHOOK_SECRET
```

### Plan not updating
```
❌ Problem: Webhook processing failed
✅ Fix: Check app logs for errors
   Verify price IDs match Stripe dashboard
```

---

## 📋 Environment Variables Checklist

```bash
✅ STRIPE_SECRET_KEY=sk_test_...
✅ STRIPE_WEBHOOK_SECRET=whsec_...
✅ STRIPE_PRICE_PRO_MONTHLY=price_...
✅ STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
✅ STRIPE_PRICE_PRO_YEARLY=price_... (optional)
✅ STRIPE_PRICE_ENTERPRISE_YEARLY=price_... (optional)
```

---

## 🎯 What's Next?

Once everything works in test mode:

1. ✅ Test all flows (upgrade, manage billing, cancel)
2. ✅ Monitor for a few days
3. ✅ When ready: Switch to live mode

**See**: `docs/STRIPE_SETUP_WALKTHROUGH.md` → "Production Deployment"

---

## 🔗 Quick Links

- **Dashboard**: https://dashboard.stripe.com
- **Test Keys**: https://dashboard.stripe.com/test/apikeys
- **Products**: https://dashboard.stripe.com/test/products
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Test Cards**: https://stripe.com/docs/testing

---

## 📖 Full Guides

- **Complete Guide**: `docs/STRIPE_PRODUCTION_TEST_MODE.md`
- **Technical Details**: `docs/STRIPE_SETUP_WALKTHROUGH.md`
- **Quick Start**: `docs/STRIPE_QUICK_START.md`

---

**Ready to go?** Run `./scripts/setup-stripe-production.sh` to get started! 🚀
