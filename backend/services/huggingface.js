const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

/**
 * Transcription audio via Groq Whisper (gratuit, rapide)
 * Limite Groq : 25 Mo par fichier
 */
async function transcribeAudio(filePath) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquante dans .env');

  const stats = fs.statSync(filePath);
  const sizeMo = stats.size / 1024 / 1024;
  console.log(`🎙️  Transcription Groq Whisper: ${path.basename(filePath)} (${sizeMo.toFixed(1)} Mo)`);

  if (sizeMo > 25) {
    throw new Error(`Fichier trop volumineux (${sizeMo.toFixed(1)} Mo). Groq accepte 25 Mo max. Compressez le fichier avant envoi.`);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: getContentType(filePath),
  });
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'fr');
  form.append('response_format', 'json');

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

  const data = await res.json();
  if (data.text) {
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