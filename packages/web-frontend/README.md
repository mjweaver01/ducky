# ducky Web Frontend

React + TypeScript + Vite frontend for the ducky tunnel service.

## Features

- **Dashboard**: Manage tunnels, tokens, and custom domains
- **Authentication**: Magic link and password-based login
- **Billing Integration**: Stripe checkout and customer portal
- **Plan Management**: Free, Pro, and Enterprise tiers with billing interval toggle
- **Token Management**: Create, rename, and revoke auth tokens
- **Settings**: Profile management and password changes

## Development

```bash
# Install dependencies (from project root)
npm install

# Start dev server
npm run dev:web-frontend

# Build for production
npm run build -w @ducky.wtf/web-frontend
```

The frontend runs on http://localhost:9179 and connects to the backend API at http://localhost:3002.

## Environment Variables

```bash
# Set in .env at project root
VITE_API_URL=http://localhost:3002  # Backend API URL
WEB_URL=http://localhost:9179       # Frontend URL (for redirects)
```

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast builds and HMR
- **React Router** for navigation
- **Lucide React** for icons
- **Axios** for API calls
- **Stripe** for payment processing

## Project Structure

```
src/
├── api/           # API client and types
├── components/    # Reusable components (tabs, icons)
├── pages/         # Page components
│   ├── LandingPage.tsx
│   ├── PricingPage.tsx
│   ├── DashboardPage.tsx
│   └── ...
└── App.tsx        # Main app with routing
```

## Key Components

### Dashboard Tabs
- **TunnelsTab**: View active tunnels
- **TokensTab**: Manage auth tokens
- **DomainsTab**: Configure custom domains
- **SettingsTab**: Profile, password, and billing

### Pages
- **LandingPage**: Marketing homepage
- **PricingPage**: Plan comparison with monthly/yearly toggle
- **DashboardPage**: Main dashboard with sidebar navigation
- **SignupPage**: User registration
- **LoginPage**: Authentication

## Stripe Integration

The frontend integrates with Stripe for:
- **Checkout**: Redirects to Stripe Checkout for subscriptions
- **Customer Portal**: Manages billing, invoices, and payment methods
- **Plan Display**: Shows current plan and renewal date
- **Upgrade CTAs**: Prompts free users to upgrade

See [../../docs/STRIPE_README.md](../../docs/STRIPE_README.md) for full Stripe setup.

## Contributing

See the main [README.md](../../README.md) for contribution guidelines.

## License

MIT
