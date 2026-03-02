# 🦆 Stripe Setup - Quick Reference Card

## 🏃 Quick Start (5 minutes)

### 1. Get Keys
```
https://dashboard.stripe.com/test/apikeys
→ Copy: Secret key (sk_test_...)
→ Copy: Publishable key (pk_test_...)
```

### 2. Create Products
```
https://dashboard.stripe.com/test/products

Monthly:
→ Create "ducky Pro" at $9/month → Copy: price_xxx
→ Create "ducky Enterprise" at $49/month → Copy: price_yyy

Yearly (optional, for 17% discount):
→ Add to "ducky Pro" at $90/year → Copy: price_xxx
→ Add to "ducky Enterprise" at $490/year → Copy: price_yyy
```

### 3. Install & Login
```bash
brew install stripe/stripe-brew/stripe
stripe login
```

### 4. Update .env
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_MONTHLY_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID
STRIPE_PRICE_ENTERPRISE_YEARLY=price_YOUR_ENTERPRISE_YEARLY_ID
STRIPE_WEBHOOK_SECRET=whsec_FROM_NEXT_STEP
```

### 5. Start Webhook Forwarding
```bash
stripe listen --forward-to localhost:3002/api/billing/webhook
# Copy the whsec_... and update .env
```

### 6. Start Servers
```bash
# Terminal 1
npm run dev:web-backend

# Terminal 2  
npm run dev:web-frontend

# Terminal 3 (keep running!)
stripe listen --forward-to localhost:3002/api/billing/webhook
```

### 7. Test Payment
```
1. Open: http://localhost:5173
2. Login → Click "Upgrade to Pro"
3. Use card: 4242 4242 4242 4242
4. Check webhook terminal for [200] POST
5. Dashboard should show "Pro Plan"
```

---

## 🧪 Test Cards

| Purpose | Card Number | 
|---------|-------------|
| ✅ Success | `4242 4242 4242 4242` |
| 🔐 3D Secure | `4000 0025 0000 3155` |
| ❌ Declined | `4000 0000 0000 9995` |

All: Any future date, any CVC, any ZIP

---

## 🚨 Common Issues

### "Webhook not working"
```bash
# Check this terminal is running:
stripe listen --forward-to localhost:3002/api/billing/webhook

# Verify .env has the whsec_... from terminal output
```

### "Payment fails"  
```bash
# Check you're using test keys (sk_test_...)
# Verify price IDs match Stripe dashboard
```

### "Plan not updating"
```bash
# Check webhook secret in .env matches CLI output
# Check backend logs for "User X upgraded to pro"
```

---

## 📋 Environment Variables Needed

```bash
# Backend (.env)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_... (optional)
STRIPE_PRICE_ENTERPRISE_YEARLY=price_... (optional)
```

---

## 🔗 Quick Links

- **Dashboard**: https://dashboard.stripe.com
- **Test Keys**: https://dashboard.stripe.com/test/apikeys  
- **Products**: https://dashboard.stripe.com/test/products
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Payments**: https://dashboard.stripe.com/test/payments
- **Docs**: https://stripe.com/docs

---

## 🚀 Production Checklist

- [ ] Switch to Live mode in Stripe Dashboard
- [ ] Get live API keys (sk_live_..., pk_live_...)
- [ ] Create live products & copy price IDs
- [ ] Create webhook endpoint with production URL
- [ ] Update production env vars
- [ ] Test webhook (Dashboard → Send test webhook)
- [ ] Enable email receipts in Settings
- [ ] Monitor first real payment

---

**Full walkthrough**: See `STRIPE_SETUP_WALKTHROUGH.md`
