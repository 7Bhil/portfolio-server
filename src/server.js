import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import skillRoutes from './routes/skills.js';
import experienceRoutes from './routes/experiences.js';
import certificationRoutes from './routes/certifications.js';
import messageRoutes from './routes/messages.js';
import statRoutes from './routes/stats.js';
import chatRoutes from './routes/chat.js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use(globalLimiter);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'Limite de messages IA atteinte. Réessayez dans une minute.' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

import opportunityRoutes from './routes/opportunities.js';
import prisma from './lib/prisma.js';

// Healthcheck Liveness Route (< 50ms)
app.get('/health', (req, res) => res.json({ status: 'pong' }));
app.get('/api/health', (req, res) => res.json({ status: 'pong' }));

// Readiness Route (vérifie la connexion active Neon PostgreSQL)
app.get(['/ready', '/api/ready'], async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Readiness check failed:', err.message);
    res.status(503).json({
      status: 'not_ready',
      database: 'error',
      error: 'Impossible de joindre la base de données'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend Portfolio 7Bhil démarré sur le port http://localhost:${PORT}`);
});
