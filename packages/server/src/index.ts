#!/usr/bin/env node

import { AuthService } from './auth';
import { TunnelManager } from './tunnel-manager';
import { TunnelServer } from './tunnel-server';
import { HttpServer } from './http-server';

async function main() {
  const httpPort = parseInt(process.env.PORT || '3000', 10);
  const tunnelPort = parseInt(process.env.TUNNEL_PORT || '4000', 10);
  const tunnelDomain = process.env.TUNNEL_DOMAIN || 'localhost';

  console.log('🚀 Starting ngrok-clone server...\n');

  const authService = new AuthService();
  const tunnelManager = new TunnelManager(tunnelDomain);
  const tunnelServer = new TunnelServer(tunnelManager, authService, tunnelPort);
  const httpServer = new HttpServer(tunnelManager, httpPort);

  tunnelServer.start();
  await httpServer.start();

  console.log('\n📋 Configuration:');
  console.log(`   HTTP Port: ${httpPort}`);
  console.log(`   Tunnel Port: ${tunnelPort}`);
  console.log(`   Base Domain: ${tunnelDomain}`);
  console.log(`   Valid Tokens: ${authService.getValidTokens().length} configured`);
  console.log('\n✨ Server ready!\n');

  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await httpServer.stop();
    await tunnelServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down...');
    await httpServer.stop();
    await tunnelServer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
