const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { generateChatbotResponse } = require('../services/groq');
const { webSearch } = require('../services/websearch');
const { sendMessenger, verifyWebhook } = require('../services/facebook');
const { getDb } = require('../db/database');

// Détecte si le message nécessite une recherche web
function needsWebSearch(message) {
  const triggers = ['actualité','news','récent','aujourd\'hui','semaine','dernier','nouveau','prix','météo','heure','quand','où','qui est','qu\'est-ce que','comment','pourquoi','combien','résultat','classement'];
  const lower = message.toLowerCase();
  return triggers.some(t => lower.includes(t));
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM chatbot_conversations ORDER BY created_at DESC LIMIT 100').all();
  res.json({ conversations: rows });
});

router.post('/message', async (req, res) => {
  const { message, session_id = 'web_session' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: '"message" requis' });

  const db = getDb();

  // Récupérer l'historique de la session
  const history = db.prepare('SELECT message, response FROM chatbot_conversations WHERE sender_id=? ORDER BY created_at DESC LIMIT 6').all(session_id)
    .reverse()
    .flatMap(c => [{ role: 'user', content: c.message }, { role: 'assistant', content: c.response }]);

  try {
    // Recherche web si nécessaire
    let webContext = null;
    let searchUsed = false;
    if (needsWebSearch(message)) {
      console.log(`🔍  Recherche web pour: "${message}"`);
      webContext = await webSearch(message).catch(() => null);
      if (webContext) searchUsed = true;
    }

    const response = await generateChatbotResponse(message, history, webContext || '');

    // Sauvegarder
    db.prepare('INSERT INTO chatbot_conversations(id,sender_id,message,response,channel) VALUES(?,?,?,?,?)').run(uuid(), session_id, message, response, 'web');

    res.json({ response, search_used: searchUsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Webhook Facebook Messenger
router.get('/webhook', (req, res) => {
  const r = verifyWebhook(req.query);
  r.valid ? res.status(200).send(r.challenge) : res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;
      const sid = event.sender.id;
      const msg = event.message.text;
      const db  = getDb();

      try {
        const history = db.prepare('SELECT message,response FROM chatbot_conversations WHERE sender_id=? ORDER BY created_at DESC LIMIT 6').all(sid).reverse().flatMap(c => [{ role: 'user', content: c.message }, { role: 'assistant', content: c.response }]);
        const wc = needsWebSearch(msg) ? await webSearch(msg).catch(() => null) : null;
        const response = await generateChatbotResponse(msg, history, wc || '');
        await sendMessenger(sid, response);
        db.prepare('INSERT INTO chatbot_conversations(id,sender_id,message,response,channel) VALUES(?,?,?,?,?)').run(uuid(), sid, msg, response, 'messenger');
      } catch (err) { console.error('Chatbot webhook err:', err.message); }
    }
  }
});

module.exports = router;
