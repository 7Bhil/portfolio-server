import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/messages - Public contact form submission
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Le nom, l\'email et le message sont obligatoires.' });
    }

    const created = await prisma.message.create({
      data: { name, email, subject: subject || '', message }
    });

    res.status(201).json({ message: 'Votre message a été envoyé avec succès !', id: created.id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
  }
});

// GET /api/messages - Admin only
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages.' });
  }
});

// PATCH /api/messages/:id/read - Admin only
router.patch('/:id/read', authenticateAdmin, async (req, res) => {
  try {
    const { read } = req.body;
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { read: read !== undefined ? read : true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut.' });
  }
});

// DELETE /api/messages/:id - Admin only
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ message: 'Message supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du message.' });
  }
});

export default router;
