/**
 * Scheduler de publications — vérifie toutes les minutes les posts programmés
 */
const { publishToAccount } = require('./oauth');

let db;
let interval = null;

function init(database) {
  db = database;
  interval = setInterval(processQueue, 60 * 1000);
  console.log('⏱️  Scheduler actif (vérification toutes les 60s)');
}

async function processQueue() {
  if (!db) return;
  const now = new Date().toISOString();
  const pending = db.prepare(
    "SELECT * FROM publisher_queue WHERE status='pending' AND scheduled_at<=? ORDER BY scheduled_at ASC LIMIT 10"
  ).all(now);
  if (!pending.length) return;
  console.log(`⏱️  Scheduler: ${pending.length} publication(s)`);
  for (const post of pending) await dispatchPost(post);
}

async function dispatchPost(post) {
  const platforms = JSON.parse(post.platforms || '[]');
  const results   = {};

  for (const platform of platforms) {
    const connections = db.prepare(
      "SELECT * FROM social_connections WHERE platform=? AND is_active=1 LIMIT 10"
    ).all(platform);

    if (!connections.length) {
      results[platform] = { success: false, error: 'Aucun compte connecté pour ' + platform };
      continue;
    }

    for (const conn of connections) {
      const key = `${platform}:${conn.page_name || conn.account_name}`;
      try {
        const r = await publishToAccount(conn, { text: post.content_text, image_path: post.image_path });
        results[key] = r;
      } catch (err) {
        console.error(`❌ Publish error [${key}]:`, err.message);
        results[key] = { success: false, error: err.message };
      }
    }
  }

  const hasSuccess = Object.values(results).some(r => r.success);
  db.prepare("UPDATE publisher_queue SET status=?,results=?,published_at=datetime('now') WHERE id=?")
    .run(hasSuccess ? 'published' : 'failed', JSON.stringify(results), post.id);
}

async function publishNow(postId) {
  const post = db.prepare('SELECT * FROM publisher_queue WHERE id=?').get(postId);
  if (!post) throw new Error('Publication introuvable');
  await dispatchPost(post);
  const u = db.prepare('SELECT results FROM publisher_queue WHERE id=?').get(postId);
  return JSON.parse(u.results || '{}');
}

function stop() { if (interval) clearInterval(interval); }
module.exports = { init, processQueue, publishNow, stop };
