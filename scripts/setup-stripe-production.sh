#!/bin/bash

# Stripe Production Setup Script (Test Mode)
# This script helps you configure Stripe in test mode on Railway

echo "🦆 Ducky - Stripe Production Setup (Test Mode)"
echo "=============================================="
echo ""
echo "This will configure Stripe TEST MODE keys on your Railway production deployment."
echo "You can test payments without processing real money."
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo ""
    echo "Install it first:"
    echo "  npm i -g @railway/cli"
    echo "  railway login"
    echo ""
    exit 1
fi

echo "Make sure you have these ready from Stripe Dashboard (TEST MODE):"
echo "  1. Secret key (sk_test_...)"
echo "  2. Webhook secret (whsec_...)"
echo "  3. Pro price ID (price_...)"
echo "  4. Enterprise price ID (price_...)"
echo ""

read -p "Have you created products in Stripe test mode? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 Create products first:"
    echo "  1. Go to: https://dashboard.stripe.com/test/products"
    echo "  2. Create 'ducky Pro'"
    echo "     - Add $9/month price → Copy price ID"
    echo "     - Add $90/year price → Copy price ID"
    echo "  3. Create 'ducky Enterprise'"
    echo "     - Add $49/month price → Copy price ID"
    echo "     - Add $490/year price → Copy price ID"
    echo "  4. You'll have 4 price IDs total"
    echo ""
    exit 1
fi

echo ""
read -p "Have you created a webhook endpoint? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 Create webhook endpoint:"
    echo "  1. Go to: https://dashboard.stripe.com/test/webhooks"
    echo "  2. Add endpoint with your production URL:"
    echo "     https://your-app.up.railway.app/api/billing/webhook"
    echo "  3. Select these events:"
    echo "     - checkout.session.completed"
    echo "     - customer.subscription.updated"
    echo "     - customer.subscription.deleted"
    echo "     - invoice.payment_succeeded"
    echo "     - invoice.payment_failed"
    echo "  4. Copy the webhook signing secret"
    echo ""
    exit 1
fi

echo ""
echo "Great! Now let's configure your Railway environment variables."
echo ""

# Link to project
echo "Linking to Railway project..."
railway link
echo ""

# Set variables
echo "Setting Stripe test mode variables..."
echo ""

read -p "Enter STRIPE_SECRET_KEY (sk_test_...): " STRIPE_SECRET_KEY
railway variables set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

read -p "Enter STRIPE_WEBHOOK_SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET  
railway variables set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

echo ""
echo "Monthly Prices:"
read -p "Enter STRIPE_PRICE_PRO_MONTHLY (price_...): " STRIPE_PRO_MONTHLY
railway variables set STRIPE_PRICE_PRO_MONTHLY="$STRIPE_PRO_MONTHLY"

read -p "Enter STRIPE_PRICE_ENTERPRISE_MONTHLY (price_...): " STRIPE_ENTERPRISE_MONTHLY
railway variables set STRIPE_PRICE_ENTERPRISE_MONTHLY="$STRIPE_ENTERPRISE_MONTHLY"

echo ""
echo "Yearly Prices (optional, press Enter to skip):"
read -p "Enter STRIPE_PRICE_PRO_YEARLY (price_...): " STRIPE_PRO_YEARLY
if [ -n "$STRIPE_PRO_YEARLY" ]; then
    railway variables set STRIPE_PRICE_PRO_YEARLY="$STRIPE_PRO_YEARLY"
else
    echo "  Skipping Pro yearly price"
fi

read -p "Enter STRIPE_PRICE_ENTERPRISE_YEARLY (price_...): " STRIPE_ENTERPRISE_YEARLY
if [ -n "$STRIPE_ENTERPRISE_YEARLY" ]; then
    railway variables set STRIPE_PRICE_ENTERPRISE_YEARLY="$STRIPE_ENTERPRISE_YEARLY"
else
    echo "  Skipping Enterprise yearly price"
fi

echo ""
echo "✅ Environment variables set!"
echo ""
echo "Railway will automatically redeploy with new variables."
echo ""
echo "Next steps:"
echo "  1. Wait for deployment to complete"
echo "  2. Test webhook: https://dashboard.stripe.com/test/webhooks"
echo "  3. Go to your app and try upgrading to Pro"
echo "  4. Use test card: 4242 4242 4242 4242"
echo ""
echo "📖 Full guide: docs/STRIPE_PRODUCTION_TEST_MODE.md"
echo ""
