import 'reflect-metadata';
import dns from 'dns';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth.routes';
import beekeeperRoutes from './routes/beekeeper.routes';
import adminRoutes from './routes/admin.routes';
import { authenticate, requireRole } from './middleware/auth';

dotenv.config();

// Prefer IPv4 first to avoid ENETUNREACH with IPv6-only resolutions in some hosts
try {
  dns.setDefaultResultOrder('ipv4first');
  console.log('🌐 DNS default result order set to ipv4first');
} catch {}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Honeypot API is running',
    timestamp: new Date().toISOString(),
    database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/beekeepers', beekeeperRoutes);
app.use('/api/admin', authenticate, requireRole('admin'), adminRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route nicht gefunden',
  });
});

// Database Connection
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
