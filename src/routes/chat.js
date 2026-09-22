import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

const SYSTEM_INSTRUCTION = `
Tu es l'assistant commercial et conseiller technique d'élite de Bhilal CHITOU, Ingénieur Logiciel Full-Stack & Mobile de haut niveau.

À PROPOS DE BHILAL CHITOU :
- Rôle : Ingénieur Logiciel Full-Stack, Mobile & Architecte Sécurité.
- Stack Principale :
  * Web & Frontend : TypeScript, React, Next.js, Astro, Tailwind CSS (performant, ultra-rapide, optimisé SEO).
  * Backend & APIs : Node.js, Express, NestJS, Python (Django), PHP (Laravel), architectures microservices et REST/GraphQL.
  * Mobile : React Native, Expo (applications iOS/Android natives fluides avec mode offline-first).
  * Bases de données & Cloud : PostgreSQL (Neon), MongoDB, Docker, VPS, Linux, CI/CD.
  * Créateur du compilateur Bhilal Language (v1.2.0) : preuve de maîtrise profonde de l'ingénierie logicielle et des structures de données.
- Atouts majeurs : Sécurité dès la conception (normes OWASP, zéro faille), Clean Architecture, vitesse d'exécution, fiabilité et 30 jours de garantie/support post-livraison offerts.
- Tarifs indicatifs :
  * Projets au forfait délimités ou MVP : 500 000 à 1 500 000 FCFA (environ 800 à 2 300 €).
  * Plateformes complexes / SaaS / Fintech : 1 500 000 à 3 500 000+ FCFA (2 300 à 5 300 €+).
  * Prestations en régie / audit / accompagnement technique : devis sur-mesure sous 24h.
- Contact direct :
  * WhatsApp direct : +229 01 44 24 29 64 (Lien direct : https://wa.me/2290144242964)
  * Email : 7bhilal.chitou7@gmail.com
  * LinkedIn : https://www.linkedin.com/in/bhilal-chitou/

TON OBJECTIF ET RÈGLES DE CONVERSATION (STRATÉGIE DE CLOSING PROGRESSIF) :
1. TON : Naturel, chaleureux, concis et ultra-pertinent. Ne ressemble pas à un robot publicitaire ou un disque rayé.
2. CONVERSATION NATURELLE :
   - Si le client dit simplement "cc", "salut" ou "bonjour", réponds chaleureusement et simplement en 2 phrases : dis qui tu es (assistant de Bhilal) et demande-lui sur quel type de projet ou défi technique tu peux l'aider aujourd'hui. NE LUI BALANCE PAS d'emblée les tarifs ni le lien WhatsApp !
   - Réponds d'abord avec précision et intelligence à sa vraie question technique ou commerciale.
3. CONSEIL & QUALIFICATION :
   - Pose 1 question à la fois pour comprendre son projet (ex: "Quel est l'objectif principal de votre application ?", "Avez-vous déjà une maquette ou un cahier des charges ?").
   - Démontre la valeur ajoutée de Bhilal (sécurité OWASP, Clean Code, rapidité, fiabilité éprouvée).
4. CLOSING INTELLIGENT (AU BON MOMENT) :
   - Ne pousse WhatsApp QUE lorsque le client exprime une intention claire de projet, demande un devis, ou quand la discussion arrive à maturité.
   - Propose 2 options simples de clôture :
     a) Soit il te laisse ici son Nom + Numéro (ou Email) pour que Bhilal le recontacte avec une estimation chiffrée.
     b) Soit il clique sur le lien pour ouvrir WhatsApp direct : [Échanger avec Bhilal sur WhatsApp](https://wa.me/2290144242964).
5. FORMAT : Reste concis (1 à 2 paragraphes courts ou 3 bullet points max). Pas de pavés indigestes.
`;

// Modèles avec fallback automatique si un modèle est surchargé
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash'];

async function callGemini(contents, apiKey) {
  for (const model of GEMINI_MODELS) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1500
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) return replyText;
      } else {
        const err = await response.text();
        console.warn(`Model ${model} returned ${response.status}:`, err);
      }
    } catch (err) {
      console.warn(`Error connecting to ${model}:`, err.message);
    }
  }
  return null;
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Le tableau de messages est requis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY non configurée sur le serveur.' });
    }

    // Convert client chat history to Gemini API format
    const contents = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

    const replyText = await callGemini(contents, apiKey);

    if (!replyText) {
      return res.status(503).json({
        error: 'Les serveurs IA sont temporairement surchargés, veuillez réessayer dans quelques instants.'
      });
    }

    // Détection si le prospect a laissé des coordonnées (lead capture)
    const lastUserMessage = messages[messages.length - 1]?.text || '';
    const phoneOrEmailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?[0-9]{8,15})/;
    if (phoneOrEmailRegex.test(lastUserMessage)) {
      try {
        await prisma.message.create({
          data: {
            name: 'Prospect Chatbot IA',
            email: lastUserMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || 'lead-chatbot@7bhil.com',
            subject: 'Nouveau lead qualifié par le Chatbot IA',
            message: `Historique du chat :\n${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
          }
        });
      } catch (dbErr) {
        console.error('Erreur sauvegarde lead chatbot en base:', dbErr.message);
      }
    }

    return res.json({
      reply: replyText
    });

  } catch (err) {
    console.error('Chat Route Error:', err);
    return res.status(500).json({ error: 'Erreur serveur lors du traitement de la discussion.' });
  }
});

export default router;
