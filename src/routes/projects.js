import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects - Public
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des projets.' });
  }
});

// GET /api/projects/:id - Public
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });
    if (!project) return res.status(404).json({ error: 'Projet non trouvé.' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la recherche du projet.' });
  }
});

// POST /api/projects - Admin only
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { slug, titleFr, titleEn, descFr, descEn, problemFr, problemEn, decisionFr, decisionEn, impactFr, impactEn, solvedFr, solvedEn, category, image, demoUrl, githubUrl, featured, order } = req.body;

    if (!slug || !titleFr || !titleEn || !descFr || !descEn) {
      return res.status(400).json({ error: 'Le slug, les titres et descriptions (FR et EN) sont requis.' });
    }

    const newProject = await prisma.project.create({
      data: {
        slug,
        titleFr,
        titleEn,
        descFr,
        descEn,
        problemFr,
        problemEn,
        decisionFr,
        decisionEn,
        impactFr,
        impactEn,
        solvedFr,
        solvedEn,
        category: category || 'web',
        image,
        demoUrl,
        githubUrl,
        featured: featured !== undefined ? featured : true,
        order: order ? parseInt(order, 10) : 0
      }
    });

    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un projet avec ce slug existe déjà.' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du projet.' });
  }
});

// PUT /api/projects/reorder - Admin only (Batch update order)
router.put('/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Un tableau d\'éléments est requis.' });
    }

    await prisma.$transaction(
      items.map(item =>
        prisma.project.update({
          where: { id: item.id },
          data: { order: parseInt(item.order, 10) }
        })
      )
    );

    res.json({ message: 'Ordre réorganisé avec succès.' });
  } catch (error) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: 'Erreur lors de la réorganisation des projets.' });
  }
});

// PUT /api/projects/:id - Admin only
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.order !== undefined) data.order = parseInt(data.order, 10);

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du projet.' });
  }
});

// DELETE /api/projects/:id - Admin only
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Projet supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du projet.' });
  }
});

export default router;
