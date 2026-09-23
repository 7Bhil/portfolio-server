import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/certifications - Public
router.get('/', async (req, res) => {
  try {
    const certs = await prisma.certification.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(certs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des certifications.' });
  }
});

// POST /api/certifications - Admin only
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { title, issuer, date, credentialUrl, imageUrl, order } = req.body;
    if (!title || !issuer || !date) {
      return res.status(400).json({ error: 'Le titre, l\'émetteur et la date sont requis.' });
    }

    const cert = await prisma.certification.create({
      data: {
        title,
        issuer,
        date,
        credentialUrl,
        imageUrl,
        order: order ? parseInt(order, 10) : 0
      }
    });

    res.status(201).json(cert);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la certification.' });
  }
});

// PUT /api/certifications/:id - Admin only
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.order !== undefined) data.order = parseInt(data.order, 10);

    const updated = await prisma.certification.update({
      where: { id: req.params.id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// DELETE /api/certifications/:id - Admin only
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.certification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Certification supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

export default router;
