const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuid } = require('uuid');
const { transcribeAudio }   = require('../services/huggingface');
const { summarizeTranscript } = require('../services/groq');
const { getDb } = require('../db/database');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename:    (_, f, cb)  => cb(null, `audio_${Date.now()}${path.extname(f.originalname)}`)
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_, f, cb) => {
    const ok = ['.mp3','.wav','.m4a','.ogg','.flac','.mp4'];
    ok.includes(path.extname(f.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Format non supporté'));
  }
});

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM transcriptions ORDER BY created_at DESC LIMIT 50').all();
  res.json({ transcriptions: rows });
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM transcriptions WHERE id=?').get(req.params.id);
  row ? res.json(row) : res.status(404).json({ error: 'Introuvable' });
});

router.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
  const id = uuid();
  getDb().prepare('INSERT INTO transcriptions(id,filename,original_name,status) VALUES(?,?,?,?)').run(id, req.file.filename, req.file.originalname, 'processing');
  process(id, req.file.path, req.file.originalname, req.body.emission_title || '');
  res.json({ id, status: 'processing', message: 'Transcription lancée, résultat dans 1–5 min.' });
});

router.post('/text', async (req, res) => {
  const { text, emission_title = '' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Champ "text" requis' });
  try {
    const s = await summarizeTranscript(text, emission_title);
    const id = uuid();
    getDb().prepare('INSERT INTO transcriptions(id,filename,original_name,transcript,summary,description_web,description_facebook,status) VALUES(?,?,?,?,?,?,?,?)').run(id,'manual',emission_title||'Texte',text,s.summary||'',s.description_web||'',s.description_facebook||'','done');
    res.json({ id, ...s, status: 'done' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', (req, res) => {
  const row = getDb().prepare('SELECT filename FROM transcriptions WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const fp = path.join(UPLOAD_DIR, row.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  getDb().prepare('DELETE FROM transcriptions WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

async function process(id, filePath, name, title) {
  const db = getDb();
  try {
    const { text } = await transcribeAudio(filePath);
    const s = await summarizeTranscript(text, title || name);
    db.prepare('UPDATE transcriptions SET transcript=?,summary=?,description_web=?,description_facebook=?,status=? WHERE id=?').run(text, s.summary||'', s.description_web||'', s.description_facebook||'', 'done', id);
  } catch (err) {
    db.prepare("UPDATE transcriptions SET status='error',summary=? WHERE id=?").run(`Erreur: ${err.message}`, id);
  }
}

module.exports = router;
