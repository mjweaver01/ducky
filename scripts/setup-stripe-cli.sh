#!/bin/bash

# Stripe CLI Setup Script
# Creates products, prices, and updates .env automatically

set -e

echo "🦆 Ducky - Automated Stripe Setup via CLI"
echo "=========================================="
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found!"
    echo ""
    echo "Install it first:"
    echo "  macOS: brew install stripe/stripe-brew/stripe"
    echo "  Other: https://stripe.com/docs/stripe-cli"
    echo ""
    exit 1
fi

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo "❌ jq not found! (needed for JSON parsing)"
    echo ""
    echo "Install it first:"
    echo "  macOS: brew install jq"
    echo "  Linux: apt-get install jq"
    echo ""
    exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null 2>&1; then
    echo "❌ Not logged in to Stripe CLI"
    echo ""
    echo "Login first:"
    echo "  stripe login"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI ready"
echo ""

# Confirm with user
echo "This will:"
echo "  1. Delete existing 'ducky Pro' and 'ducky Enterprise' products (if any)"
echo "  2. Create new products with monthly and yearly prices"
echo "  3. Update your .env file with the new price IDs"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Cleaning up existing products..."

# Delete existing ducky products
stripe products list --limit 100 2>/dev/null | grep -A 1 "ducky Pro\|ducky Enterprise" | grep "id:" | awk '{print $2}' | while read -r prod_id; do
    echo "  Deleting product: $prod_id"
    stripe products delete "$prod_id" 2>/dev/null || true
done

echo "✅ Cleanup complete"
echo ""

# Create Pro Product with Monthly Price
echo "Step 2: Creating Pro product with monthly price..."
PRO_PRODUCT=$(stripe products create \
  --name="ducky Pro" \
  --description="Static tunnel URLs, custom subdomains, priority support" \
  --default_price_data[currency]=usd \
  --default_price_data[unit_amount]=900 \
  --default_price_data[recurring][interval]=month \
  2>/dev/null)

PRO_MONTHLY=$(echo "$PRO_PRODUCT" | jq -r '.default_price')
PRO_PRODUCT_ID=$(echo "$PRO_PRODUCT" | jq -r '.id')

echo "✅ Pro product created: $PRO_PRODUCT_ID"
echo "✅ Pro monthly price: $PRO_MONTHLY"
echo ""

# Create Pro Yearly Price
echo "Step 3: Creating Pro yearly price..."
PRO_YEARLY_RESULT=$(stripe prices create \
  --product="$PRO_PRODUCT_ID" \
  --currency=usd \
  --unit_amount=9000 \
  --recurring[interval]=year \
  2>/dev/null)

PRO_YEARLY=$(echo "$PRO_YEARLY_RESULT" | jq -r '.id')

echo "✅ Pro yearly price: $PRO_YEARLY"
echo ""

# Create Enterprise Product with Monthly Price
echo "Step 4: Creating Enterprise product with monthly price..."
ENT_PRODUCT=$(stripe products create \
  --name="ducky Enterprise" \
  --description="Everything in Pro + custom domains, team management, SLA" \
  --default_price_data[currency]=usd \
  --default_price_data[unit_amount]=4900 \
  --default_price_data[recurring][interval]=month \
  2>/dev/null)

ENT_MONTHLY=$(echo "$ENT_PRODUCT" | jq -r '.default_price')
ENT_PRODUCT_ID=$(echo "$ENT_PRODUCT" | jq -r '.id')

echo "✅ Enterprise product created: $ENT_PRODUCT_ID"
echo "✅ Enterprise monthly price: $ENT_MONTHLY"
echo ""

# Create Enterprise Yearly Price
echo "Step 5: Creating Enterprise yearly price..."
ENT_YEARLY_RESULT=$(stripe prices create \
  --product="$ENT_PRODUCT_ID" \
  --currency=usd \
  --unit_amount=49000 \
  --recurring[interval]=year \
  2>/dev/null)

ENT_YEARLY=$(echo "$ENT_YEARLY_RESULT" | jq -r '.id')

echo "✅ Enterprise yearly price: $ENT_YEARLY"
echo ""

# Update .env file
echo "Step 6: Updating .env file..."

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo ""
    echo "Your price IDs:"
    echo "  STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY"
    echo "  STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY"
    echo "  STRIPE_PRICE_ENTERPRISE_MONTHLY=$ENT_MONTHLY"
    echo "  STRIPE_PRICE_ENTERPRISE_YEARLY=$ENT_YEARLY"
    echo ""
    exit 1
fi

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update or add price IDs
if grep -q "^STRIPE_PRICE_PRO_MONTHLY=" .env; then
    sed -i '' "s|^STRIPE_PRICE_PRO_MONTHLY=.*|STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY|" .env
else
    echo "STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY" >> .env
fi

if grep -q "^STRIPE_PRICE_PRO_YEARLY=" .env; then
    sed -i '' "s|^STRIPE_PRICE_PRO_YEARLY=.*|STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY|" .env
else
    echo "STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY" >> .env
fi

if grep -q "^STRIPE_PRICE_ENTERPRISE_MONTHLY=" .env; then
    sed -i '' "s|^STRIPE_PRICE_ENTERPRISE_MONTHLY=.*|STRIPE_PRICE_ENTERPRISE_MONTHLY=$ENT_MONTHLY|" .env
else
    echo "STRIPE_PRICE_ENTERPRISE_MONTHLY=$ENT_MONTHLY" >> .env
fi

if grep -q "^STRIPE_PRICE_ENTERPRISE_YEARLY=" .env; then
    sed -i '' "s|^STRIPE_PRICE_ENTERPRISE_YEARLY=.*|STRIPE_PRICE_ENTERPRISE_YEARLY=$ENT_YEARLY|" .env
else
    echo "STRIPE_PRICE_ENTERPRISE_YEARLY=$ENT_YEARLY" >> .env
fi

echo "✅ .env file updated (backup saved)"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Stripe Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Products created:"
echo "  📦 ducky Pro ($9/mo, $90/yr)"
echo "  📦 ducky Enterprise ($49/mo, $490/yr)"
echo ""
echo "Price IDs added to .env:"
echo "  ✓ STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY"
echo "  ✓ STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY"
echo "  ✓ STRIPE_PRICE_ENTERPRISE_MONTHLY=$ENT_MONTHLY"
echo "  ✓ STRIPE_PRICE_ENTERPRISE_YEARLY=$ENT_YEARLY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo ""
echo "1️⃣  Start webhook forwarding (in a new terminal):"
echo "   stripe listen --forward-to localhost:3002/api/billing/webhook"
echo ""
echo "2️⃣  Copy the webhook secret it displays and update .env:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_xxx"
echo ""
echo "3️⃣  Start your app:"
echo "   npm run dev"
echo ""
echo "4️⃣  Test a payment:"
echo "   - Open http://localhost:5173"
echo "   - Login → Go to /pricing"
echo "   - Toggle Monthly/Yearly"
echo "   - Click 'Start Pro Monthly'"
echo "   - Use test card: 4242 4242 4242 4242"
echo ""
echo "📖 Full docs: docs/STRIPE_QUICK_START.md"
echo ""
