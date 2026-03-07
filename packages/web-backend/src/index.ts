import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initDatabase, closeDatabase, getDatabaseConfigFromEnv } from '@ducky.wtf/database';

import authRoutes from './routes/auth';
import magicLinkRoutes from './routes/magic-link';
import tokenRoutes from './routes/tokens';
import tunnelRoutes from './routes/tunnels';
import domainRoutes from './routes/domains';
import userRoutes from './routes/user';
import billingRoutes from './routes/billing';
import contactRoutes from './routes/contact';
import teamRoutes from './routes/teams';

const app = express();

// Trust the first proxy (e.g. ducky tunnel, nginx) so X-Forwarded-For is used for client IP.
// Required for express-rate-limit when behind a reverse proxy.
app.set('trust proxy', 1);

const PORT = parseInt(process.env.WEB_PORT || '3002');

try {
  initDatabase(getDatabaseConfigFromEnv());
  console.log('✓ Database connected');
} catch (error) {
  console.error('✗ Database connection failed:', error);
  process.exit(1);
}

const allowedOrigins = (process.env.WEB_URL || 'http://localhost:9179')
  .split(',')
  .map((u) => u.trim());

// CORS: set headers ourselves so the response origin can never be wrong
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware
app.use(helmet());
app.use(compression());

// Special handling for Stripe webhooks (needs raw body)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Regular body parsing for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', magicLinkRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/tunnels', tunnelRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/teams', teamRoutes);

// Health check
app.get('/health', async (req, res) => {
  const { getDatabase } = await import('@ducky.wtf/database');
  const db = getDatabase();
  const dbHealthy = await db.healthCheck();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ducky Web Backend API                                   ║
║  Running on: http://localhost:${PORT}                             ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  await closeDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
