require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const { initDatabase } = require('./db/database');
const scheduler = require('./services/scheduler');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Trop de requêtes.' }));

app.use('/api/transcription', require('./routes/transcription'));
app.use('/api/social',        require('./routes/social'));
app.use('/api/veille',        require('./routes/veille'));
app.use('/api/audience',      require('./routes/audience'));
app.use('/api/chatbot',       require('./routes/chatbot'));
app.use('/api/visuals',       require('./routes/visuals'));
app.use('/api/publisher',     require('./routes/publisher'));
app.use('/api/oauth',         require('./routes/oauth'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }));

app.get('/api/config', (req, res) => {
  const { getDb } = require('./db/database');
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  const db = await initDatabase();
  scheduler.init(db);
  app.get('/privacy', (req, res) => {
  res.send('<h1>Politique de confidentialité</h1><p>Cette application utilise OAuth pour accéder à vos réseaux sociaux. Vos tokens sont chiffrés et stockés localement. Aucune donnée n\'est partagée avec des tiers.</p>')
})
  app.listen(PORT, () => {
    console.log(`\n🎙️  Radio Amitié — Centre IA v2.0`);
    console.log(`✅  http://localhost:${PORT}\n`);
  });
}
start();
