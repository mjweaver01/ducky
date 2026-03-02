#!/usr/bin/env node

import { AuthService } from './auth';
import { TunnelManager } from './tunnel-manager';
import { TunnelServer } from './tunnel-server';
import { HttpServer } from './http-server';
import { logger } from './logger';
import { metrics } from './metrics';
import { initDatabase, getDatabaseConfigFromEnv } from '@ducky.wtf/database';

async function main() {
  const httpPort = parseInt(process.env.PORT || '3000', 10);
  const tunnelDomain = process.env.TUNNEL_DOMAIN || 'localhost';

  if (process.env.DATABASE_HOST || process.env.DATABASE_URL) {
    initDatabase(getDatabaseConfigFromEnv());
    console.log('✓ Database connected');
  }

  logger.info('Starting ducky server', {
    httpPort,
    tunnelDomain,
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
  });

  const authService = new AuthService();
  const tunnelManager = new TunnelManager(tunnelDomain, httpPort);
  const httpServer = new HttpServer(tunnelManager, httpPort);
  const tunnelServer = new TunnelServer(tunnelManager, authService, httpServer.getServer());

  tunnelServer.start();
  await httpServer.start();

  const limits = tunnelManager.getMetrics().limits;

  logger.info('Server ready', {
    httpPort,
    tunnelDomain,
    validTokens: authService.getValidTokens().length,
    limits,
  });

  console.log('\n📋 Configuration:');
  console.log(`   HTTP Port: ${httpPort}`);
  console.log(`   Tunnel Path: /_tunnel`);
  console.log(`   Base Domain: ${tunnelDomain}`);
  console.log(`   Valid Tokens: ${authService.getValidTokens().length} configured`);
  console.log(
    `   Auth Mode: ${process.env.DATABASE_HOST || process.env.DATABASE_URL ? 'database' : 'token'}`
  );
  console.log('\n⚙️  Limits:');
  console.log(`   Max tunnels per token: ${limits.maxTunnelsPerToken}`);
  console.log(`   Max concurrent requests: ${limits.maxConcurrentRequests}`);
  console.log(`   Rate limit: ${limits.rateLimitMaxRequests} requests/minute`);
  console.log(`   Request timeout: ${limits.requestTimeout}ms`);
  console.log('\n✨ Server ready!\n');

  // Log metrics every 5 minutes
  setInterval(
    () => {
      const tunnelMetrics = tunnelManager.getMetrics();
      logger.info('Metrics snapshot', {
        activeTunnels: tunnelMetrics.activeTunnels,
        pendingRequests: tunnelMetrics.totalPendingRequests,
        totalRequests: tunnelMetrics.totalRequestCount,
      });

      console.log(metrics.getMetricsSummary());
    },
    5 * 60 * 1000
  );

  const shutdown = async () => {
    logger.info('Shutting down server');
    console.log('\n\n🛑 Shutting down...');

    await httpServer.stop();
    await tunnelServer.stop();
    logger.close();

    logger.info('Server shut down successfully');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    shutdown();
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    shutdown();
  });
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message, stack: error.stack });
  console.error('Fatal error:', error);
  process.exit(1);
});
