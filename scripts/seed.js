import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed script started for Neon PostgreSQL...');

  // 1. Create or Update Admin Account
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@7bhil.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@7Bhil2026!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      name: 'Bhilal CHITOU'
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Bhilal CHITOU',
      role: 'ADMIN'
    }
  });

  console.log(`✅ Admin account created/updated: ${admin.email}`);

  // 2. Seed Projects
  const projectsData = [
    {
      slug: 'bhilal-language',
      titleFr: 'Bhilal Language v1.2.0',
      titleEn: 'Bhilal Language v1.2.0',
      descFr: 'Langage bilingue français/anglais transpilant vers JavaScript.',
      descEn: 'Bilingual French/English programming language transpiling to JavaScript.',
      problemFr: 'Les développeurs francophones avaient besoin d\'un langage qu\'ils puissent apprendre localement tout en gardant une base JavaScript exploitable.',
      problemEn: 'French-speaking developers needed a language they could learn locally and still use with a practical JavaScript runtime.',
      decisionFr: 'J\'ai construit un langage bilingue avec POO, REPL interactif et outils natifs de sécurité réseau.',
      decisionEn: 'Built a bilingual language with OOP support, an interactive REPL and native network security tools.',
      impactFr: 'Le projet est devenu plus facile à adopter et plus crédible comme outil développeur.',
      impactEn: 'Lowered the barrier to experimentation and positioned the project as a serious developer tool.',
      solvedFr: 'Un manque d\'outillage local qui freinait l\'apprentissage et le prototypage.',
      solvedEn: 'A local tooling gap that slowed onboarding and early prototyping.',
      category: 'tool',
      githubUrl: 'https://github.com/7Bhil/bhilal-language',
      featured: true,
      image: '/images/language.webp',
      order: 1
    },
    {
      slug: 'vitch',
      titleFr: 'Vitch (Démo Fintech)',
      titleEn: 'Vitch (Fintech Demo)',
      descFr: 'Portefeuille électronique sécurisé avec émission de cartes virtuelles et gestion des transactions.',
      descEn: 'Secure electronic wallet with virtual card issuance and transaction management.',
      problemFr: 'Les paiements digitaux avaient besoin d\'une expérience portefeuille simple et rassurante dès la première interaction.',
      problemEn: 'Digital payments needed a wallet experience that felt secure and simple from the first interaction.',
      decisionFr: 'J\'ai construit une démo fintech autour de parcours de paiement sécurisés, d\'actions portefeuille et de cartes virtuelles.',
      decisionEn: 'Built a fintech demo around secure payment flows, wallet actions and virtual card issuance.',
      impactFr: 'L\'interface fintech devient démonstrative et crédible pour valider la direction produit.',
      impactEn: 'Demonstrated a scalable fintech interface and validated the product direction.',
      solvedFr: 'Aucun parcours clair pour les paiements virtuels et la gestion des cartes.',
      solvedEn: 'No clear wallet flow for virtual payments and card management.',
      category: 'fintech',
      featured: true,
      image: '/images/vitch.webp',
      order: 2
    },
    {
      slug: 'bhil-cours',
      titleFr: 'Bhil Cours',
      titleEn: 'Bhil Cours',
      descFr: 'Une plateforme d\'apprentissage pour pratiquer le code avec progression guidée.',
      descEn: 'A learning platform for programming practice and guided exercises.',
      problemFr: 'Les apprenants avaient besoin d\'un espace pratique pour s\'entraîner sur plusieurs langages sans naviguer entre des ressources dispersées.',
      problemEn: 'Learners needed a practical place to train across several languages without jumping between disconnected resources.',
      decisionFr: 'J\'ai construit une plateforme React et Django avec cours, exercices et progression structurée.',
      decisionEn: 'Built a structured React and Django platform for lessons, exercises and progression tracking.',
      impactFr: 'La pratique est devenue plus régulière et plus simple à suivre pour les étudiants.',
      impactEn: 'Made practice more repeatable and easier to consume for students.',
      solvedFr: 'Une pratique du code fragmentée pour les débutants.',
      solvedEn: 'Fragmented programming practice for beginners.',
      category: 'web',
      featured: true,
      image: '/images/cours.webp',
      order: 3
    },
    {
      slug: 'bloc-republicain',
      titleFr: 'Bloc Républicain - Arrondissement',
      titleEn: 'Bloc Républicain - Arrondissement',
      descFr: 'Application web institutionnelle pour une audience nationale.',
      descEn: 'Institutional web application for a national audience.',
      problemFr: 'Une organisation publique avait besoin d\'un canal digital plus clair pour communiquer et gérer ses initiatives.',
      problemEn: 'A public-facing organization needed a clearer digital channel to communicate and manage initiatives.',
      decisionFr: 'J\'ai conçu une application institutionnelle centrée sur la clarté des messages et la gestion des initiatives.',
      decisionEn: 'Designed an institutional web application around communication clarity and initiative management.',
      impactFr: 'Les informations sont centralisées et plus faciles à présenter à un large public.',
      impactEn: 'Centralized updates and made key information easier to present to a broad audience.',
      solvedFr: 'Une communication éparpillée autour des initiatives locales.',
      solvedEn: 'Scattered communication around local initiatives.',
      category: 'web',
      featured: true,
      image: '/images/arrondissement.webp',
      order: 4
    },
    {
      slug: 'challenge-platform',
      titleFr: 'Plateforme de Challenges',
      titleEn: 'Challenge Platform',
      descFr: 'Une plateforme interactive pour des challenges et un classement temps réel.',
      descEn: 'An interactive platform for coding challenges and real-time ranking.',
      problemFr: 'Les organisateurs de challenges avaient besoin d\'un moyen clair pour collecter les soumissions et classer les participants de façon transparente.',
      problemEn: 'Challenge organizers needed a clear way to collect submissions and rank participants transparently.',
      decisionFr: 'J\'ai développé une plateforme MERN avec notation par jury et classement live.',
      decisionEn: 'Built a MERN platform with jury grading and a live leaderboard.',
      impactFr: 'Le suivi manuel a été réduit et les résultats sont devenus plus crédibles.',
      impactEn: 'Reduced manual tracking and made results more credible.',
      solvedFr: 'Une évaluation manuelle et des classements flous pendant les compétitions.',
      solvedEn: 'Manual evaluation and unclear rankings during competitions.',
      category: 'web',
      featured: true,
      image: '/images/challenge.webp',
      order: 5
    },
    {
      slug: 'resto-premium',
      titleFr: 'Interface Restaurant Premium',
      titleEn: 'Premium Restaurant Frontend',
      descFr: 'Un frontend restaurant moderne développé avec React et soigné visuellement.',
      descEn: 'A modern restaurant frontend built with React and premium UI polish.',
      problemFr: 'Le restaurant avait besoin d\'une vitrine digitale premium, efficace sur mobile.',
      problemEn: 'The restaurant needed a digital storefront that felt premium and worked well on mobile.',
      decisionFr: 'J\'ai construit un frontend React avec menu responsive et rythme visuel soigné.',
      decisionEn: 'Built a React frontend with a responsive menu and polished visual rhythm.',
      impactFr: 'L\'image de marque est mieux perçue et la navigation mobile est plus fluide.',
      impactEn: 'Improved brand perception and made discovery easier on small screens.',
      solvedFr: 'Une première impression trop faible par rapport à la valeur de la marque.',
      solvedEn: 'A weak first impression that did not match the brand value.',
      category: 'web',
      featured: true,
      image: '/images/resto.webp',
      order: 6
    }
  ];

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: p,
      create: p
    });
  }
  console.log(`✅ ${projectsData.length} projects seeded.`);

  // 3. Seed Skills
  const skillsData = [
    { name: 'React & React Native', category: 'frontend', level: 95, order: 1 },
    { name: 'TypeScript & JavaScript', category: 'frontend', level: 92, order: 2 },
    { name: 'Astro & Next.js', category: 'frontend', level: 90, order: 3 },
    { name: 'Tailwind CSS', category: 'frontend', level: 95, order: 4 },
    { name: 'Node.js & Express', category: 'backend', level: 92, order: 5 },
    { name: 'Django (Python)', category: 'backend', level: 88, order: 6 },
    { name: 'Laravel (PHP)', category: 'backend', level: 85, order: 7 },
    { name: 'PostgreSQL & MongoDB', category: 'backend', level: 90, order: 8 },
    { name: 'Mobile Money Integration (MTN/Moov)', category: 'fintech', level: 95, order: 9 },
    { name: 'Security Architecture & OWASP', category: 'tools_security', level: 90, order: 10 },
    { name: 'Git & Docker', category: 'tools_security', level: 88, order: 11 }
  ];

  for (const s of skillsData) {
    const existing = await prisma.skill.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.skill.update({ where: { id: existing.id }, data: s });
    } else {
      await prisma.skill.create({ data: s });
    }
  }
  console.log(`✅ ${skillsData.length} skills seeded.`);

  // 4. Seed Experiences & Education
  const expData = [
    {
      type: 'experience',
      roleFr: 'Développeur Full-Stack & Mobile (Freelance)',
      roleEn: 'Full-Stack & Mobile Developer (Freelance)',
      companyFr: 'Remote · Clients divers',
      companyEn: 'Remote · Various Clients',
      descFr: 'Conception et livraison d\'applications web et mobile complètes. Gestion autonome du cycle complet : architecture, développement, déploiement.',
      descEn: 'Design and delivery of complete web and mobile applications. Autonomous management of the full cycle: architecture, development, deployment.',
      dateFr: '',
      dateEn: '',
      order: 1
    },
    {
      type: 'experience',
      roleFr: 'Licence en Informatique',
      roleEn: 'Bachelor\'s Degree in Computer Science',
      companyFr: 'IUT de Parakou, Bénin',
      companyEn: 'IUT of Parakou, Benin',
      descFr: 'Spécialisation développement logiciel, réseaux et cybersécurité.',
      descEn: 'Specialization in software development, networks and cybersecurity.',
      dateFr: '',
      dateEn: '',
      order: 2
    },
    {
      type: 'education',
      roleFr: 'Licence en Informatique',
      roleEn: 'Bachelor\'s Degree in Computer Science',
      companyFr: 'Institut Universitaire de Technologie de Parakou, Benin',
      companyEn: 'University of Parakou',
      dateFr: '',
      dateEn: '',
      order: 3
    }
  ];

  for (const e of expData) {
    const existing = await prisma.experience.findFirst({ where: { roleFr: e.roleFr, type: e.type } });
    if (existing) {
      await prisma.experience.update({ where: { id: existing.id }, data: e });
    } else {
      await prisma.experience.create({ data: e });
    }
  }
  console.log(`✅ ${expData.length} experiences & educations seeded.`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
