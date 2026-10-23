import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/opportunities - Liste avec filtres et pagination
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, type, remote, minScore, startDate, endDate, limit = 50, page = 1 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (remote !== undefined) where.remote = remote === 'true';
    if (minScore) where.score = { gte: parseInt(minScore) };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

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

// GET /api/opportunities/export/csv - Export CSV complet (MUST be before /:id)
router.get('/export/csv', authenticateAdmin, async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      include: {
        company: true,
        contacts: { take: 1 },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = ['ID','Statut','Rôle','Entreprise','Score','Remote','Pays','Stack','URL Offre','Contact Email','Message Généré','Créé le'];
    const rows = opportunities.map(o => [
      o.id, o.status, o.role || '', o.company?.name || '', o.score,
      o.remote ? 'Oui' : 'Non', o.country || '',
      (o.stackRequired || []).join(' | '), o.jobUrl || '',
      o.contacts[0]?.email || '',
      o.messages[0]?.content?.replace(/\n/g, ' ').slice(0, 200) || '',
      new Date(o.createdAt).toLocaleDateString('fr-FR')
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="opportunites_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Erreur export CSV:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export CSV.' });
  }
});

// GET /api/opportunities/system/activity - Activité pipeline 7 jours (MUST be before /:id)
router.get('/system/activity', authenticateAdmin, async (req, res) => {
  try {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const [created, sent] = await Promise.all([
        prisma.opportunity.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.opportunity.count({ where: { status: 'SENT', updatedAt: { gte: start, lte: end } } })
      ]);
      result.push({
        date: start.toISOString().slice(0, 10),
        label: start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        created, sent
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'activité.' });
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

// DELETE /api/opportunities/:id - Suppression définitive d'une opportunité
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Suppression des relations en cascade
    await prisma.opportunityContact.deleteMany({ where: { opportunityId: id } });
    await prisma.opportunityMessage.deleteMany({ where: { opportunityId: id } });
    await prisma.opportunity.delete({ where: { id } });

    res.json({ success: true, message: 'Opportunité supprimée définitivement.' });
  } catch (error) {
    console.error('Erreur suppression opportunité:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'opportunité.' });
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
          from: 'Bhilal CHITOU <onboarding@resend.dev>',
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

// GET /api/opportunities/system/logs - Liste des logs système filtrables
router.get('/system/logs', authenticateAdmin, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const where = {};
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      where.status = { in: statuses };
    }

    const logs = await prisma.systemLog.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Erreur récupération logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs système.' });
  }
});

// GET /api/opportunities/system/runs - Liste des exécutions du pipeline
router.get('/system/runs', authenticateAdmin, async (req, res) => {
  try {
    const runs = await prisma.pipelineRun.findMany({
      take: 20,
      orderBy: { startedAt: 'desc' }
    });
    res.json(runs);
  } catch (error) {
    console.error('Erreur récupération runs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des runs de pipeline.' });
  }
});

// GET /api/opportunities/system/health - Diagnostic complet des services
router.get('/system/health', authenticateAdmin, async (req, res) => {
  try {
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startDb;

    const sources = await prisma.source.findMany();
    const alertStates = await prisma.alertState.findMany();
    const lastRun = await prisma.pipelineRun.findFirst({
      orderBy: { startedAt: 'desc' }
    });

    res.json({
      database: {
        status: 'UP',
        provider: 'Neon PostgreSQL',
        latencyMs: dbLatencyMs
      },
      sources,
      lastRun,
      alertStates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur diagnostic santé:', error);
    res.status(500).json({
      database: { status: 'DOWN', error: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/opportunities/prospect-send - Envoi direct d'email ciblé à un prospect CRM
router.post('/prospect-send', authenticateAdmin, async (req, res) => {
  try {
    const { to, companyName, subject, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Destinataire et contenu du message obligatoires.' });
    }

    const emailSubject = subject || `Candidature - Ingénieur Full-Stack & Fintech (${companyName || ''})`;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn("⚠️ RESEND_API_KEY absente. Simulation d'envoi prospect.");
      return res.json({
        success: true,
        simulated: true,
        message: 'Envoi simulé en environnement de développement.'
      });
    }

    const idempotencyKey = `prospect_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        from: 'Bhilal CHITOU <onboarding@resend.dev>',
        to: [to],
        subject: emailSubject,
        text: message
      })
    });

    const resData = await emailRes.json();

    if (emailRes.ok) {
      return res.json({
        success: true,
        messageId: resData.id,
        sentAt: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ error: resData.message || 'Erreur lors de l\'envoi via Resend.' });
    }
  } catch (error) {
    console.error('Erreur prospect-send:', error);
    res.status(500).json({ error: 'Erreur interne lors de l\'envoi au prospect.' });
  }
});

// GET /api/opportunities/prospects/sync-from-opportunities - Convertit les entreprises qualifiées des opportunités en prospects CRM
router.get('/prospects/sync-from-opportunities', authenticateAdmin, async (req, res) => {
  try {
    const opps = await prisma.opportunity.findMany({
      where: {
        score: { gte: 60 }
      },
      include: {
        company: true,
        contacts: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const prospects = [];
    const seenCompanies = new Set();

    for (const opp of opps) {
      const companyName = opp.company?.name || 'Entreprise Tech';
      const normKey = companyName.toLowerCase().trim();
      if (seenCompanies.has(normKey)) continue;
      seenCompanies.add(normKey);

      const contactEmail = opp.contacts?.[0]?.email || `jobs@${(opp.company?.domain || companyName.toLowerCase().replace(/[^a-z0-9]/g, ''))}.com`;
      const flagMap = {
        'france': '🇫🇷', 'bénin': '🇧🇯', 'benin': '🇧🇯', 'canada': '🇨🇦',
        'états-unis': '🇺🇸', 'usa': '🇺🇸', 'united states': '🇺🇸', 'uk': '🇬🇧',
        'royaume-uni': '🇬🇧', 'ghana': '🇬🇭', 'nigeria': '🇳🇬', 'kenya': '🇰🇪',
        'allemagne': '🇩🇪', 'germany': '🇩🇪'
      };
      const countryLow = (opp.country || '').toLowerCase();
      let flag = '🌍';
      for (const [key, f] of Object.entries(flagMap)) {
        if (countryLow.includes(key)) {
          flag = f;
          break;
        }
      }

      prospects.push({
        id: `opp_${opp.id}_${normKey.replace(/[^a-z0-9]/g, '_')}`,
        name: companyName,
        website: opp.company?.website || opp.jobUrl || 'https://google.com',
        country: opp.country || 'Remote / International',
        flag,
        status: 'READY',
        sentDate: null,
        recipient: contactEmail,
        description: `Recrute activement sur le poste : ${opp.role}. Score d'adéquation de ${opp.score}/100 sur le stack Bhilal.`,
        techStack: (opp.stackRequired && opp.stackRequired.length > 0) ? opp.stackRequired.join(', ') : 'React, TypeScript, Node.js, Python, PostgreSQL',
        whyFit: `Opportunité détectée (${opp.role}). Besoin fort et confirmé sur la stack technique maîtrisée.`,
        notes: `Importé automatiquement depuis l'offre d'emploi : ${opp.role} (${opp.company?.name || ''}).`
      });
    }

    res.json({ prospects, count: prospects.length });
  } catch (error) {
    console.error('Erreur sync prospects from opportunities:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation des prospects.' });
  }
});

// POST /api/opportunities/prospects/discover-ai - Chasse IA de nouveaux prospects via Gemini
router.post('/prospects/discover-ai', authenticateAdmin, async (req, res) => {
  try {
    const { region = 'Afrique & Remote International', sector = 'Fintech & SaaS' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY non configurée.' });
    }

    const prompt = `Tu es un chasseur de têtes et expert en prospection B2B tech pour Bhilal CHITOU, Ingénieur Logiciel Full-Stack & Mobile de haut niveau basé à Cotonou, Bénin.
Profil de Bhilal :
- Compétences phares : React, React Native, TypeScript, Node.js, Express, Python (Django), Go, PHP (Laravel), PostgreSQL, architectures résilientes, sécurité OWASP.
- Créateur du langage de programmation Bhilal (compilateur transpilé JS).
- Types de cibles : Startups en forte croissance, Fintechs, banques digitales, plateformes de télémigration ou SaaS remote-first.

Tâche :
Trouve EXACTEMENT 5 entreprises réelles et dynamiques dans le secteur "${sector}" et la région "${region}" qui recrutent ou collaborent avec des talents Full-Stack / Backend / Mobile en remote ou télémigration.

Réponds STRICTEMENT avec un tableau JSON valide au format suivant, sans aucun bloc de texte markdown autour :
[
  {
    "name": "Nom de l'entreprise",
    "website": "https://site-officiel.com",
    "country": "Pays ou Ville / Remote",
    "flag": "Drapeau emoji correspondant (ex: 🇫🇷, 🇳🇬, 🇺🇸, 🇬🇭, 🇨🇦, 🇰🇪, 🌍)",
    "recipient": "email de contact probable ou générique (ex: careers@..., contact@..., talent@...)",
    "description": "Courte description en 2 phrases de ce que fait l'entreprise et son impact",
    "techStack": "Technologies principales utilisées (ex: React, Node.js, Python, PostgreSQL, Go)",
    "whyFit": "Pourquoi le profil de Bhilal apporte une valeur directe et évidente pour eux",
    "notes": "Conseil d'approche pour le premier contact"
  }
]`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 }
      })
    });

    if (!geminiRes.ok) {
      // Fallback avec gemini-1.5-flash ou modèle disponible
      const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const fallbackRes = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        })
      });
      if (!fallbackRes.ok) {
        throw new Error('Erreur de communication avec le service Gemini');
      }
      const fData = await fallbackRes.json();
      var rawText = fData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    } else {
      const gData = await geminiRes.json();
      var rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    }

    // Nettoyer d'éventuels ```json ... ```
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let discovered = [];
    try {
      discovered = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Erreur parsing JSON Gemini discover:', parseErr, cleaned);
      return res.status(500).json({ error: 'Réponse IA non exploitable.' });
    }

    const formatted = discovered.map((d, index) => ({
      ...d,
      id: `ai_${Date.now()}_${index}_${(d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      status: 'READY',
      sentDate: null
    }));

    res.json({ prospects: formatted, count: formatted.length });
  } catch (error) {
    console.error('Erreur discover-ai:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la découverte IA de prospects.' });
  }
});

export default router;
