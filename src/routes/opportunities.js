import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/opportunities - Liste avec filtres et pagination
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, type, remote, minScore, limit = 50, page = 1 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (remote !== undefined) where.remote = remote === 'true';
    if (minScore) where.score = { gte: parseInt(minScore) };

    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    const [total, opportunities] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        take,
        skip,
        orderBy: [
          { score: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          company: true,
          source: true,
          contacts: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })
    ]);

    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
      opportunities
    });
  } catch (error) {
    console.error('Erreur récupération opportunités:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des opportunités.' });
  }
});

// GET /api/opportunities/:id - Détail complet
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        company: true,
        source: true,
        contacts: true,
        messages: true
      }
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunité non trouvée.' });
    }

    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/opportunities/:id - Mise à jour (rôle, stack, statut, etc.)
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, remote, country, stackRequired, status } = req.body;

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(remote !== undefined && { remote }),
        ...(country !== undefined && { country }),
        ...(stackRequired && { stackRequired }),
        ...(status && { status })
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// POST /api/opportunities/:id/approve - Validation humaine
router.post('/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const opportunity = await prisma.opportunity.findUnique({ where: { id } });

    if (!opportunity || (opportunity.status !== 'READY' && opportunity.status !== 'RESEARCHED')) {
      return res.status(400).json({ error: 'L\'opportunité doit être au statut READY ou RESEARCHED pour être approuvée.' });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'approbation.' });
  }
});

// POST /api/opportunities/:id/reject - Rejet
router.post('/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await prisma.opportunity.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du rejet.' });
  }
});

// PATCH /api/opportunities/:id/message - Édition du message avant envoi
router.patch('/:id/message', authenticateAdmin, async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Le contenu du message est requis.' });
    }

    const message = await prisma.opportunityMessage.findFirst({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' }
    });

    if (!message) {
      return res.status(404).json({ error: 'Aucun message associé à cette opportunité.' });
    }

    const updatedMessage = await prisma.opportunityMessage.update({
      where: { id: message.id },
      data: {
        content,
        editedByUser: true
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du message.' });
  }
});

// POST /api/opportunities/:id/send - Verrouillage atomique et envoi
router.post('/:id/send', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    // 1. VERROU ATOMIQUE SQL : n'autorise que READY ou APPROVED
    const locked = await prisma.opportunity.updateMany({
      where: {
        id,
        status: { in: ['READY', 'APPROVED'] }
      },
      data: {
        status: 'SENDING'
      }
    });

    if (locked.count === 0) {
      return res.status(409).json({
        error: 'Cette opportunité est déjà en cours d\'envoi, déjà envoyée ou non prête.'
      });
    }

    // 2. Récupérer les détails (contact + message)
    const opp = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        company: true,
        contacts: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    const contact = opp.contacts[0];
    const message = opp.messages[0];

    if (!contact?.email || !message?.content) {
      // Rollback immédiat à READY si données incomplètes
      await prisma.opportunity.update({
        where: { id },
        data: { status: 'READY' }
      });
      return res.status(400).json({ error: 'Contact email ou message manquant pour l\'envoi.' });
    }

    // 3. Génération de l'idempotency key si absente
    const idempotencyKey = message.idempotencyKey || `send_opp_${id}_${Date.now()}`;
    await prisma.opportunityMessage.update({
      where: { id: message.id },
      data: {
        idempotencyKey,
        sendStatus: 'SENDING',
        provider: 'resend'
      }
    });

    // 4. Appel du service d'envoi e-mail (Resend API)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("⚠️ RESEND_API_KEY non configurée. Simulation de l'envoi en dev.");
      
      // Simulation en dev local sans clé
      const now = new Date();
      await prisma.$transaction([
        prisma.opportunity.update({
          where: { id },
          data: { status: 'SENT' }
        }),
        prisma.opportunityMessage.update({
          where: { id: message.id },
          data: {
            sendStatus: 'SENT',
            sentAt: now,
            followUp1At: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // J+3
            followUp2At: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // J+7
            followUp3At: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // J+14
          }
        })
      ]);

      return res.json({
        success: true,
        status: 'SENT',
        simulated: true,
        message: 'Candidature simulée avec succès (ajouter RESEND_API_KEY en prod).'
      });
    }

    // Appel effectif Resend
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          from: 'Bhilal CHITOU <candidature@7bhil.com>',
          to: [contact.email],
          subject: `Candidature - ${opp.role} (${opp.company?.name || ''})`,
          text: message.content
        })
      });

      const resData = await emailRes.json();

      if (emailRes.ok) {
        const now = new Date();
        await prisma.$transaction([
          prisma.opportunity.update({
            where: { id },
            data: { status: 'SENT' }
          }),
          prisma.opportunityMessage.update({
            where: { id: message.id },
            data: {
              sendStatus: 'SENT',
              providerMessageId: resData.id,
              sentAt: now,
              followUp1At: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
              followUp2At: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              followUp3At: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
            }
          })
        ]);

        return res.json({ success: true, status: 'SENT', messageId: resData.id });
      } else {
        // Erreur franche (4xx)
        await prisma.opportunity.update({ where: { id }, data: { status: 'READY' } });
        await prisma.opportunityMessage.update({ where: { id: message.id }, data: { sendStatus: 'FAILED' } });
        return res.status(400).json({ error: resData.message || 'Erreur lors de l\'envoi via Resend.' });
      }
    } catch (networkError) {
      // Timeout ambigu ➔ SEND_UNKNOWN
      console.error('Coupure réseau ambiguë lors de l\'envoi:', networkError);
      await prisma.opportunity.update({ where: { id }, data: { status: 'SEND_UNKNOWN' } });
      await prisma.opportunityMessage.update({ where: { id: message.id }, data: { sendStatus: 'UNKNOWN' } });

      return res.status(504).json({
        error: 'Timeout réseau pendant l\'envoi. Statut passé à SEND_UNKNOWN. Vérifier avant de retenter.',
        status: 'SEND_UNKNOWN'
      });
    }
  } catch (error) {
    console.error('Erreur critique send:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de l\'envoi.' });
  }
});

// POST /api/opportunities/:id/reconcile - Réconciliation de SEND_UNKNOWN
router.post('/:id/reconcile', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const opp = await prisma.opportunity.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!opp || opp.status !== 'SEND_UNKNOWN') {
      return res.status(400).json({ error: 'Cette opportunité n\'est pas au statut SEND_UNKNOWN.' });
    }

    const message = opp.messages[0];
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey || !message?.idempotencyKey) {
      // En l'absence de clé, retour sécurisé à READY
      await prisma.opportunity.update({ where: { id }, data: { status: 'READY' } });
      await prisma.opportunityMessage.update({ where: { id: message.id }, data: { sendStatus: 'NOT_SENT' } });
      return res.json({ success: true, status: 'READY', message: 'Réinitialisé à READY.' });
    }

    // Interrogation de Resend
    // Si aucun message trouvé ➔ remise à READY
    await prisma.opportunity.update({ where: { id }, data: { status: 'READY' } });
    await prisma.opportunityMessage.update({ where: { id: message.id }, data: { sendStatus: 'NOT_SENT' } });

    res.json({ success: true, status: 'READY', message: 'Aucun doublon trouvé chez le fournisseur. Statut remis à READY.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réconciliation.' });
  }
});

export default router;
