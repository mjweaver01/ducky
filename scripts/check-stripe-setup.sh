#!/bin/bash

# Stripe Setup Validation Script
# Run this to check if your Stripe setup is correct

echo "🦆 Ducky Stripe Setup Validator"
echo "================================"
echo ""

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "Checking environment variables..."
echo ""

# Check each required variable
ERRORS=0

check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local pattern=$2
    local optional=$3
    
    if [ -z "$var_value" ]; then
        if [ "$optional" == "optional" ]; then
            echo "⚪ $var_name is not set (optional)"
        else
            echo "❌ $var_name is not set"
            ((ERRORS++))
        fi
    elif [ "$var_value" == "sk_test_your_stripe_secret_key" ] || 
         [ "$var_value" == "whsec_your_webhook_secret" ] || 
         [ "$var_value" == "price_your_pro_monthly_price_id" ] ||
         [ "$var_value" == "price_your_enterprise_monthly_price_id" ] ||
         [ "$var_value" == "price_xxx" ]; then
        echo "⚠️  $var_name still has placeholder value"
        ((ERRORS++))
    elif [[ ! "$var_value" =~ $pattern ]]; then
        echo "⚠️  $var_name doesn't match expected pattern"
        echo "   Expected: $pattern"
        echo "   Got: ${var_value:0:20}..."
        ((ERRORS++))
    else
        echo "✅ $var_name is set correctly"
    fi
}

# Check Stripe variables
check_var "STRIPE_SECRET_KEY" "^sk_test_"
check_var "STRIPE_WEBHOOK_SECRET" "^whsec_"

# New variable names (monthly required)
check_var "STRIPE_PRICE_PRO_MONTHLY" "^price_"
check_var "STRIPE_PRICE_ENTERPRISE_MONTHLY" "^price_"

# Yearly prices (optional)
check_var "STRIPE_PRICE_PRO_YEARLY" "^price_" "optional"
check_var "STRIPE_PRICE_ENTERPRISE_YEARLY" "^price_" "optional"

echo ""
echo "Checking Stripe CLI..."

# Check if stripe CLI is installed
if command -v stripe &> /dev/null; then
    echo "✅ Stripe CLI is installed ($(stripe --version))"
    
    # Check if logged in
    if stripe config --list &> /dev/null; then
        echo "✅ Stripe CLI is logged in"
    else
        echo "⚠️  Stripe CLI not logged in"
        echo "   Run: stripe login"
        ((ERRORS++))
    fi
else
    echo "❌ Stripe CLI not installed"
    echo "   Install: brew install stripe/stripe-brew/stripe"
    ((ERRORS++))
fi

echo ""
echo "Checking webhook forwarding..."

# Check if webhook forwarding is running
if lsof -i :3002 | grep -q "stripe"; then
    echo "✅ Stripe webhook forwarding appears to be running"
else
    echo "⚠️  Stripe webhook forwarding may not be running"
    echo "   Start: stripe listen --forward-to localhost:3002/api/billing/webhook"
    echo "   (This is normal if you haven't started it yet)"
fi

echo ""
echo "Checking backend server..."

# Check if backend is running
if lsof -i :3002 | grep -q "node"; then
    echo "✅ Backend server is running on port 3002"
else
    echo "⚠️  Backend server not running"
    echo "   Start: npm run dev:web-backend"
fi

echo ""
echo "================================"

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "Next steps:"
    echo "1. Make sure these are running:"
    echo "   Terminal 1: npm run dev:web-backend"
    echo "   Terminal 2: npm run dev:web-frontend"
    echo "   Terminal 3: stripe listen --forward-to localhost:3002/api/billing/webhook"
    echo ""
    echo "2. Test payment:"
    echo "   - Open: http://localhost:5173"
    echo "   - Login → Click 'Upgrade to Pro'"
    echo "   - Use card: 4242 4242 4242 4242"
    echo ""
else
    echo "⚠️  Found $ERRORS issue(s) that need fixing"
    echo ""
    echo "See STRIPE_SETUP_WALKTHROUGH.md for detailed setup instructions"
fi

echo ""
