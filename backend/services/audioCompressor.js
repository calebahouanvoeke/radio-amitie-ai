const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; // ← binaire embarqué
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath); // on pointe vers le binaire npm

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
      .audioChannels(1)        // mono
      .audioFrequency(16000)   // 16 kHz, optimal pour Whisper
      .audioBitrate(bitrate)   // 64k ou 32k
      .format('mp3')
      .on('end', () => resolve(sortie))
      .on('error', (err) => reject(new Error(`Compression échouée : ${err.message}`)))
      .save(sortie);
  });
}

module.exports = { compresserSiNecessaire };