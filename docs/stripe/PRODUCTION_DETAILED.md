# Setting Up Stripe Test Mode in Production

This guide helps you set up Stripe payments in **test mode** on your production deployment (Railway, Vercel, etc.).

## Why Test Mode in Production?

- ✅ Test the full payment flow in production environment
- ✅ Verify webhooks work with your production URL
- ✅ No risk - no real money is processed
- ✅ Use test cards to simulate payments
- ✅ Easy to switch to live mode later

---

## Step 1: Get Your Test Mode Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Make sure you're in TEST MODE** (toggle in top-right corner)
3. **Get your API keys**: https://dashboard.stripe.com/test/apikeys

You'll need:
```
Secret key:      sk_test_51...
Publishable key: pk_test_...
```

⚠️ **Important**: These are TEST keys (sk_test_...), not live keys (sk_live_...)

---

## Step 2: Create Test Mode Products

**Go to**: https://dashboard.stripe.com/test/products

### Create Pro Plan (Monthly & Yearly):

**Monthly Price:**
```
Name: ducky Pro
Description: Static tunnel URLs, custom subdomains, priority support
Price: $9.00 / month (recurring)
```
**📋 Copy the Price ID**: `price_1...` (starts with `price_`)

**Yearly Price (same product):**
1. Click on the "ducky Pro" product you just created
2. Click **"Add another price"**
3. Set:
   ```
   Price: $90.00 / year (recurring)
   ```
4. **📋 Copy this Price ID** too: `price_1...`

### Create Enterprise Plan (Monthly & Yearly):

**Monthly Price:**
```
Name: ducky Enterprise  
Description: Everything in Pro + custom domains, team management, SLA
Price: $49.00 / month (recurring)
```
**📋 Copy the Price ID**: `price_1...`

**Yearly Price (same product):**
1. Click on the "ducky Enterprise" product
2. Click **"Add another price"**
3. Set:
   ```
   Price: $490.00 / year (recurring)
   ```
4. **📋 Copy this Price ID** too: `price_1...`

**You should now have 4 price IDs total** (monthly + yearly for each plan)

💡 **Tip**: Yearly pricing gives users a 17% discount (2 months free!)

---

## Step 3: Set Up Production Webhook

**Go to**: https://dashboard.stripe.com/test/webhooks

1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://YOUR-PRODUCTION-URL.com/api/billing/webhook`
   
   Examples:
   - Railway: `https://your-app.up.railway.app/api/billing/webhook`
   - Vercel: `https://your-app.vercel.app/api/billing/webhook`
   - Custom domain: `https://api.ducky.wtf/api/billing/webhook`

3. **Select events**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. Click **"Add endpoint"**

5. **📋 Copy the Signing secret**: `whsec_...`

---

## Step 4: Configure Production Environment Variables

### If using Railway:

```bash
# Go to your Railway project → Variables tab
# Add these environment variables:

STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_FROM_STEP_3

# Monthly prices
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_MONTHLY_ID

# Yearly prices (optional but recommended for 17% discount)
STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID
STRIPE_PRICE_ENTERPRISE_YEARLY=price_YOUR_ENTERPRISE_YEARLY_ID
```

Or via Railway CLI:
```bash
railway login
railway link

# Required
railway variables set STRIPE_SECRET_KEY=sk_test_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set STRIPE_PRICE_PRO_MONTHLY=price_...
railway variables set STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...

# Optional (for yearly billing)
railway variables set STRIPE_PRICE_PRO_YEARLY=price_...
railway variables set STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

### If using Vercel:

```bash
# Via Vercel Dashboard
# Go to Project → Settings → Environment Variables

# Or via CLI:
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRICE_PRO_MONTHLY production
vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production
vercel env add STRIPE_PRICE_PRO_YEARLY production
vercel env add STRIPE_PRICE_ENTERPRISE_YEARLY production
```

### If using other hosting:

Set these environment variables in your hosting platform:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

💡 **Note**: If you only set monthly prices, yearly billing will be disabled.

---

## Step 5: Deploy & Test Webhook

### Deploy your app
```bash
git add .
git commit -m "Configure Stripe test mode"
git push
```

### Test the webhook

**Go to**: https://dashboard.stripe.com/test/webhooks

1. Click on your webhook endpoint
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**
5. Should show **✅ 200 Success**

If it fails:
- Check your webhook URL is correct
- Check logs in your hosting platform
- Verify `STRIPE_WEBHOOK_SECRET` is correct

---

## Step 6: Test a Payment! 🎉

1. **Go to your production app**: `https://your-app.com`
2. **Sign up / Login**
3. **Go to Pricing page**: `/pricing`
4. **Toggle between Monthly and Yearly** to see pricing options
5. **Click "Start Pro Monthly"** (or Yearly)
6. **Use a test card**:
   ```
   Card:     4242 4242 4242 4242
   Exp:      Any future date (12/34)
   CVC:      Any 3 digits (123)
   ZIP:      Any 5 digits (12345)
   ```
7. **Complete checkout**
8. **Verify**:
   - Dashboard shows "Pro Plan" badge
   - Settings → Subscription shows Pro
   - New tokens have static subdomains

### Test Both Billing Intervals:

**Monthly:**
- Select "Monthly" on pricing page
- Price should show $9 for Pro, $49 for Enterprise
- Complete checkout

**Yearly:**
- Select "Yearly" on pricing page
- Price should show $90 for Pro ($18 savings), $490 for Enterprise ($98 savings)
- Complete checkout
- Verify "Save 17%" badge appears

### Check webhook fired:

**Stripe Dashboard** → Webhooks → Click your endpoint → View events
- You should see `checkout.session.completed` with ✅ 200

**Your app logs** (Railway/Vercel):
- Should show: `User <id> upgraded to pro`

---

## Step 7: Test Other Flows

### ✅ Manage Billing
1. Go to Settings → Subscription
2. Click "Manage Billing"
3. Should open Stripe Customer Portal
4. Try updating payment method (use another test card)

### ✅ Cancel Subscription
1. In Customer Portal, cancel subscription
2. Verify webhook fires (`customer.subscription.deleted`)
3. Check dashboard shows "Free Plan" again
4. Check logs: `User <id> subscription cancelled, downgraded to free`

---

## 🧪 Test Cards Reference

```bash
# Success
4242 4242 4242 4242

# Requires 3D Secure authentication
4000 0025 0000 3155

# Declined - Insufficient funds  
4000 0000 0000 9995

# Declined - Generic decline
4000 0000 0000 0002
```

All: Any future expiry, any CVC, any ZIP

Full list: https://stripe.com/docs/testing

---

## 🔍 Monitoring & Debugging

### View Webhook Attempts

**Stripe Dashboard** → Webhooks → Click endpoint → Events
- See all webhook deliveries
- View request/response
- Retry failed webhooks

### View Payments

**Stripe Dashboard** → Payments
- See all test payments
- Click for details

### Check Logs

**Railway**: `railway logs`
**Vercel**: Dashboard → Deployments → Click deployment → Logs

Look for:
```
✓ User 123 upgraded to pro
✓ User 123 subscription updated to enterprise  
⚠️ User 123 subscription cancelled, downgraded to free
```

---

## 🚨 Common Issues

### Webhook returns 404

**Issue**: Webhook endpoint not found

**Fix**:
- Verify URL: `https://your-domain.com/api/billing/webhook`
- Check backend is deployed and running
- Check route is registered in backend

### Webhook returns 400

**Issue**: Signature verification failed

**Fix**:
- Verify `STRIPE_WEBHOOK_SECRET` matches Dashboard
- Copy fresh webhook secret from Stripe Dashboard
- Redeploy app

### Plan not updating

**Issue**: Webhook processed but plan not updated

**Fix**:
- Check backend logs for errors
- Verify price ID mapping in `lib/stripe.ts`
- Check database connection

### Payment succeeds but user stuck on checkout

**Issue**: Redirect URL not working

**Fix**:
- Check `WEB_URL` environment variable is set
- Verify success URL in checkout session creation

---

## 🎯 When to Switch to Live Mode

Switch to **live mode** (real payments) when:

- ✅ All test scenarios pass
- ✅ Webhooks work reliably
- ✅ Plan upgrades/downgrades work
- ✅ Customer Portal works
- ✅ You're ready to accept real payments

### How to Switch to Live Mode:

See the **"PRODUCTION DEPLOYMENT"** section in `STRIPE_SETUP_WALKTHROUGH.md`

In summary:
1. Get **live** API keys (sk_live_..., pk_live_...)
2. Create **live** products (in live mode)
3. Create **live** webhook endpoint
4. Update environment variables with live keys
5. Test with a real $1 payment to yourself
6. Enable for customers

---

## 📊 Monitoring Production (Test Mode)

### Stripe Dashboard

Monitor these daily:
- **Webhooks**: Check success rate
- **Payments**: Review test transactions
- **Logs**: Look for errors

### Your App Logs

Watch for:
- Webhook processing errors
- Failed payment attempts
- Database update failures

### Set Up Alerts

**In Stripe Dashboard**:
- Settings → Email notifications
- Enable "Failed webhook" alerts
- Enable "Payment failed" alerts

---

## 🆘 Need Help?

**Webhook not working?**
1. Check Stripe Dashboard → Webhooks → View attempts
2. Check your app logs
3. Verify webhook secret is correct
4. Test webhook manually from Dashboard

**Payment issues?**
1. Verify using test keys (sk_test_...)
2. Check browser console for errors
3. Check network tab for API errors

**Still stuck?**
- Check full docs: `docs/STRIPE_SETUP_WALKTHROUGH.md`
- Stripe support: https://support.stripe.com

---

## ✅ Production Test Mode Checklist

- [ ] Test mode keys configured in production
- [ ] Created monthly prices for Pro ($9) and Enterprise ($49)
- [ ] Created yearly prices for Pro ($90) and Enterprise ($490)
- [ ] All 4 price IDs added to environment variables
- [ ] Webhook endpoint created with production URL
- [ ] Webhook secret added to environment variables
- [ ] App deployed and running
- [ ] Test webhook sends successfully (200)
- [ ] Can upgrade to Pro (monthly) with test card
- [ ] Can upgrade to Pro (yearly) with test card
- [ ] Dashboard shows Pro plan badge
- [ ] Billing interval toggle works on pricing page
- [ ] Yearly pricing shows savings badge
- [ ] Webhook logs show successful processing
- [ ] Can access Customer Portal
- [ ] Can cancel subscription
- [ ] Downgrade to Free works
- [ ] All test scenarios pass

Once everything works in test mode, you're ready to switch to live mode! 🎉

---

**Next Steps:**
- Test thoroughly in test mode
- Monitor for a few days
- When ready: Switch to live mode (see STRIPE_SETUP_WALKTHROUGH.md)
