import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/skills - Public
router.get('/', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des compétences.' });
  }
});

// POST /api/skills - Admin only
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { name, category, icon, level, order } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Le nom et la catégorie sont requis.' });
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        category,
        icon,
        level: level ? parseInt(level, 10) : 90,
        order: order ? parseInt(order, 10) : 0
      }
    });

    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la compétence.' });
  }
});

// PUT /api/skills/:id - Admin only
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.level) data.level = parseInt(data.level, 10);
    if (data.order) data.order = parseInt(data.order, 10);

    const updated = await prisma.skill.update({
      where: { id: req.params.id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la compétence.' });
  }
});

// DELETE /api/skills/:id - Admin only
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ message: 'Compétence supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la compétence.' });
  }
});

export default router;
