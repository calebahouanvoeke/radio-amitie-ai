const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveFfmpegPath() {
  // 1. Cherche ffmpeg dans le PATH système (souvent présent sur Render)
  try {
    const p = execSync('which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null')
      .toString().trim();
    if (p) { console.log(`🎬 ffmpeg système trouvé : ${p}`); return p; }
  } catch (_) {}

  // 2. Chemins connus sur les serveurs Linux
  const knownPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/bin/ffmpeg',
  ];
  for (const p of knownPaths) {
    if (fs.existsSync(p)) { console.log(`🎬 ffmpeg trouvé : ${p}`); return p; }
  }

  // 3. Fallback ffmpeg-static (local Windows)
  console.log(`🎬 ffmpeg-static : ${ffmpegStatic}`);
  return ffmpegStatic;
}

ffmpeg.setFfmpegPath(resolveFfmpegPath());

const LIMITE_BYTES = 25 * 1024 * 1024;

async function compresserSiNecessaire(filePath) {
  const stats = fs.statSync(filePath);

  if (stats.size <= LIMITE_BYTES) {
    return { chemin: filePath, compresse: false };
  }

  const sizeMo = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`⚙️  Fichier ${sizeMo} Mo > 25 Mo — compression en cours...`);

  const sortie = path.join(path.dirname(filePath), `compressed_${Date.now()}.mp3`);
  await compresser(filePath, sortie, 64);

  // Si toujours trop lourd, 2ème passe à 32 kbps
  if (fs.statSync(sortie).size > LIMITE_BYTES) {
    console.log(`⚙️  Encore trop lourd, 2ème passe en 32 kbps...`);
    const sortie2 = path.join(path.dirname(filePath), `compressed2_${Date.now()}.mp3`);
    await compresser(filePath, sortie2, 32);
    fs.unlinkSync(sortie);
    console.log(`✅ 2ème passe : ${(fs.statSync(sortie2).size / 1024 / 1024).toFixed(1)} Mo`);
    return { chemin: sortie2, compresse: true };
  }

  console.log(`✅ Compression : ${sizeMo} Mo → ${(fs.statSync(sortie).size / 1024 / 1024).toFixed(1)} Mo`);
  return { chemin: sortie, compresse: true };
}

function compresser(entree, sortie, bitrate) {
  return new Promise((resolve, reject) => {
    ffmpeg(entree)
      .outputOptions('-threads', '0')
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate(bitrate)
      .format('mp3')
      .on('end', () => resolve(sortie))
      .on('error', (err) => reject(new Error(`Compression échouée : ${err.message}`)))
      .save(sortie);
  });
}

module.exports = { compresserSiNecessaire };