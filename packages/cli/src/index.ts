#!/usr/bin/env node

import { ConfigManager } from './config';
import { TunnelClient } from './tunnel-client';
import { parseArgs } from './args-parser';
import * as https from 'https';

function printHelp() {
  console.log(`
ducky - Tunnel your local services to the internet

USAGE:
  ducky <command> [options]

COMMANDS:
  http <port|address:port>  Start an HTTP tunnel
  login                     Login with magic link (associates anonymous tunnels)
  status                    Show current login status
  config <subcommand>       Manage configuration

HTTP TUNNEL:
  ducky http 3000
  ducky http 192.168.1.2:8080
  ducky http 3000 --url https://myapp.example.com
  ducky http 3000 --config /path/to/config.json

OPTIONS:
  --url <url>           Request a specific URL for the tunnel
  --config <path>       Path to config file
  --authtoken <token>   Authentication token (overrides config)
  --server-url <url>    Tunnel server URL (default: ws://localhost:3000/_tunnel)

CONFIG COMMANDS:
  config auth <token>             Save authentication token
  config add-server-url <url>     Save server URL
  config server <url>             Same as add-server-url (short alias)

EXAMPLES:
  # First time - just run http (anonymous tunnel)
  ducky http 3000

  # Login later to keep your tunnels
  ducky login

  # Check your status
  ducky status

  # Save a token manually
  ducky config auth abc123xyz

  # Use a custom URL
  ducky http 8080 --url https://myapp.tunnel.example.com
`);
}

async function createAnonymousToken(apiUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({});
    const url = new URL('/api/tokens/anonymous', apiUrl);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const protocol = url.protocol === 'https:' ? https : require('http');
    const req = protocol.request(url, options, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 201) {
          const response = JSON.parse(body);
          resolve(response.token.token);
        } else {
          reject(new Error(`Failed to create anonymous token: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function requestMagicLink(
  apiUrl: string,
  email: string,
  anonymousToken?: string
): Promise<{ magicUrl?: string; message: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, anonymousToken });
    const url = new URL('/api/auth/magic-link', apiUrl);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const protocol = url.protocol === 'https:' ? https : require('http');
    const req = protocol.request(url, options, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to request magic link: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  const parsed = parseArgs(args);

  if (parsed.command === 'config') {
    handleConfig(parsed);
    return;
  }

  if (parsed.command === 'login') {
    await handleLogin(parsed);
    return;
  }

  if (parsed.command === 'status') {
    await handleStatus(parsed);
    return;
  }

  if (parsed.command === 'http') {
    await handleHttp(parsed);
    return;
  }

  console.error(`Unknown command: ${parsed.command}`);
  console.log('Run "ducky help" for usage information');
  process.exit(1);
}

function handleConfig(parsed: any) {
  const configManager = new ConfigManager(parsed.config);

  if (parsed.subcommand === 'auth') {
    if (!parsed.token) {
      console.error('Error: Token is required');
      console.log('Usage: ducky config auth <token>');
      process.exit(1);
    }
    configManager.addAuthToken(parsed.token);
  } else if (parsed.subcommand === 'add-server-url') {
    if (!parsed.token) {
      console.error('Error: Server URL is required');
      console.log('Usage: ducky config add-server-url <url>');
      process.exit(1);
    }
    configManager.addServerUrl(parsed.token);
  } else {
    console.error(`Unknown config subcommand: ${parsed.subcommand}`);
    console.log('Available subcommands: auth, add-server-url, server');
    process.exit(1);
  }
}

async function handleLogin(parsed: any) {
  const configManager = new ConfigManager(parsed.config);
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => readline.question(query, resolve));
  };

  try {
    const email = await question('Enter your email: ');
    if (!email || !/@/.test(email)) {
      console.error('Invalid email address');
      process.exit(1);
    }

    const anonymousToken = configManager.isAnonymous() ? configManager.getAuthToken() : undefined;
    const apiUrl = process.env.API_URL || 'http://localhost:3002';

    console.log('Requesting magic link...');
    const result = await requestMagicLink(apiUrl, email, anonymousToken);

    console.log(`\n✅ ${result.message}`);
    if (result.magicUrl) {
      console.log(`\n🔗 Magic link: ${result.magicUrl}`);
      console.log('\nClick the link in your email (or use the link above) to complete login.');
    } else {
      console.log('\nCheck your email for the magic link.');
    }

    configManager.setEmail(email);
    console.log('\n💡 After clicking the link, run "ducky status" to verify your login.');
  } catch (error) {
    console.error('Failed to request magic link:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    readline.close();
  }
}

async function handleStatus(parsed: any) {
  const configManager = new ConfigManager(parsed.config);
  const token = configManager.getAuthToken();
  const email = configManager.getEmail();
  const isAnon = configManager.isAnonymous();

  console.log('\n🦆 ducky CLI Status\n');
  console.log(`Token: ${token ? '✅ Configured' : '❌ Not configured'}`);
  if (token && isAnon) {
    console.log(`Status: 🔓 Anonymous (not logged in)`);
    console.log(`\n💡 Run "ducky login" to associate your tunnels with an account.`);
  } else if (token && email) {
    console.log(`Status: 🔐 Logged in as ${email}`);
  } else if (token) {
    console.log(`Status: 🔐 Authenticated`);
  } else {
    console.log(`Status: ❌ No token`);
    console.log(`\n💡 Run "ducky http 3000" to get started with an anonymous tunnel.`);
  }
  console.log('');
}

async function handleHttp(parsed: any) {
  if (!parsed.address) {
    console.error('Error: Port or address is required');
    console.log('Usage: ducky http <port|address:port> [options]');
    process.exit(1);
  }

  const configManager = new ConfigManager(parsed.config);

  let authToken = parsed.authToken || configManager.getAuthToken();

  // If no token, create anonymous token
  if (!authToken) {
    console.log('🦆 Welcome to ducky! Creating anonymous tunnel...\n');
    try {
      const apiUrl = process.env.API_URL || 'http://localhost:3002';
      authToken = await createAnonymousToken(apiUrl);
      configManager.setAnonymousToken(authToken);
      console.log('✅ Anonymous tunnel created! Run "ducky login" to keep your tunnels.\n');
    } catch (error) {
      console.error(
        'Failed to create anonymous token:',
        error instanceof Error ? error.message : error
      );
      console.log('\n💡 You can manually set a token with: ducky config auth <token>');
      process.exit(1);
    }
  }

  const serverUrl = parsed.serverUrl || configManager.getServerUrl();

  const client = new TunnelClient({
    authToken,
    backendAddress: parsed.address,
    serverUrl,
    requestedUrl: parsed.url,
  });

  try {
    await client.connect();

    process.on('SIGINT', () => {
      console.log('\n\n👋 Disconnecting...');
      client.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n\n👋 Disconnecting...');
      client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to establish tunnel:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
