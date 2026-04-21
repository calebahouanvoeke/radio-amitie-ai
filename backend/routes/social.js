const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { v4: uuid } = require('uuid');
const { generateSocialPosts } = require('../services/groq');
const { publishPost, publishWithImage } = require('../services/facebook');
const { getDb } = require('../db/database');

const upload = multer({ dest: path.join(__dirname, '../uploads/social/'), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 50').all();
  res.json({ posts: rows });
});

router.post('/generate', upload.single('image'), async (req, res) => {
  const { emission_title, emission_description = '', date = '', guests = '', topics = '' } = req.body;
  if (!emission_title) return res.status(400).json({ error: '"emission_title" requis' });

  try {
    const posts = await generateSocialPosts({
      title: emission_title,
      description: emission_description,
      date,
      guests: guests ? guests.split(',').map(s => s.trim()).filter(Boolean) : [],
      topics: topics ? topics.split(',').map(s => s.trim()).filter(Boolean) : []
    });

    const id = uuid();
    const imagePath = req.file?.path || null;

    getDb().prepare(`
      INSERT INTO social_posts(id,emission_title,emission_description,facebook_text,instagram_text,twitter_text,linkedin_text,image_path)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(id, emission_title, emission_description,
      posts.facebook || '', posts.instagram || '',
      posts.twitter  || '', posts.linkedin  || '',
      imagePath);

    res.json({ id, ...posts, image_path: imagePath ? `/uploads/social/${path.basename(imagePath)}` : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', (req, res) => {
  const { facebook_text, instagram_text, twitter_text, linkedin_text } = req.body;
  getDb().prepare('UPDATE social_posts SET facebook_text=?,instagram_text=?,twitter_text=?,linkedin_text=? WHERE id=?')
    .run(facebook_text||'', instagram_text||'', twitter_text||'', linkedin_text||'', req.params.id);
  res.json({ success: true });
});

router.post('/:id/publish', async (req, res) => {
  const post = getDb().prepare('SELECT * FROM social_posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Introuvable' });

  const results = {};
  const { platforms = ['facebook'], scheduled_at } = req.body;

  if (platforms.includes('facebook') && post.facebook_text) {
    try {
      const fn = post.image_path ? () => publishWithImage(post.facebook_text, post.image_path) : () => publishPost(post.facebook_text, scheduled_at);
      const r = await fn();
      getDb().prepare("UPDATE social_posts SET published_facebook=1, facebook_post_id=?, published_at=datetime('now') WHERE id=?").run(r.post_id, req.params.id);
      results.facebook = { success: true, post_id: r.post_id };
    } catch (err) { results.facebook = { success: false, error: err.message }; }
  }

  res.json({ id: req.params.id, results });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM social_posts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
