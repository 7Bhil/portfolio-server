import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

/**
 * Prompt système ultra-élaboré pour le Conseiller Technique & Commercial de Bhilal CHITOU.
 * Capable de répondre avec expertise technique, architecture logicielle, vision business,
 * méthodologie projet, sécurité OWASP, et closing orienté valeur.
 */
const SYSTEM_INSTRUCTION = `
Tu es le Conseiller Technique Principal et Directeur Technique Virtuel de Bhilal CHITOU (7Bhil).
Tu t'adresses à des clients exigeants : fondateurs de startups, CTO, directeurs de projets digitaux, chefs d'entreprises et recruteurs techniques.

=======================================================
IDENTITÉ & EXPERTISE DE BHILAL CHITOU (7BHIL)
=======================================================
- Titre : Ingénieur Logiciel Full-Stack Senior, Développeur Mobile & Architecte Sécurité.
- Localisation : Cotonou, Bénin (disponible en remote international & déplacements).
- Contact direct :
  * WhatsApp direct : +229 01 44 24 29 64 (Lien : [Discuter avec Bhilal sur WhatsApp](https://wa.me/2290144242964))
  * Email : 7bhilal.chitou7@gmail.com
  * GitHub : https://github.com/7Bhil
  * LinkedIn : https://www.linkedin.com/in/7bhil/

STACK TECHNIQUE MAÎTRISÉE EN PRODUCTION :
1. Frontend & Web Moderne :
   - TypeScript, React 18/19, Next.js (App Router, SSR, SSG, ISR), Astro 4 (Static & Islands Architecture ultra-légère).
   - Tailwind CSS, Framer Motion / Motion One, GSAP, Radix UI, Shadcn.
   - Core Web Vitals : Scores Lighthouse > 95/100, SEO technique, accessibilité WCAG AA.
2. Backend & Architectures Distribuées :
   - Node.js (Express, Fastify), NestJS (Clean Architecture, DDD, CQRS).
   - Python (Django, FastAPI, scripts de data scraping & opportunity engine).
   - PHP (Laravel 10/11 pour plateformes d'entreprise et API RESTful).
   - Microservices, Event-driven (RabbitMQ / Redis Streams), WebSockets, Webhooks fiables avec idempotent retry.
3. Mobile Natif & Cross-Platform :
   - React Native & Expo (iOS / Android).
   - Architecture Offline-first (WatermelonDB / MMKV / SQLite), synchronisation temps réel, Push Notifications Firebase/APNs.
4. Bases de données & Haute Disponibilité :
   - PostgreSQL (Neon Serverless, Supabase, poolers PgBouncer), MySQL.
   - MongoDB, Redis (Cache L1/L2, rate limiting distribué, sessions).
   - Prisma ORM, Drizzle, migrations zero-downtime, indexation B-Tree/GIN optimisée.
5. Sécurité (Security by Design) :
   - Normes OWASP Top 10 strictes : sanitization anti-XSS/SQLi, protection CSRF, tokens JWT signés (RS256/Ed25519) avec rotation de refresh tokens sécurisés HttpOnly SameSite=Strict.
   - Chiffrement au repos (AES-256-GCM) et en transit (TLS 1.3, HSTS).
   - Rate limiting adaptatif, contrôle d'accès basé sur les rôles (RBAC/ABAC).
6. Cloud, DevOps & Déploiement :
   - Docker, Docker Compose, Linux VPS (Ubuntu/Debian durcis), Vercel, Render, AWS (S3, CloudFront, EC2).
   - Pipelines CI/CD automatisés (GitHub Actions, tests automatisés Playwright/Jest, linters).
7. Réalisations Notables :
   - **Bhilal Language (v1.2.0)** : Compilateur complet conçu et développé par Bhilal. Analyse lexicale, parsing avec génération d'AST (Abstract Syntax Tree), transcompilation vers JavaScript, REPL interactif, syntaxe bilingue FR/EN et outils de diagnostic réseau intégrés. Preuve d'une compréhension intime des langages et de la gestion mémoire.
   - **Vitch** : Plateforme Fintech de portefeuille digital, émission de cartes virtuelles sécurisées, intégration multi-devises et passerelles de paiement.
   - **GoReparr** : Système de gestion et de mise en relation pour réparation technique avec dashboards en temps réel.
   - **Bhil Cours** : Plateforme EdTech interactive pour l'apprentissage du code.

TARIFS & MODALITÉS DE COLLABORATION :
- Projets forfaitaires délimités / MVP : 500 000 à 1 500 000 FCFA (~800 à 2 300 €) — Livraison en 2 à 4 semaines.
- Systèmes complexes / Plateformes SaaS / Fintech multi-tiers : 1 500 000 à 4 000 000+ FCFA (~2 300 à 6 000 €+).
- Régie / Accompagnement technique / Sprint dédié : Devis sur-mesure sous 24h.
- Chaque contrat comprend : **30 jours de garantie & support technique post-livraison offerts**, documentation technique complète et transfert de compétences.

=======================================================
DIRECTIVES DE RÉPONSE ET FORMATAGE
=======================================================
1. STYLE ET POSTURE :
   - Tu n'es pas un simple répondeur automatique. Tu es un Architecte Technique Senior et Conseiller Stratégique.
   - Tes réponses doivent être **élaborées, approfondies, perspicaces, structurées et pédagogiques**.
   - Quand l'utilisateur pose une question technique (choix d'architecture, base de données, sécurité, mobile vs web, coût, scalabilité), décompose ta réponse avec méthode :
     * Analyse du contexte et enjeux
     * Recommandation technique concrète et justifiée (avec avantages / compromis)
     * Schéma ou plan d'action étape par étape
     * Estimation de complexité / délais typiques
     * Comment Bhilal peut intervenir spécifiquement sur ce point
2. FORMATAGE MARKDOWN SOIGNÉ :
   - Utilise des titres clairs (\`### Titre\`), des listes à puces (\`- Item\`), du texte en gras (\`**terme clé**\`) et des blocs de code (\`\`\`langage ... \`\`\`) si pertinent.
   - Intègre des liens cliquables pour contacter Bhilal dès que le contexte s'y prête, en particulier : [Discuter avec Bhilal sur WhatsApp](https://wa.me/2290144242964).
3. GESTION DES SALUTATIONS INITIALES :
   - Si le message utilisateur est juste un salut informel ("salut", "bonjour", "hello"), réponds avec élégance, présente brièvement le périmètre d'intervention (Web haute performance, Mobile, Fintech, Compilateurs, Sécurité) et pose 1 ou 2 questions orientées pour cerner le besoin de son projet.
4. GESTION DU RECRUTEMENT OU FREELANCE :
   - Si un recruteur ou un client demande sa disponibilité, confirme la disponibilité immédiate de Bhilal pour des missions freelance, contrats au forfait ou postes clés en remote.
5. LANGUE :
   - Réponds dans la langue utilisée par l'utilisateur (Français ou Anglais).
`;

// Configuration des modèles et providers avec cascade intelligente
const OPENROUTER_MODELS = [
  'deepseek/deepseek-chat',
  'google/gemini-2.0-flash-001',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.3-70b-instruct',
  'mistralai/mistral-small-3',
  'openrouter/free'
];

const GEMINI_DIRECT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

/**
 * Appel à l'API OpenRouter (OpenAI-compatible)
 */
async function callOpenRouter(messages, apiKey) {
  const formattedMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...messages.map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: m.text || m.content || ''
    }))
  ];

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://7bhil.vercel.app',
          'X-Title': '7Bhil Portfolio & AI Consultant'
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages,
          temperature: 0.6,
          max_tokens: 1500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return { content, provider: `OpenRouter (${model})` };
        }
      } else {
        const errText = await response.text();
        console.warn(`[OpenRouter] Model ${model} returned HTTP ${response.status}:`, errText.slice(0, 150));
      }
    } catch (err) {
      console.warn(`[OpenRouter] Connection error for ${model}:`, err.message);
    }
  }
  return null;
}

/**
 * Fallback direct vers Google Gemini si configuré
 */
async function callGeminiDirect(messages, apiKey) {
  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'model')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.content || '' }]
    }));

  for (const model of GEMINI_DIRECT_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2048
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return { content: text, provider: `Gemini Direct (${model})` };
        }
      }
    } catch (err) {
      console.warn(`[Gemini Direct] Error with ${model}:`, err.message);
    }
  }
  return null;
}

/**
 * Générateur local de réponses ultra-élaborées (Fallback intelligent)
 * Assure qu'en toute circonstance, même sans internet ou sans quota API,
 * le client reçoit des analyses techniques de niveau DSI / CTO.
 */
function generateRichLocalFallback(lastMessage, lang = 'fr') {
  const q = (lastMessage || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isEn = lang === 'en';

  if (q.includes("whatsapp") || q.includes("telephone") || q.includes("phone") || q.includes("call") || q.includes("appel") || q.includes("joindre direct")) {
    return isEn
      ? `### Direct Access to Bhilal CHITOU

For immediate technical discussions or urgent scoping sessions:
- **WhatsApp Direct (Fastest):** [+229 01 44 24 29 64](https://wa.me/2290144242964?text=Hello%20Bhilal%2C%20I%20would%20like%20to%20discuss%20a%20project.)
- **Response SLA:** Typically within 1 to 2 hours.
- **Direct Email:** \`7bhilal.chitou7@gmail.com\`
- **LinkedIn:** [linkedin.com/in/7bhil](https://www.linkedin.com/in/7bhil/)

Would you like to schedule a 20-minute architecture review call today?`
      : `### Accès Direct à Bhilal CHITOU

Pour échanger immédiatement sur votre feuille de route ou valider une faisabilité technique :
- **WhatsApp direct (Canal prioritaire) :** [+229 01 44 24 29 64](https://wa.me/2290144242964?text=Bonjour%20Bhilal%2C%20je%20souhaite%20%C3%A9changer%20sur%20mon%20projet.)
- **Délai de réponse :** Garanti sous 1 à 2 heures.
- **Email professionnel :** \`7bhilal.chitou7@gmail.com\`
- **LinkedIn :** [linkedin.com/in/7bhil](https://www.linkedin.com/in/7bhil/)

Souhaitez-vous caler un appel de cadrage de 20 minutes dès aujourd'hui ?`;
  }

  if (q.includes("tarif") || q.includes("prix") || q.includes("combien") || q.includes("cout") || q.includes("pricing") || q.includes("price") || q.includes("budget") || q.includes("devis")) {
    return isEn
      ? `### Transparent Pricing & Engagement Framework

Bhilal CHITOU works under clearly structured frameworks designed to eliminate scope creep and protect your ROI:

1. **Fixed-Price Milestone Delivery (Defined MVPs / Features)**
   - **Range:** 500,000 to 1,500,000 FCFA (approx. 800 € to 2,300 €).
   - **Timeline:** 2 to 4 weeks.
   - **Includes:** Specification validation, UX/UI implementation, clean backend API, PostgreSQL database, deployment on cloud infrastructure, and **30 days of free post-launch warranty**.

2. **Complex Systems & Fintech Platforms (SaaS, Mobile, Custom APIs)**
   - **Range:** 1,500,000 to 4,000,000+ FCFA (approx. 2,300 € to 6,000 €+).
   - **Timeline:** 4 to 8 weeks in iterative 2-week sprints.
   - **Includes:** Multi-tenant architecture, OWASP compliance, payment integrations (Mobile Money, Stripe), automated testing and monitoring.

3. **Sprint Capacity / Technical Retainer**
   - Ideal for ongoing product development, refactoring, or security audits.
   - Customized proposal issued within 24 hours.

👉 **Next Step:** You can obtain a tailored specification and budget assessment directly on [WhatsApp with Bhilal](https://wa.me/2290144242964?text=Hello%20Bhilal%2C%20I%20would%20like%20a%20quote%20for%20my%20project.).`
      : `### Grille Tarifaire & Modalités d'Intervention

Bhilal CHITOU propose des modèles d'engagement clairs et transparents, pensés pour éliminer tout risque financier et garantir votre retour sur investissement :

1. **Forfait par Jalons Délimités (MVP & Solutions Ciblées)**
   - **Enveloppe indicative :** 500 000 à 1 500 000 FCFA (~800 € à 2 300 €).
   - **Délais moyens :** 2 à 4 semaines.
   - **Inclus :** Cadrage technique, interface moderne et responsive, API backend typée, base PostgreSQL optimisée, déploiement cloud sécurisé, et **30 jours de garantie & maintenance corrective offerts**.

2. **Plateformes d'Envergure & Fintech (SaaS, Apps Mobiles, APIs Métier)**
   - **Enveloppe indicative :** 1 500 000 à 4 000 000+ FCFA (~2 300 € à 6 000 €+).
   - **Délais moyens :** 4 à 8 semaines réparties en sprints bimensuels démo-driven.
   - **Inclus :** Architecture multi-tiers sécurisée, intégrations Mobile Money / Cartes bancaires, haute résilience et tests automatisés.

3. **Régie / Sprint Dédié / Audit de Sécurité**
   - Idéal pour les refontes complexes, renforts d'équipe ou audits d'architecture.
   - Devis chiffré transmis sous 24h.

👉 **Prochaine étape :** Pour recevoir une estimation détaillée sous 24h, transmettez vos grandes lignes à [Bhilal sur WhatsApp](https://wa.me/2290144242964?text=Bonjour%20Bhilal%2C%20je%20souhaite%20une%20estimation%20chiffr%C3%A9e%20pour%20mon%20projet.).`;
  }

  if (q.includes("stack") || q.includes("techno") || q.includes("react") || q.includes("nest") || q.includes("django") || q.includes("python") || q.includes("node") || q.includes("mobile") || q.includes("tech")) {
    return isEn
      ? `### Production Technology Stack & Architectural Standards

Bhilal selects robust, battle-tested technologies optimized for speed, maintainability, and enterprise-grade security:

- **Web Frontend:** TypeScript, React, Next.js (App Router, Server Components), Astro (ultra-fast content-driven pages), Tailwind CSS, Framer Motion.
- **Backend Services:** Node.js (Express, NestJS with Clean Architecture/CQRS), Python (Django/FastAPI for algorithmic logic and automation), PHP (Laravel).
- **Mobile Engineering:** React Native & Expo for iOS/Android native performance with robust offline-first synchronization.
- **Data & Persistence:** PostgreSQL (Neon Serverless with PgBouncer connection pooling), MongoDB, Redis (distributed cache and rate limiting).
- **Security & Cloud:** Docker, Linux Ubuntu VPS, Vercel, Render, CI/CD pipelines via GitHub Actions, strict OWASP mitigation protocols.

Each layer is decoupled to ensure your platform scales seamlessly from 1,000 to 500,000+ active users without structural rewrites.`
      : `### Socle Technologique & Standards d'Architecture en Production

Bhilal privilégie des technologies industrielles éprouvées, sélectionnées pour leur rapidité d'exécution, leur maintenabilité et leur résilience :

- **Frontend Web Moderne :** TypeScript, React, Next.js (App Router, Server Components), Astro (architecture par îles ultra-performante), Tailwind CSS, Framer Motion.
- **Services Backend & APIs :** Node.js (Express, NestJS avec Clean Architecture & CQRS), Python (Django / FastAPI pour la logique algorithmique et moteurs d'opportunités), PHP (Laravel).
- **Ingénierie Mobile :** React Native & Expo pour délivrer des applications natives iOS et Android fluides avec synchronisation offline-first.
- **Bases de Données & Données Distribuées :** PostgreSQL (Neon Serverless avec poolers PgBouncer), MongoDB, Redis (cache mémoire haute performance et rate limiting).
- **Sécurité & Infrastructure Cloud :** Docker, VPS Linux durcis, Vercel, Render, pipelines CI/CD automatisés via GitHub Actions, application rigoureuse des normes OWASP Top 10.

L'ensemble de l'architecture est conçu de manière modulaire, garantissant une montée en charge fluide de 1 000 à plus de 500 000 utilisateurs sans refonte technique coûteuse.`;
  }

  if (q.includes("langage") || q.includes("compilateur") || q.includes("compiler") || q.includes("ast") || q.includes("bhilal language")) {
    return isEn
      ? `### The Bhilal Programming Language (v1.2.0)

Developing a full programming language compiler is one of the highest proofs of software engineering mastery. Here is how Bhilal built it:

- **Compilation Pipeline:**
  1. **Lexical Analysis (Lexer):** Tokenization of source streams supporting dual bilingual keywords (French / English).
  2. **Parsing (AST Construction):** Context-free grammar validation generating a rich Abstract Syntax Tree.
  3. **Code Generation & Transpilation:** High-efficiency translation directly to optimized JavaScript bytecode/runtime.
- **Key Capabilities:** Object-Oriented Programming (classes, inheritance, encapsulation), structured exception handling, interactive REPL console, and embedded networking diagnostics.
- **Why this matters for your project:** It demonstrates an intimate understanding of memory management, algorithmic complexity ($O(n)$ analysis), and systems engineering that goes far beyond surface-level web development.`
      : `### Le Compilateur Bhilal Language (v1.2.0)

La conception intégrale d'un langage de programmation et de son compilateur constitue l'une des démonstrations les plus exigeantes en ingénierie logicielle :

- **Pipeline de Compilation :**
  1. **Analyse Lexicale (Lexer) :** Découpage du flux de caractères en tokens sémantiques avec prise en charge bilingue native (mots-clés en Français et en Anglais).
  2. **Analyse Syntaxique (Parser & AST) :** Validation grammaticale et construction d'un Arbre Syntaxique Abstrait (Abstract Syntax Tree) hiérarchique.
  3. **Génération de Code & Transcompilation :** Émission d'un code JavaScript hautement optimisé et exécutable par les moteurs V8 / Node.js.
- **Fonctionnalités Clés :** Programmation Orientée Objet complète, gestion native des exceptions, console REPL interactive, et modules intégrés de diagnostic réseau et sécurité.
- **Pourquoi c'est un atout pour votre projet :** Cela prouve une maîtrise intime du fonctionnement profond des machines, des algorithmes de parsing et de la gestion de mémoire, bien au-delà des simples intégrations d'outils standards.`;
  }

  if (q.includes("delai") || q.includes("temps") || q.includes("process") || q.includes("methode") || q.includes("timeline") || q.includes("workflow")) {
    return isEn
      ? `### Engineering Methodology & Delivery Timeline

Bhilal utilizes a battle-tested 5-stage agile workflow designed for speed and zero unpleasant surprises:

1. **Stage 1: Architecture & Technical Discovery (Day 1 - 3)**
   - Deep-dive requirements gathering, schema modeling, API contract definition, and fixed delivery calendar.
2. **Stage 2: Core Engineering & Sprints (Week 1 - 3)**
   - Fast, incremental sprints with live staging demo environments so you can test real features early.
3. **Stage 3: Security & Quality Assurance (Week 3 - 4)**
   - OWASP vulnerability scanning, integration testing, database index optimization, and latency tuning.
4. **Stage 4: Production Deployment**
   - Zero-downtime deployment, automated backups, and SSL/TLS security hardening.
5. **Stage 5: 30-Day Guaranteed Warranty & Training**
   - Bug-fixing SLA and technical handover documentation included at zero extra cost.

👉 To plan a roadmap for your upcoming launch, [discuss directly with Bhilal on WhatsApp](https://wa.me/2290144242964).`
      : `### Méthodologie Projet & Délais de Livraison

Bhilal applique un cycle de livraison itératif en 5 phases garantissant visibilité totale et rigueur d'exécution :

1. **Phase 1 : Cadrage & Architecture Préparatoire (J1 à J3)**
   - Définition du cahier des charges, modélisation de la base de données, contrats d'API et calendrier de livraison précis.
2. **Phase 2 : Développement Itératif & Sprints (Semaines 1 à 3)**
   - Déploiement continu sur environnement de pré-production (Staging). Vous validez chaque brique concrètement à chaque fin de sprint.
3. **Phase 3 : Audit de Sécurité & Tests de Charge (Semaine 3 à 4)**
   - Analyse de vulnérabilités selon les standards OWASP, tests d'intégration, optimisation des index de base de données.
4. **Phase 4 : Mise en Production & Monitoring**
   - Déploiement cloud haute disponibilité, sauvegardes automatiques, monitoring des erreurs et sécurisation SSL/TLS.
5. **Phase 5 : Garantie 30 Jours & Transfert de Compétences**
   - Support technique réactif offert pendant 30 jours, documentation d'exploitation et formation de votre équipe.

👉 Pour définir le calendrier exact de votre projet, [planifiez un échange direct sur WhatsApp](https://wa.me/2290144242964).`;
  }

  // Fallback général très riche
  return isEn
    ? `### Consulting & Technical Strategy with Bhilal CHITOU

I am ready to help you analyze, architect, and deliver high-impact software solutions:

- **Web SaaS & High-Throughput Platforms:** Next.js, React, NestJS, PostgreSQL, Redis.
- **Native & Cross-Platform Mobile Applications:** React Native & Expo with offline-first support.
- **Fintech & Payment Systems:** Mobile Money (MTN/Moov), Virtual Cards, Secure Transaction Ledger.
- **Architecture, Security & Cloud:** OWASP hardening, Docker containers, zero-downtime deployment.

**Recommended Next Steps:**
1. Detail your functional requirements, target audience, and preferred deadline here.
2. Or connect immediately with Bhilal on **[WhatsApp (+229 01 44 24 29 64)](https://wa.me/2290144242964?text=Hello%20Bhilal%2C%20I%20have%20a%20technical%20project%20to%20discuss.)** for a direct scoping call.`
    : `### Conseil & Stratégie Technique avec Bhilal CHITOU

Je suis à votre disposition pour analyser, concevoir et accélérer le déploiement de vos projets digitaux :

- **Plateformes Web SaaS & Portails Métier :** Next.js, React, NestJS, PostgreSQL, Redis.
- **Applications Mobiles Natives (iOS / Android) :** React Native & Expo avec fonctionnement offline-first.
- **Fintech & Systèmes de Paiement :** Intégration Mobile Money (MTN/Moov), portefeuilles digitaux, cartes virtuelles.
- **Audit d'Architecture & Sécurité :** Durcissement OWASP, conteneurisation Docker, pipelines CI/CD.

**Comment souhaitez-vous avancer ?**
1. Vous pouvez me détailler votre besoin (objectifs, fonctionnalités clés, budget indicatif ou délai visé).
2. Ou échanger de vive voix sans engagement avec Bhilal sur **[WhatsApp (+229 01 44 24 29 64)](https://wa.me/2290144242964?text=Bonjour%20Bhilal%2C%20j%27ai%20un%20projet%20dont%20je%20souhaite%20te%20parler.)** pour un cadrage technique immédiat.`;
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { messages, lang = 'fr' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Le tableau de messages est requis.' });
    }

    const lastUserMessage = messages[messages.length - 1]?.text || '';

    // Détection lead capture (email ou numéro de téléphone dans les messages)
    const phoneOrEmailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?[0-9]{8,15})/;
    if (phoneOrEmailRegex.test(lastUserMessage)) {
      try {
        await prisma.message.create({
          data: {
            name: 'Prospect Chatbot IA',
            email: lastUserMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || 'lead-chatbot@7bhil.vercel.app',
            subject: 'Nouveau lead qualifié par le Chatbot IA',
            message: `Historique du chat :\n${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
          }
        });
      } catch (dbErr) {
        console.error('[Chatbot Lead Capture] Erreur DB:', dbErr.message);
      }
    }

    let responseResult = null;

    // 1. Essai OpenRouter si OPENROUTER_API_KEY ou OPENAI_API_KEY est configurée
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (openRouterKey) {
      responseResult = await callOpenRouter(messages, openRouterKey);
    }

    // 2. Fallback vers Gemini Direct si disponible et si OpenRouter n'a pas répondu
    if (!responseResult && process.env.GEMINI_API_KEY) {
      responseResult = await callGeminiDirect(messages, process.env.GEMINI_API_KEY);
    }

    // 3. Fallback riche local si aucune clé configurée ou APIs externes indisponibles
    if (!responseResult || !responseResult.content) {
      const richReply = generateRichLocalFallback(lastUserMessage, lang);
      return res.json({
        reply: richReply,
        source: 'local_expert_engine'
      });
    }

    return res.json({
      reply: responseResult.content,
      source: responseResult.provider
    });

  } catch (err) {
    console.error('Chat Route Error:', err);
    // Même en cas d'erreur inattendue, renvoyer une réponse experte riche plutôt qu'un 500 frustrant
    const fallbackText = generateRichLocalFallback(req.body?.messages?.slice(-1)?.[0]?.text || '', req.body?.lang || 'fr');
    return res.json({
      reply: fallbackText,
      source: 'resilient_fallback'
    });
  }
});

export default router;
