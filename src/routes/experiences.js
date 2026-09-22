import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/experiences - Public
router.get('/', async (req, res) => {
  try {
    const items = await prisma.experience.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des expériences.' });
  }
});

// POST /api/experiences - Admin only
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { type, roleFr, roleEn, companyFr, companyEn, descFr, descEn, dateFr, dateEn, order } = req.body;

    if (!roleFr || !roleEn || !companyFr || !companyEn || !dateFr || !dateEn) {
      return res.status(400).json({ error: 'Les champs obligatoires doivent être renseignés.' });
    }

    const created = await prisma.experience.create({
      data: {
        type: type || 'experience',
        roleFr,
        roleEn,
        companyFr,
        companyEn,
        descFr,
        descEn,
        dateFr,
        dateEn,
        order: order ? parseInt(order, 10) : 0
      }
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création.' });
  }
});

// PUT /api/experiences/:id - Admin only
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.order !== undefined) data.order = parseInt(data.order, 10);

    const updated = await prisma.experience.update({
      where: { id: req.params.id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// DELETE /api/experiences/:id - Admin only
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.experience.delete({ where: { id: req.params.id } });
    res.json({ message: 'Élément supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

export default router;
