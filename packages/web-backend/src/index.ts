import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initDatabase } from '@ducky/database';

import authRoutes from './routes/auth';
import tokenRoutes from './routes/tokens';
import tunnelRoutes from './routes/tunnels';
import domainRoutes from './routes/domains';
import userRoutes from './routes/user';

const app = express();
const PORT = parseInt(process.env.WEB_PORT || '3002');

// Initialize database
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ngrok_clone',
  user: process.env.DATABASE_USER || 'ngrok',
  password: process.env.DATABASE_PASSWORD || 'ngrok_password',
  ssl: process.env.DATABASE_SSL === 'true',
};

try {
  initDatabase(dbConfig);
  console.log('✓ Database connected');
} catch (error) {
  console.error('✗ Database connection failed:', error);
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:3003',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/tunnels', tunnelRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/health', async (req, res) => {
  const { getDatabase } = await import('@ducky/database');
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { closeDatabase } = await import('@ducky/database');
  await closeDatabase();
  process.exit(0);
});
