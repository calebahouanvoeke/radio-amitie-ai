const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { getAudienceStats, getCurrentTrack } = require('../services/radioking');
const { analyzeAudienceData } = require('../services/groq');
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM audience_reports ORDER BY created_at DESC LIMIT 10').all();
  res.json({ reports: rows });
});

router.get('/live', async (req, res) => {
  try { res.json(await getCurrentTrack()); }
  catch { res.json(null); }
});

router.post('/analyze', async (req, res) => {
  try {
    const stats = await getAudienceStats();
    const analysis = await analyzeAudienceData({
      current_listeners: stats.current_listeners,
      peak_today:        stats.peak_today,
      peak_hour:         stats.peak_hour,
      daily:             stats.daily
    });

    const id = uuid();
    getDb().prepare('INSERT INTO audience_reports(id,period,data_json,analysis,recommendations) VALUES(?,?,?,?,?)').run(
      id,
      new Date().toISOString().split('T')[0],
      JSON.stringify(stats),
      analysis.summary || '',
      JSON.stringify(analysis.recommendations || [])
    );

    res.json({ id, stats, analysis });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
