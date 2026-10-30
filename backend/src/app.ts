import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// ── Route imports ─────────────────────────────────────────────
import authRoutes         from './routes/authRoutes.js';
import userRoutes         from './routes/userRoutes.js';
import branchRoutes       from './routes/branchRoutes.js';
import shipmentRoutes     from './routes/shipmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import deliveryRoutes     from './routes/deliveryRoutes.js';
import dashboardRoutes    from './routes/dashboardRoutes.js';
import auditRoutes        from './routes/auditRoutes.js';

// ── Middleware imports ────────────────────────────────────────
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// ── Security & logging ────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
  max:      Number(process.env.RATE_LIMIT_MAX       ?? 100),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/branches',      branchRoutes);
app.use('/api/shipments',     shipmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/delivery',      deliveryRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/audit-logs',    auditRoutes);

// ── 404 + global error handler ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
