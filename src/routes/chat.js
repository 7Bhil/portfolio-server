import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

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

TON OBJECTIF ET RÈGLES DE CONVERSATION (CLOSING COMMERCIAL) :
1. TON : Professionnel, chaleureux, rassurant, percutant et axé sur les résultats business (rentabilité, acquisition, sécurité).
2. CONSEIL & ÉCOUTE : Réponds précisément à la question du prospect, valorise l'expertise de Bhilal, et pose 1 question ciblée pour qualifier son besoin.
3. CLOSING ACTIF : Termine toujours par une proposition d'action claire :
   - Propose d'en discuter directement avec Bhilal sur WhatsApp pour cadrer son projet et valider la faisabilité gratuitement.
   - Demande son nom et son numéro WhatsApp / email s'il souhaite un devis sous 24h.
   - Propose le lien cliquable Markdown : [Discuter avec Bhilal sur WhatsApp](https://wa.me/2290144242964)
4. FORMAT : Structure avec des listes à puces claires et concises. Réponds dans la langue du prospect (Français ou Anglais).
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
            maxOutputTokens: 800
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
