const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const HF_BASE = 'https://api-inference.huggingface.co/models';

function getHeaders() {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY manquante dans .env');
  return { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, 'Content-Type': 'audio/mpeg' };
}

/**
 * Transcription audio avec Whisper Large v3 (HuggingFace — gratuit)
 */
async function transcribeAudio(filePath) {
  const audioData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
  const contentType = mime[ext] || 'audio/mpeg';

  console.log(`🎙️  Transcription Whisper: ${path.basename(filePath)} (${(audioData.length/1024/1024).toFixed(1)} Mo)`);

  const res = await fetch(`${HF_BASE}/openai/whisper-large-v3`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': contentType },
    body: audioData,
    timeout: 300000,
    size: 0
  });

  if (res.status === 503) {
    const err = await res.json().catch(() => ({}));
    const wait = err.estimated_time || 30;
    throw new Error(`Modèle en cours de démarrage. Réessayez dans ${Math.ceil(wait)}s.`);
  }

  if (!res.ok) throw new Error(`HuggingFace erreur: ${res.status}`);

  const data = await res.json();
  if (data.text) return { text: data.text };
  if (Array.isArray(data)) return { text: data.map(c => c.text || '').join(' ') };
  throw new Error('Format de réponse inattendu');
}

module.exports = { transcribeAudio };
