const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { fetchNewsArticles, preFilter } = require('../services/rss');
const { analyzeNewsArticles, generate } = require('../services/groq');
const { getDb } = require('../db/database');

function getKeywords() {
  const row = getDb().prepare("SELECT value FROM config WHERE key='veille_keywords'").get();
  return row ? row.value.split(',').map(s => s.trim()).filter(Boolean) : ['Grand-Charmont'];
}

router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 40;
  const q = req.query.unread === 'true'
    ? 'SELECT * FROM veille_articles WHERE is_read=0 ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM veille_articles ORDER BY created_at DESC LIMIT ?';
  const rows = getDb().prepare(q).all(limit);
  res.json({ articles: rows, count: rows.length });
});

// ── GET config (keywords persistants depuis la DB) ───────
router.get('/config', (req, res) => {
  const keywords = getKeywords().join(',');
  res.json({ keywords });
});

// ── PUT config (sauvegarde en DB) ───────────────────────
router.put('/config', (req, res) => {
  const { keywords } = req.body;
  if (!keywords?.trim()) return res.status(400).json({ error: '"keywords" requis' });
  getDb().prepare("INSERT OR REPLACE INTO config(key,value,updated_at) VALUES('veille_keywords',?,datetime('now'))").run(keywords.trim());
  res.json({ success: true, keywords: keywords.trim() });
});

router.post('/refresh', async (req, res) => {
  const db = getDb();
  const keywords = getKeywords();
  const cityRow   = db.prepare("SELECT value FROM config WHERE key='radio_city'").get();
  const regionRow = db.prepare("SELECT value FROM config WHERE key='radio_region'").get();

  try {
    const articles = await fetchNewsArticles(keywords);
    const filtered = preFilter(articles, keywords).slice(0, 20);
    if (!filtered.length) return res.json({ message: 'Aucun article', articles: [] });

    const analysis = await analyzeNewsArticles(filtered, {
      city:   cityRow?.value   || 'Grand-Charmont',
      region: regionRow?.value || 'Nord-Franche-Comté'
    });

    const selectedIdx = new Set((analysis.selected || []).map(s => s.index - 1));
    const ins = db.prepare('INSERT OR IGNORE INTO veille_articles(id,title,link,source,published_at,summary,relevance_score,emission_idea) VALUES(?,?,?,?,?,?,?,?)');

    let newCount = 0;
    filtered.forEach((a, i) => {
      const ai = (analysis.selected || []).find(s => s.index - 1 === i);
      const r  = ins.run(a.id, a.title, a.link, a.source, a.pubDate, a.content?.slice(0,500)||'', ai?.relevance_score||10, ai?.emission_idea||null);
      if (r.changes > 0) newCount++;
    });

    res.json({ new_articles: newCount, total: articles.length, daily_summary: analysis.daily_summary || '', articles: filtered.filter((_, i) => selectedIdx.has(i)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/idea', async (req, res) => {
  const a = getDb().prepare('SELECT * FROM veille_articles WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Introuvable' });

  try {
    const raw = await generate(`Tu es directeur éditorial de Radio Amitié 99.2 FM (Grand-Charmont).
Article : "${a.title}" — ${a.summary||''}
Génère uniquement ce JSON (sans markdown) :
{"emission_title":"...","angle":"...","questions":["...","...","..."],"ideal_guest":"..."}`);

    let idea;
    try {
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      idea = JSON.parse(raw.slice(s, e+1));
    } catch { idea = { emission_title: a.title, angle: raw }; }

    getDb().prepare('UPDATE veille_articles SET emission_idea=?,is_read=1 WHERE id=?').run(JSON.stringify(idea), a.id);
    res.json(idea);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', (req, res) => {
  getDb().prepare('UPDATE veille_articles SET is_read=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
