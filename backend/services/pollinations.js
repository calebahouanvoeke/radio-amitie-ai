/**
 * Génération d'images — Double moteur :
 * 1. HuggingFace FLUX.1-schnell (qualité excellente, gratuit)
 * 2. Pollinations.ai flux-realism (fallback sans clé)
 */
const fetch  = require('node-fetch');
const fs     = require('fs');
const path   = require('path');

const NEGATIVE = 'text, words, letters, numbers, watermark, logo, signature, blurry, low quality, distorted, ugly, deformed, bad anatomy, oversaturated, cartoon, nsfw, noise';

// ── Moteur 1 : HuggingFace FLUX.1-schnell ────────────────
// Modèle de Black Forest Labs — qualité proche de Midjourney
// Gratuit avec HUGGINGFACE_API_KEY (30 000 req/mois)
async function generateWithFlux(prompt, outputDir, seed) {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error('HUGGINGFACE_API_KEY manquante');

  const payload = {
    inputs: prompt,
    parameters: {
      num_inference_steps: 4,   // Flux schnell = 4 steps suffisent
      guidance_scale: 0,        // Flux schnell ne nécessite pas de guidance
      width: 1280,
      height: 720,
      seed,
      negative_prompt: NEGATIVE,
    }
  };

  console.log('🎨  HuggingFace FLUX.1-schnell...');
  const res = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      timeout: 90000,
      size:    0,
    }
  );

  if (res.status === 503) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Modèle en démarrage, réessayez dans ${Math.ceil(err.estimated_time || 30)}s`);
  }
  if (!res.ok) throw new Error(`HuggingFace erreur ${res.status}`);

  const buffer = await res.buffer();
  if (buffer.length < 5000) throw new Error('Image invalide reçue de HuggingFace');
  return buffer;
}

// ── Moteur 2 : Pollinations flux-realism (fallback) ──────
async function generateWithPollinations(prompt, seed) {
  const params = new URLSearchParams({
    width: '1280', height: '720',
    model: 'flux-realism',
    seed:  String(seed),
    nologo: 'true',
    negative: NEGATIVE,
    enhance: 'true',
  });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  console.log('🎨  Pollinations flux-realism (fallback)...');
  const res = await fetch(url, { timeout: 120000, headers: { 'User-Agent': 'RadioAmitie-AI/2.0' } });
  if (!res.ok) throw new Error(`Pollinations erreur ${res.status}`);
  return res.buffer();
}

// ── Fonction principale ───────────────────────────────────
async function generateImage(prompt, outputDir, options = {}) {
  const {
    seed = Math.floor(Math.random() * 999999),
  } = options;

  // Enrichir le prompt pour meilleure qualité
  const richPrompt = [
    prompt,
    'absolutely no text no words no letters no numbers no captions',
    'masterpiece, best quality, ultra detailed, 8k uhd, professional photography',
    'sharp focus, perfect lighting, cinematic composition',
  ].join(', ');

  let buffer;

  // Essayer HuggingFace FLUX.1 en premier
  try {
    buffer = await generateWithFlux(richPrompt, outputDir, seed);
    console.log('✅  FLUX.1-schnell réussi');
  } catch (err) {
    console.warn(`⚠️  FLUX.1 échoué (${err.message}), fallback Pollinations...`);
    buffer = await generateWithPollinations(richPrompt, seed);
    console.log('✅  Pollinations réussi');
  }

  if (buffer.length < 5000) throw new Error('Image générée invalide, réessayez.');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filename = `visual_${Date.now()}_${seed}.jpg`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, buffer);

  console.log(`✅  Image sauvegardée : ${filename} (${(buffer.length/1024).toFixed(0)} Ko)`);
  return { filePath, filename, url: `/uploads/visuals/${filename}`, seed };
}

module.exports = { generateImage };
