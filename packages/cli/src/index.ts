#!/usr/bin/env node

import { ConfigManager } from './config';
import { TunnelClient } from './tunnel-client';
import { parseArgs } from './args-parser';

function printHelp() {
  console.log(`
ngrok-clone - Tunnel your local services to the internet

USAGE:
  ngrok-clone <command> [options]

COMMANDS:
  http <port|address:port>  Start an HTTP tunnel
  config <subcommand>       Manage configuration

HTTP TUNNEL:
  ngrok-clone http 3000
  ngrok-clone http 192.168.1.2:8080
  ngrok-clone http 3000 --url https://myapp.example.com
  ngrok-clone http 3000 --config /path/to/config.json

OPTIONS:
  --url <url>           Request a specific URL for the tunnel
  --config <path>       Path to config file
  --authtoken <token>   Authentication token (overrides config)
  --server-url <url>    Tunnel server URL (default: ws://localhost:4000)

CONFIG COMMANDS:
  config add-authtoken <token>    Save authentication token
  config add-server-url <url>     Save server URL

EXAMPLES:
  # Save your auth token
  ngrok-clone config add-authtoken abc123xyz

  # Start a tunnel to local port 3000
  ngrok-clone http 3000

  # Use a custom URL
  ngrok-clone http 8080 --url https://myapp.tunnel.example.com

  # Connect to a custom server
  ngrok-clone http 3000 --server-url ws://tunnel.example.com:4000
`);
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

  if (parsed.command === 'http') {
    await handleHttp(parsed);
    return;
  }

  console.error(`Unknown command: ${parsed.command}`);
  console.log('Run "ngrok-clone help" for usage information');
  process.exit(1);
}

function handleConfig(parsed: any) {
  const configManager = new ConfigManager(parsed.config);

  if (parsed.subcommand === 'add-authtoken') {
    if (!parsed.token) {
      console.error('Error: Token is required');
      console.log('Usage: ngrok-clone config add-authtoken <token>');
      process.exit(1);
    }
    configManager.addAuthToken(parsed.token);
  } else if (parsed.subcommand === 'add-server-url') {
    if (!parsed.token) {
      console.error('Error: Server URL is required');
      console.log('Usage: ngrok-clone config add-server-url <url>');
      process.exit(1);
    }
    configManager.addServerUrl(parsed.token);
  } else {
    console.error(`Unknown config subcommand: ${parsed.subcommand}`);
    console.log('Available subcommands: add-authtoken, add-server-url');
    process.exit(1);
  }
}

async function handleHttp(parsed: any) {
  if (!parsed.address) {
    console.error('Error: Port or address is required');
    console.log('Usage: ngrok-clone http <port|address:port> [options]');
    process.exit(1);
  }

  const configManager = new ConfigManager(parsed.config);
  
  const authToken = parsed.authToken || configManager.getAuthToken();
  if (!authToken) {
    console.error('Error: No authentication token found');
    console.log('Run "ngrok-clone config add-authtoken <token>" to set your token');
    process.exit(1);
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
