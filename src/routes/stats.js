import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/stats - Admin only
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const [projectsCount, skillsCount, messagesCount, unreadMessagesCount, experiencesCount] = await Promise.all([
      prisma.project.count(),
      prisma.skill.count(),
      prisma.message.count(),
      prisma.message.count({ where: { read: false } }),
      prisma.experience.count()
    ]);

    res.json({
      dbStatus: 'connected',
      projectsCount,
      skillsCount,
      messagesCount,
      unreadMessagesCount,
      experiencesCount,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
  }
});

export default router;
