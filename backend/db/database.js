const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, 'radio_amitie.sqlite');
let db;

function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

async function initDatabase() {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id TEXT PRIMARY KEY, filename TEXT, original_name TEXT,
      transcript TEXT, summary TEXT, description_web TEXT, description_facebook TEXT,
      created_at TEXT DEFAULT (datetime('now')), status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY, emission_title TEXT, emission_description TEXT,
      facebook_text TEXT, instagram_text TEXT, twitter_text TEXT, linkedin_text TEXT,
      image_path TEXT,
      published_facebook INTEGER DEFAULT 0, published_instagram INTEGER DEFAULT 0,
      published_twitter INTEGER DEFAULT 0, published_linkedin INTEGER DEFAULT 0,
      facebook_post_id TEXT, scheduled_at TEXT, published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS veille_articles (
      id TEXT PRIMARY KEY, title TEXT, link TEXT, source TEXT,
      published_at TEXT, summary TEXT, relevance_score INTEGER DEFAULT 0,
      emission_idea TEXT, is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audience_reports (
      id TEXT PRIMARY KEY, period TEXT, data_json TEXT,
      analysis TEXT, recommendations TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chatbot_conversations (
      id TEXT PRIMARY KEY, sender_id TEXT, sender_name TEXT,
      message TEXT, response TEXT, channel TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS generated_visuals (
      id TEXT PRIMARY KEY, prompt TEXT, style TEXT,
      image_url TEXT, image_path TEXT, emission_title TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY, value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS publisher_queue (
      id TEXT PRIMARY KEY,
      content_text TEXT,
      image_path TEXT,
      video_path TEXT,
      content_type TEXT DEFAULT 'text',
      platforms TEXT DEFAULT '[]',
      scheduled_at TEXT,
      status TEXT DEFAULT 'pending',
      results TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS social_connections (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      account_id TEXT,
      account_name TEXT,
      account_type TEXT DEFAULT 'profile',
      avatar_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      page_id TEXT,
      page_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(platform, page_id)
    );
  `);

  // Valeurs par défaut
  const ins = d.prepare('INSERT OR IGNORE INTO config(key,value) VALUES(?,?)');
  [
    ['radio_name',       'Radio Amitié 99.2 FM'],
    ['radio_city',       'Grand-Charmont'],
    ['radio_region',     'Nord-Franche-Comté'],
    ['veille_keywords',  'Grand-Charmont,Nord-Franche-Comté,Belfort,Montbéliard'],
    ['stream_url',       'https://listen.radioking.com/radio/545489/stream/608162'],
  ].forEach(([k, v]) => ins.run(k, v));

  console.log('✅  Base de données prête');
  return d;
}

module.exports = { getDb, initDatabase };
