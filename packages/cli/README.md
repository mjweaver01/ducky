# ducky CLI

<img src="https://ducky.wtf/duck.svg" alt="duck" width="100">

**Expose your local server to the internet in seconds.**

```bash
npm install -g @ducky.wtf/cli
ducky http 3000
# → https://abc123.ducky.wtf
```

## Features

- 🚀 **Instant tunneling** - No signup required
- 🔒 **Automatic HTTPS** - Secure by default
- 🎯 **Static URLs** - Pro/Enterprise plans keep the same URL forever
- 📊 **Dashboard** - View tunnel history and analytics at [ducky.wtf](https://ducky.wtf)
- 💳 **Flexible billing** - Free, Pro, or Enterprise plans

## Installation

```bash
npm install -g @ducky.wtf/cli
```

## Quick Start

### 1. Start tunneling immediately (anonymous)

```bash
ducky http 3000
# → https://abc123.ducky.wtf (random URL each time)
```

No signup required! Just run it.

### 2. Login to keep your tunnels (optional)

```bash
ducky login
# Enter your email → click magic link → done!
```

### 3. Check your status

```bash
ducky status
```

## CLI Reference

```
ducky http <port|address:port>  Start HTTP tunnel
ducky login                      Login with magic link
ducky status                     Show login status
ducky version                    Show CLI version
ducky update                     Update CLI to latest version
ducky config <subcommand>        Manage configuration

Flags:
  --authtoken <token>   Auth token (overrides saved config)
  --url <url>           Request a specific tunnel URL
  --server-url <url>    Override the tunnel server WebSocket URL
  --config <path>       Path to a custom config file
```

### Config commands

```bash
ducky config auth <token>           # Save auth token manually
ducky config add-server-url <url>   # Save server URL
```

### Examples

```bash
# First time - just run it (anonymous)
ducky http 3000

# Login later
ducky login

# Check version
ducky version

# Update to latest version
ducky update

# Custom URL (Pro/Enterprise)
ducky http 3000 --url https://myapp.ducky.wtf

# Specific address
ducky http 192.168.1.2:8080
```

## Plans

- **Free**: New random URL each time you connect — unlimited tunnels, perfect for testing
- **Pro ($9/month or $90/year)**: Static URL that never changes — perfect for webhooks and integrations
- **Enterprise ($49/month or $490/year)**: Everything in Pro + custom domains, team management, SLA

**Save 17% with annual billing** (equivalent to 2 months free!)

## How it works

```
Internet → ducky.wtf tunnel server → WebSocket → ducky CLI → localhost:3000
```

When you run `ducky http 3000`, the CLI opens a persistent outbound WebSocket connection to our servers. Incoming HTTP traffic is forwarded over that connection to your local port — nothing on your machine needs to be publicly reachable.

## Support

- **Documentation**: [ducky.wtf/docs](https://ducky.wtf/docs)
- **Issues**: [GitHub Issues](https://github.com/mjweaver01/ducky/issues)
- **Contact**: [ducky.wtf/contact](https://ducky.wtf/contact)

## License

MIT
