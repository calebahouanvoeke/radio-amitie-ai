const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { compresserSiNecessaire } = require('./audioCompressor'); // ← nouveau

async function transcribeAudio(filePath) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquante dans .env');

  // Compression automatique si > 25 Mo
  const { chemin, compresse } = await compresserSiNecessaire(filePath);

  const stats = fs.statSync(chemin);
  const sizeMo = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`🎙️  Transcription Groq Whisper: ${path.basename(filePath)} (${sizeMo} Mo${compresse ? ' — compressé' : ''})`);

  const form = new FormData();
  form.append('file', fs.createReadStream(chemin), {
    filename: path.basename(chemin),
    contentType: 'audio/mpeg',
  });
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'fr');
  form.append('response_format', 'json');

  let data;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
      timeout: 300000,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (body.includes('<!DOCTYPE')) {
        throw new Error('Erreur réseau temporaire. Réessayez dans quelques secondes.');
      }
      throw new Error(`Groq erreur ${res.status}: ${body.slice(0, 200)}`);
    }

    data = await res.json();
  } finally {
    // Nettoyage du fichier compressé temporaire dans tous les cas
    if (compresse && fs.existsSync(chemin)) {
      fs.unlinkSync(chemin);
      console.log(`🗑️  Fichier compressé temporaire supprimé`);
    }
  }

  if (data?.text) {
    console.log(`✅ Transcription réussie (${data.text.length} caractères)`);
    return { text: data.text };
  }

  throw new Error('Format de réponse inattendu de Groq');
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.mp4': 'video/mp4',
    '.webm': 'audio/webm',
  };
  return types[ext] || 'audio/mpeg';
}

module.exports = { transcribeAudio };