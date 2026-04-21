const express = require('express');
const router  = express.Router();
const path    = require('path');
const { v4: uuid } = require('uuid');
const { generateImage } = require('../services/pollinations');
const { generateImagePrompt } = require('../services/groq');
const { getDb } = require('../db/database');

const OUT = path.join(__dirname, '../uploads/visuals');

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM generated_visuals ORDER BY created_at DESC LIMIT 30').all();
  res.json({ visuals: rows });
});

router.post('/generate', async (req, res) => {
  const { emission_title, emission_description = '', style = 'photorealistic modern' } = req.body;
  if (!emission_title) return res.status(400).json({ error: '"emission_title" requis' });

  try {
    // 1. Groq génère un prompt Flux optimisé
    const prompt = await generateImagePrompt(emission_title, emission_description, style);

    // 2. Pollinations.ai génère l'image (100% gratuit, modèle Flux)
    const { url: imageUrl, filePath } = await generateImage(prompt, OUT, { model: 'flux', width: 1280, height: 720 });

    const id = uuid();
    getDb().prepare('INSERT INTO generated_visuals(id,prompt,style,image_url,image_path,emission_title) VALUES(?,?,?,?,?,?)').run(id, prompt, style, imageUrl, filePath, emission_title);

    res.json({ id, image_url: imageUrl, prompt, emission_title });
  } catch (err) {
    console.error('Visuel erreur:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const row = getDb().prepare('SELECT image_path FROM generated_visuals WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const fs = require('fs');
  if (row.image_path && fs.existsSync(row.image_path)) fs.unlinkSync(row.image_path);
  getDb().prepare('DELETE FROM generated_visuals WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
