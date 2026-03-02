# ducky Features

## Overview

ducky provides secure HTTP tunneling with a modern web dashboard for managing tunnels, tokens, and usage.

---

## Core Features

### 🌐 HTTP Tunneling
- Instant HTTPS URLs with automatic TLS
- Wildcard subdomain routing (`*.ducky.wtf`)
- WebSocket-based persistent connections
- No inbound ports needed — outbound only
- Support for custom local addresses and ports
- **Anonymous tunneling** — no signup required to start

### 🔐 Authentication & Security
- **Anonymous tokens** — automatically created on first use
- **Magic link login** — passwordless authentication via email
- Token-based authentication
- JWT sessions for web dashboard
- Rate limiting (1000 requests per minute per tunnel)
- Request size limits
- User account management

### 📊 Dashboard & Monitoring
- Real-time tunnel status
- Request count and byte transfer statistics
- Tunnel history
- Token management
- User profile and settings

---

## Plan-Based Features

### Anonymous (No Login)
- ✅ Instant access — no signup required
- ✅ Full HTTPS tunneling
- ✅ Automatic token generation
- ⚠️ **Random URL each connection** — URL changes every time
- ⚠️ No dashboard access
- ⚠️ No tunnel history

### Free Plan (Logged In)
- ✅ All anonymous features
- ✅ Dashboard access
- ✅ Tunnel history and statistics
- ✅ Token management
- ✅ Multiple devices/tokens
- ⚠️ **Random URL each connection** — URL changes every time

### Pro & Enterprise Plans

**Pricing:**
- **Pro**: $9/month or $90/year (save 17%)
- **Enterprise**: $49/month or $490/year (save 17%)

**Features:**
- ✅ All Free plan features
- ✅ **Static tunnel URLs** — same URL every time you connect
- ✅ **Custom static subdomains** — choose your own subdomain (e.g., `myapp.ducky.wtf`)
- ✅ **Regenerate subdomain** — get a new static subdomain anytime
- ✅ **Stripe-powered billing** — secure payment processing
- ✅ **Customer portal** — manage subscriptions, invoices, and payment methods
- ✅ Perfect for webhooks, integrations, and sharing
- ✅ Memorable, persistent subdomains
- ✅ **Custom domains** (Enterprise only) — use your own domain (e.g., `tunnel.yourcompany.com`)

**Annual billing saves you 2 months!** 🎉

---

## Billing & Subscriptions

### Payment Processing

ducky uses **Stripe** for secure payment processing:

- ✅ **PCI compliant** — never store credit card data
- ✅ **Stripe Checkout** — hosted payment page
- ✅ **Customer Portal** — self-service billing management
- ✅ **Automatic invoicing** — receipts sent via email
- ✅ **Multiple payment methods** — credit cards, debit cards
- ✅ **SCA compliant** — supports 3D Secure authentication

### Billing Features

**Subscription Management:**
- Upgrade/downgrade between plans
- Switch between monthly and yearly billing
- Cancel subscription anytime (access until period end)
- Automatic renewal with email notifications
- Proration for mid-cycle changes

**Customer Portal:**
Users can manage their own billing through Stripe's Customer Portal:
- Update payment method
- View invoices and receipts
- Download invoice PDFs
- Update billing information
- Cancel subscription
- View payment history

**Access the portal:**
- Dashboard → Settings → "Manage Billing" button
- Or via API: `POST /api/billing/create-portal-session`

### Plan Changes

**Upgrading:**
- Instant access to new features
- Proration applied for remaining billing period
- Webhooks automatically update user plan

**Downgrading:**
- Access maintained until end of current billing period
- Existing static subdomains preserved (but new tokens get random URLs)
- No refunds (use remaining time)

**Cancellation:**
- Cancel anytime from Customer Portal
- Access continues until period end
- Automatically downgraded to Free plan when subscription expires
- All data preserved

### Technical Implementation

**Webhook Events:**
- `checkout.session.completed` — Plan upgrade
- `customer.subscription.updated` — Plan change
- `customer.subscription.deleted` — Cancellation
- `invoice.payment_succeeded` — Successful payment
- `invoice.payment_failed` — Failed payment

**Database Fields:**
- `users.plan` — Current plan (free/pro/enterprise)
- `users.stripe_customer_id` — Stripe customer ID
- `users.stripe_subscription_id` — Active subscription ID
- `users.plan_expires_at` — Next renewal date

**API Endpoints:**
- `POST /api/billing/create-checkout-session` — Start checkout
- `POST /api/billing/create-portal-session` — Open Customer Portal
- `POST /api/billing/webhook` — Process Stripe webhooks

See [STRIPE_README.md](STRIPE_README.md) for complete setup instructions.

---

## Anonymous Tunnels & Magic Link Login

### Anonymous Tunnels

First-time users can start tunneling immediately without any signup:

```bash
$ ducky http 3000
🦆 Welcome to ducky! Creating anonymous tunnel...
✅ Anonymous tunnel created! Run "ducky login" to keep your tunnels.

Public URL: https://a1b2c3d4.ducky.wtf
Forwarding to: localhost:3000
```

**How it works:**
1. CLI automatically creates an anonymous token on first run
2. Token is saved locally (`~/.ducky/config.json`)
3. Tunnel works exactly like authenticated tunnels
4. Random URL assigned each connection

**Limitations:**
- No dashboard access
- No tunnel history
- Can't manage token from web UI
- Random URLs only (no static subdomains)

### Magic Link Login

Users can upgrade from anonymous to logged-in account using magic link authentication:

```bash
$ ducky login
Enter your email: user@example.com
Requesting magic link...

✅ Magic link sent to your email
Check your email for the magic link.
```

**Flow:**
1. User runs `ducky login` in CLI
2. Enters email address
3. Receives magic link via email (or in terminal in dev mode)
4. Clicks link to complete login
5. Existing anonymous token is linked to account
6. Can now access dashboard, history, and manage tokens

**Benefits:**
- Passwordless — no password to remember
- Seamless upgrade from anonymous
- Existing tunnels migrate to account
- Instant access to dashboard

### CLI Commands

```bash
# Start tunnel (creates anonymous token if needed)
ducky http 3000

# Login with magic link
ducky login

# Check current status
ducky status
```

### Status Command

```bash
$ ducky status

🦆 ducky CLI Status

Token: ✅ Configured
Status: 🔓 Anonymous (not logged in)

💡 Run "ducky login" to associate your tunnels with an account.
```

After login:
```bash
$ ducky status

🦆 ducky CLI Status

Token: ✅ Configured
Status: 🔐 Logged in as user@example.com
```

### Database Schema

**auth_tokens table changes:**
- `user_id` is now nullable (NULL for anonymous tokens)
- Added `is_anonymous` boolean flag

**magic_links table (new):**
```sql
CREATE TABLE magic_links (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    anonymous_token VARCHAR(255),  -- Links to existing anonymous token
    expires_at TIMESTAMP NOT NULL,  -- 15 minute expiry
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);
```

---

**Free Users:**
```bash
$ ducky http 3000
✓ Tunnel started: https://a1b2c3d4.ducky.wtf → localhost:3000

# Next time you run it:
$ ducky http 3000
✓ Tunnel started: https://f7e8a9b0.ducky.wtf → localhost:3000
# ↑ Different URL
```

**Pro/Enterprise Users:**
```bash
$ ducky http 3000
✓ Tunnel started: https://abc1234567.ducky.wtf → localhost:3000

# Next time you run it:
$ ducky http 3000
✓ Tunnel started: https://abc1234567.ducky.wtf → localhost:3000
# ↑ Same URL every time
```

**Customizing Your Subdomain:**

Pro and Enterprise users can customize their static subdomain in the dashboard:

1. **Dashboard → Auth Tokens** — view your tokens
2. Click the **Edit** button (pencil icon) next to your static URL
3. Enter your desired subdomain (e.g., `myapp`)
4. Your new URL: `https://myapp.ducky.wtf`

Rules:
- 3-20 characters
- Lowercase letters and numbers only
- Must be unique (not already taken)

You can also regenerate to get a new random subdomain anytime.

### Technical Implementation

When a Pro/Enterprise user creates an auth token:
1. A unique 10-character hex subdomain is generated (e.g., `abc1234567`)
2. The subdomain is stored in the `auth_tokens` table
3. When the CLI connects with that token, the tunnel server assigns the static subdomain
4. The same URL is used for every connection with that token

**Subdomain Customization:**
- Pro/Enterprise users can edit their subdomain in the dashboard
- Validation: 3-20 characters, lowercase alphanumeric only
- Availability check prevents duplicates
- Can regenerate to get a new random subdomain

Free users:
1. Tokens are created without a subdomain (`subdomain = null`)
2. Server generates a random 8-character subdomain on each connection
3. URL changes every time

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'enterprise'
  plan_expires_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  ...
);

-- Auth tokens table
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) UNIQUE,  -- NULL for free users, static for paid
  ...
);
```

### Override Behavior

All users can still request specific subdomains with the `--url` flag:

```bash
ducky http 3000 --url https://myapp.ducky.wtf
```

This overrides the token's default subdomain (or random generation for free users).

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/magic-link` — Request magic link for passwordless login
- `POST /api/auth/magic-verify` — Verify magic link and complete login

### Tokens
- `POST /api/tokens/anonymous` — Create anonymous token (no auth required)
- `GET /api/tokens` — List user's tokens
- `POST /api/tokens` — Create new token (subdomain assigned based on plan)
- `PATCH /api/tokens/:id` — Rename token
- `PATCH /api/tokens/:id/subdomain` — Update subdomain (Pro/Enterprise only)
- `POST /api/tokens/:id/regenerate-subdomain` — Regenerate subdomain (Pro/Enterprise only)
- `DELETE /api/tokens/:id` — Revoke token

### User Management
- `GET /api/user/me` — Get profile
- `PATCH /api/user/me` — Update profile
- `POST /api/user/me/change-password` — Change password

### Tunnels
- `GET /api/tunnels` — List tunnel history
- `GET /api/tunnels/stats` — Get usage statistics
- `POST /api/tunnels/:id/stop` — Stop active tunnel

---

## Configuration

### CLI Config
Stored at `~/.ducky/config.json`:

```json
{
  "authToken": "your-token-here",
  "serverUrl": "wss://ducky.wtf/_tunnel"
}
```

### Environment Variables

**Database:**
- `DATABASE_HOST` — PostgreSQL host
- `DATABASE_PORT` — PostgreSQL port (default: 5432)
- `DATABASE_NAME` — Database name (default: ducky)
- `DATABASE_USER` — Database user
- `DATABASE_PASSWORD` — Database password

**Server:**
- `PORT` — HTTP server port (default: 3000)
- `BASE_DOMAIN` — Base domain for tunnels (default: localhost)
- `TUNNEL_PROTOCOL` — http or https (default: http)
- `MAX_TUNNELS_PER_TOKEN` — Max concurrent tunnels (default: 5)
- `MAX_CONCURRENT_REQUESTS` — Max requests per tunnel (default: 100)
- `RATE_LIMIT_MAX_REQUESTS` — Max requests per minute (default: 1000)

**Web Backend:**
- `PORT` — API server port (default: 3002)
- `WEB_URL` — Frontend URL for CORS (default: http://localhost:5173)
- `JWT_SECRET` — JWT signing secret

**Stripe Payments:**
- `STRIPE_SECRET_KEY` — Stripe API key (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (whsec_...)
- `STRIPE_PRICE_PRO_MONTHLY` — Pro monthly price ID (price_...)
- `STRIPE_PRICE_PRO_YEARLY` — Pro yearly price ID (price_...)
- `STRIPE_PRICE_ENTERPRISE_MONTHLY` — Enterprise monthly price ID (price_...)
- `STRIPE_PRICE_ENTERPRISE_YEARLY` — Enterprise yearly price ID (price_...)

See [STRIPE_README.md](STRIPE_README.md) for complete Stripe setup instructions.

---

## Rate Limits

### Per Tunnel
- 1000 requests per minute
- 100 concurrent requests
- 30 second request timeout

### API
- 1000 requests per 15 minutes per IP

---

## Subdomain Format

### Free Users (Random)
- 8 hex characters (32 bits of entropy)
- Example: `a1b2c3d4`
- ~4.3 billion possible combinations

### Pro/Enterprise (Static)
- 10 hex characters (40 bits of entropy)
- Example: `abc1234567`
- ~1.1 trillion possible combinations
- Unique constraint prevents collisions

---

## Use Cases

### Development & Testing
- Share local dev servers with teammates
- Test webhooks from external services
- Demo in-progress features to clients

### Integrations (Pro/Enterprise)
- Stable webhook URLs for GitHub, Stripe, etc.
- No URL changes when restarting tunnels
- Consistent integration configurations

### IoT & Edge Devices
- Expose local devices to the internet
- Persistent URLs for device APIs
- No port forwarding or dynamic DNS

---

## Security Features

- HTTPS everywhere with automatic TLS
- Token-based authentication
- Rate limiting per tunnel and per IP
- Request size limits
- Database-backed token validation
- JWT sessions for web access
- Password hashing with bcrypt

---

**Next Steps:**
- [Get Started](QUICKSTART_WEB_UI.md)
- [Development Guide](DEV_COMMANDS.md)
- [Deploy to Production](GETTING_LIVE.md)
