import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOUD_NAME = 'digrefyfa';
const UPLOAD_PRESET = 'portfolio';

const CLIENT_PUBLIC_DIR = path.resolve(__dirname, '../../client/public');
const SERVER_URL = 'http://localhost:5005/api';

// Images principales des projets et du profil à uploader
const IMAGES_TO_MIGRATE = [
  { localPath: 'pro.webp', folder: 'portfolio/profile' },
  { localPath: 'images/language.webp', folder: 'portfolio/projects' },
  { localPath: 'images/vitch.webp', folder: 'portfolio/projects' },
  { localPath: 'images/cours.webp', folder: 'portfolio/projects' },
  { localPath: 'images/arrondissement.webp', folder: 'portfolio/projects' },
  { localPath: 'images/challenge.webp', folder: 'portfolio/projects' },
  { localPath: 'images/resto.webp', folder: 'portfolio/projects' },
  { localPath: 'images/Busola.png', folder: 'portfolio/projects' },
  { localPath: 'images/btop.png', folder: 'portfolio/projects' },
  { localPath: 'images/OMNISINT.png', folder: 'portfolio/projects' },
  { localPath: 'images/mpb.png', folder: 'portfolio/projects' }
];

async function uploadFileToCloudinary(filePath, folder) {
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const dataUri = `data:${mime};base64,${base64Data}`;

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Erreur Cloudinary ${res.status}`);
  }

  // Renvoie l'URL optimisée CDN
  return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

async function main() {
  console.log('🚀 Démarrage de la migration des images locales vers Cloudinary...');
  const urlMapping = {};

  for (const item of IMAGES_TO_MIGRATE) {
    const fullPath = path.join(CLIENT_PUBLIC_DIR, item.localPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Fichier introuvable : ${fullPath}`);
      continue;
    }

    try {
      console.log(`📤 Téléversement de ${item.localPath}...`);
      const cdnUrl = await uploadFileToCloudinary(fullPath, item.folder);
      urlMapping[`/${item.localPath}`] = cdnUrl;
      console.log(`✅ Succès -> ${cdnUrl}`);
    } catch (err) {
      console.error(`❌ Échec pour ${item.localPath} :`, err.message);
    }
  }

  console.log('\n📊 Résumé des correspondances :');
  console.log(JSON.stringify(urlMapping, null, 2));

  // Mise à jour des projets en base
  console.log('\n🔄 Mise à jour des projets en base Neon via API...');
  try {
    const projectsRes = await fetch(`${SERVER_URL}/projects`);
    const projects = await projectsRes.json();

    for (const proj of projects) {
      if (proj.image && urlMapping[proj.image]) {
        const newUrl = urlMapping[proj.image];
        console.log(`Mise à jour du projet "${proj.titleFr}" : ${proj.image} -> ${newUrl}`);
        
        // Appel PUT vers l'API interne ou Prisma direct
        const { default: prisma } = await import('../src/lib/prisma.js');
        await prisma.project.update({
          where: { id: proj.id },
          data: { image: newUrl }
        });
        console.log(`✅ Mis à jour en base pour "${proj.titleFr}" !`);
      }
    }
  } catch (dbErr) {
    console.warn('Note sur la mise à jour directe en base:', dbErr.message);
  }

  // Enregistrer la table de correspondance dans un fichier json
  const mappingPath = path.resolve(__dirname, '../../client/src/data/cloudinary-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(urlMapping, null, 2));
  console.log(`\n💾 Table de correspondance sauvegardée dans ${mappingPath}`);
  console.log('🎉 Migration Cloudinary terminée !');
}

main().catch(console.error);
