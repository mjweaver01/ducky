# 🦆 Stripe Setup - Complete Walkthrough

## Quick Start Checklist

- [ ] Create Stripe account (or login)
- [ ] Get API keys
- [ ] Create products & prices
- [ ] Install Stripe CLI
- [ ] Configure .env file
- [ ] Start webhook forwarding
- [ ] Test a payment
- [ ] Verify webhook works

---

## 🏠 LOCAL DEVELOPMENT SETUP

### Step 1: Get Your Stripe API Keys

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **TEST MODE** (toggle in top-right)
3. Copy these two keys:
   - **Secret key** (sk_test_...) - Click "Reveal test key" 
   - **Publishable key** (pk_test_...) - Already visible

⚠️ **Never commit the secret key to git!**

---

### Step 2: Create Products in Stripe

Go to: https://dashboard.stripe.com/test/products

#### Create Pro Plan:
1. Click **"+ Add product"**
2. Fill in:
   ```
   Name: ducky Pro
   Description: Static tunnel URLs, custom subdomains, priority support
   ```
3. Under **Pricing** (Monthly):
   ```
   Pricing model: Recurring
   Price: $9.00
   Billing period: Monthly
   Currency: USD
   ```
4. Click **"Save product"**
5. **📋 COPY THE PRICE ID** (looks like: `price_1ABC...`) - You'll see it in the price row

6. **Add Yearly Price** (optional but recommended):
   - Click **"Add another price"** on the same product
   - Price: $90.00
   - Billing period: Yearly
   - Click **"Add price"**
   - **📋 COPY THIS PRICE ID** too

#### Create Enterprise Plan:
1. Click **"+ Add product"** again
2. Fill in:
   ```
   Name: ducky Enterprise
   Description: Everything in Pro + custom domains, team management, SLA
   ```
3. Under **Pricing** (Monthly):
   ```
   Pricing model: Recurring
   Price: $49.00
   Billing period: Monthly
   Currency: USD
   ```
4. Click **"Save product"**
5. **📋 COPY THE PRICE ID** (looks like: `price_1XYZ...`)

6. **Add Yearly Price** (optional but recommended):
   - Click **"Add another price"** on the same product
   - Price: $490.00
   - Billing period: Yearly
   - Click **"Add price"**
   - **📋 COPY THIS PRICE ID** too

**You should now have 2-4 price IDs** (monthly prices required, yearly prices optional)

---

### Step 3: Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-brew/stripe
```

**Linux:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Extract and move to PATH
```

**Windows:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Or use scoop: scoop install stripe
```

**Verify installation:**
```bash
stripe --version
# Should show: stripe version X.X.X
```

---

### Step 4: Login to Stripe CLI

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Print "Done! The Stripe CLI is configured..."

---

### Step 5: Update Your .env File

Open `/Users/michaelweaver/Websites/ducky-wtf/.env` and update these lines:

```bash
# Replace these with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE

# Replace with the Price IDs you copied from Step 2
# Monthly prices (required)
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_MONTHLY_ID

# Yearly prices (optional, for 17% discount)
STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID
STRIPE_PRICE_ENTERPRISE_YEARLY=price_YOUR_ENTERPRISE_YEARLY_ID

# Leave this as-is for now, we'll get it in Step 6
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

### Step 6: Start Webhook Forwarding

**Open a NEW terminal window** and run:

```bash
cd /Users/michaelweaver/Websites/ducky-wtf
stripe listen --forward-to localhost:3002/api/billing/webhook
```

You should see:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx (use with Stripe CLI)
```

**📋 COPY that webhook secret** (the `whsec_...` part)

**Update .env** with this webhook secret:
```bash
STRIPE_WEBHOOK_SECRET=whsec_THE_SECRET_YOU_JUST_COPIED
```

⚠️ **IMPORTANT**: Keep this terminal running! It must stay open for webhooks to work.

---

### Step 7: Start Your Development Servers

**Terminal 1** - Backend:
```bash
cd /Users/michaelweaver/Websites/ducky-wtf
npm run dev:web-backend
```

**Terminal 2** - Frontend:
```bash
cd /Users/michaelweaver/Websites/ducky-wtf
npm run dev:web-frontend
```

**Terminal 3** - Stripe Webhooks (from Step 6):
```bash
stripe listen --forward-to localhost:3002/api/billing/webhook
```

---

### Step 8: Test the Payment Flow! 🎉

1. **Open your app**: http://localhost:5173
2. **Sign up / Login** to your account
3. **Go to Pricing page**: Click "Upgrade to Pro" or navigate to `/pricing`
4. **Toggle billing interval**: Switch between Monthly and Yearly to see pricing
5. **Select a plan**: Click "Start Pro Monthly" (or Yearly)
6. **You'll be redirected to Stripe Checkout**
7. **Use test card**:
   ```
   Card number: 4242 4242 4242 4242
   Expiration: Any future date (e.g., 12/34)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```
8. **Complete the purchase**
9. **Watch the webhook terminal** - you should see:
   ```
   [200] POST /api/billing/webhook [evt_xxx]
   ```
10. **Check your dashboard** - you should now see "Pro Plan" in the sidebar!

---

## 🧪 Testing Checklist

Test these scenarios:

### ✅ Successful Payment
- [ ] Create checkout session
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Webhook fires (`checkout.session.completed`)
- [ ] User plan updated to "Pro" in database
- [ ] Dashboard shows "Pro Plan" badge
- [ ] Create new token → should have static subdomain

### ✅ Manage Billing
- [ ] Go to Settings → Subscription section
- [ ] Click "Manage Billing"
- [ ] Opens Stripe Customer Portal
- [ ] Can view invoices
- [ ] Can update payment method

### ✅ Cancel Subscription
- [ ] In Customer Portal, cancel subscription
- [ ] Webhook fires (`customer.subscription.deleted`)
- [ ] User plan downgraded to "Free"
- [ ] Dashboard shows "Free Plan" badge
- [ ] "Upgrade to Pro" button appears

---

## 🐛 Troubleshooting

### Webhook not working?
**Check webhook terminal shows events:**
```
stripe listen --forward-to localhost:3002/api/billing/webhook --log-level debug
```

**Verify webhook secret in .env matches the terminal output**

**Check backend logs for errors**

### Payment fails?
**Make sure you're using test mode keys (sk_test_...)**

**Verify price IDs are correct** - check in Stripe Dashboard

**Check browser console** for API errors

### Plan not updating?
**Check backend terminal** - should see:
```
User <userId> upgraded to pro
```

**Verify webhook secret** matches between Stripe CLI and .env

**Check database** - user.plan should be 'pro'

---

## 🚀 PRODUCTION DEPLOYMENT

### Step 1: Switch to Live Mode

1. **Get Production API Keys**: https://dashboard.stripe.com/apikeys
   - Toggle from "Test mode" to "Live mode" (top-right)
   - Copy the **live** secret key (sk_live_...)
   - Copy the **live** publishable key (pk_live_...)

2. **Create Production Products**:
   - In Live mode, recreate your Pro & Enterprise products
   - Copy the **live** price IDs

### Step 2: Create Production Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-production-domain.com/api/billing/webhook`
4. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. **📋 Copy the Signing secret** (whsec_...)

### Step 3: Update Production Environment Variables

Set these on your production server (Vercel, Railway, etc.):

```bash
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_LIVE_PRO_MONTHLY_ID
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_LIVE_ENTERPRISE_MONTHLY_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_LIVE_PRO_YEARLY_ID
STRIPE_PRICE_ENTERPRISE_YEARLY=price_YOUR_LIVE_ENTERPRISE_YEARLY_ID
```

### Step 4: Test Production Webhook

**Test the webhook** from Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**
6. Should show ✅ Success (200)

### Step 5: Configure Stripe Settings

**Enable email receipts**:
- Settings → Emails → Enable "Successful payments"

**Set up tax** (if needed):
- Settings → Tax → Enable Stripe Tax

**Configure billing alerts**:
- Settings → Billing → Set up usage alerts

---

## 📊 Monitoring

### View in Stripe Dashboard

- **Payments**: https://dashboard.stripe.com/payments
- **Subscriptions**: https://dashboard.stripe.com/subscriptions
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Logs**: https://dashboard.stripe.com/logs

### Backend Logs

Watch for these messages:
```
✓ User 123 upgraded to pro
✓ User 123 subscription updated to enterprise
⚠️ User 123 subscription cancelled, downgraded to free
```

---

## 🎫 More Test Cards

```
# Success
4242 4242 4242 4242

# Requires 3D Secure authentication
4000 0025 0000 3155

# Declined - Insufficient funds
4000 0000 0000 9995

# Declined - Generic decline
4000 0000 0000 0002
```

All test cards:
- Expiration: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

Full list: https://stripe.com/docs/testing

---

## 📚 Resources

- **Stripe Docs**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Webhook Events**: https://stripe.com/docs/api/events/types
- **Test Cards**: https://stripe.com/docs/testing
- **Customer Portal**: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal

---

## 🆘 Need Help?

1. Check Stripe Dashboard → Webhooks → Click your endpoint → View attempts
2. Check backend logs for webhook processing errors
3. Check Stripe Logs: https://dashboard.stripe.com/logs
4. Test with Stripe CLI: `stripe trigger checkout.session.completed`

---

**You're all set! 🎉**

Start with local development, test thoroughly, then deploy to production when ready.
