import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requireAdmin } from './middleware/auth.js';

// Modular Route Handlers
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import adminRouter from './admin.js';

const app = express();

/* ------------------------------------------------------------
   SECURITY & PARSING MIDDLEWARE
   ------------------------------------------------------------ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// General API Rate Limiting
app.use('/api/', apiLimiter);

/* ------------------------------------------------------------
   SYSTEM HEALTHCHECK
   ------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ananta-api',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's',
    env: env.NODE_ENV
  });
});

/* ------------------------------------------------------------
   APPLICATION ROUTES
   ------------------------------------------------------------ */
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', discoveryRoutes);
app.use('/api/admin', requireAdmin, adminRouter);

/* ------------------------------------------------------------
   404 FALLTHROUGH HANDLER
   ------------------------------------------------------------ */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `API route [${req.method} ${req.originalUrl}] not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

/* ------------------------------------------------------------
   CENTRALIZED ERROR HANDLER
   ------------------------------------------------------------ */
app.use(errorHandler);

/* ------------------------------------------------------------
   SERVER BOOTSTRAP
   ------------------------------------------------------------ */
async function startServer() {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Ananta API running on http://localhost:${env.PORT}`);
    console.log(`🔒 Mode: ${env.NODE_ENV} | CORS: ${env.CLIENT_URL}`);
  });

  // Graceful shutdown handling
  const shutdown = async signal => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('💤 HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer();
}

export default app;
