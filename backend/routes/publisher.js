const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db/database');
const { publishNow } = require('../services/scheduler');
const { generateSocialPosts } = require('../services/groq');

const MEDIA_DIR = path.join(__dirname, '../uploads/publisher');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, MEDIA_DIR),
  filename:    (_, f, cb)  => cb(null, `pub_${Date.now()}${path.extname(f.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── GET / — Lister toutes les publications ────────────────
router.get('/', (req, res) => {
  const { status, limit = 50 } = req.query;
  let q = 'SELECT * FROM publisher_queue';
  const params = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = getDb().prepare(q).all(...params);
  res.json({ posts: rows.map(r => ({ ...r, platforms: JSON.parse(r.platforms||'[]'), results: JSON.parse(r.results||'{}') })) });
});

// ── GET /pending — Posts à venir ──────────────────────────
router.get('/pending', (req, res) => {
  const rows = getDb().prepare("SELECT * FROM publisher_queue WHERE status='pending' ORDER BY scheduled_at ASC LIMIT 20").all();
  res.json({ posts: rows.map(r => ({ ...r, platforms: JSON.parse(r.platforms||'[]'), results: JSON.parse(r.results||'{}') })) });
});

// ── POST /create — Créer une publication ──────────────────
router.post('/create', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const {
    content_text = '',
    platforms    = '["facebook"]',
    scheduled_at = null,
    content_type = 'text',
  } = req.body;

  if (!content_text.trim() && !req.files?.image && !req.files?.video) {
    return res.status(400).json({ error: 'Contenu requis (texte, image ou vidéo)' });
  }

  const platformList = typeof platforms === 'string' ? JSON.parse(platforms) : platforms;
  const imagePath    = req.files?.image?.[0]?.path || null;
  const videoPath    = req.files?.video?.[0]?.path || null;

  const id = uuid();
  const db = getDb();

  db.prepare(`
    INSERT INTO publisher_queue(id, content_text, image_path, video_path, content_type, platforms, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, content_text, imagePath, videoPath, content_type, JSON.stringify(platformList),
    scheduled_at || null,
    scheduled_at ? 'pending' : 'ready'  // 'ready' = publier maintenant
  );

  // Si pas de programmation → publier immédiatement
  if (!scheduled_at) {
    try {
      const results = await publishNow(id);
      return res.json({ id, status: 'published', results });
    } catch (err) {
      return res.json({ id, status: 'ready', message: 'Facebook non configuré — copiez et publiez manuellement.', error: err.message });
    }
  }

  res.json({ id, status: 'pending', scheduled_at, platforms: platformList });
});

// ── POST /generate-ai — Générer le texte avec l'IA ───────
router.post('/generate-ai', async (req, res) => {
  const { title, description, date, guests, topics, platforms = [] } = req.body;
  if (!title) return res.status(400).json({ error: '"title" requis' });

  try {
    const posts = await generateSocialPosts({
      title, description: description || '', date: date || '',
      guests: guests ? guests.split(',').map(s => s.trim()) : [],
      topics: topics ? topics.split(',').map(s => s.trim()) : []
    });

    // Retourner les textes pour chaque plateforme sélectionnée
    const result = {};
    (platforms.length ? platforms : ['facebook','instagram','twitter','linkedin']).forEach(p => {
      result[p] = posts[p] || posts.facebook || '';
    });

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /:id/publish — Publier maintenant ────────────────
router.post('/:id/publish', async (req, res) => {
  try {
    const results = await publishNow(req.params.id);
    res.json({ id: req.params.id, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /:id — Supprimer ───────────────────────────────
router.delete('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT image_path, video_path FROM publisher_queue WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  [row.image_path, row.video_path].filter(Boolean).forEach(p => { try { fs.unlinkSync(p); } catch {} });
  db.prepare('DELETE FROM publisher_queue WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
