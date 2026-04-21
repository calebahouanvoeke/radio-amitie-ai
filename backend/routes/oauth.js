/**
 * Routes OAuth — Connexion aux réseaux sociaux
 * GET  /api/oauth/connect/:platform   → Démarre le flux OAuth
 * GET  /api/oauth/callback/:platform  → Reçoit le code de retour
 * GET  /api/oauth/connections         → Liste des connexions actives
 * DELETE /api/oauth/connections/:id   → Déconnecter un compte
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuid } = require('uuid');
const { getAuthUrl, exchangeCode, getAccounts, encrypt } = require('../services/oauth');
const { getDb } = require('../db/database');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

// Stockage temporaire des states OAuth (en mémoire, TTL 10min)
const pendingStates = new Map();

// ── GET /api/oauth/connect/:platform ─────────────────────
// Démarre le flux OAuth, redirige vers la plateforme
router.get('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  const supported = ['facebook', 'twitter', 'linkedin'];

  if (!supported.includes(platform)) {
    return res.status(400).json({ error: `Plateforme non supportée. Supportées : ${supported.join(', ')}` });
  }

  try {
    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, { platform, created: Date.now() });

    // Nettoyer les states expirés (> 10 min)
    for (const [k, v] of pendingStates.entries()) {
      if (Date.now() - v.created > 600000) pendingStates.delete(k);
    }

    const authUrl = getAuthUrl(platform, state);
    res.redirect(authUrl);
  } catch (err) {
    // Rediriger vers le frontend avec l'erreur
    res.redirect(`${FRONTEND}/connections?error=${encodeURIComponent(err.message)}`);
  }
});

// ── GET /api/oauth/callback/:platform ────────────────────
// Reçoit le code OAuth après autorisation de l'utilisateur
router.get('/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;

  // Erreur retournée par la plateforme
  if (error) {
    return res.redirect(`${FRONTEND}/connections?error=${encodeURIComponent(error)}`);
  }

  // Vérifier le state (CSRF protection)
  if (!state || !pendingStates.has(state)) {
    return res.redirect(`${FRONTEND}/connections?error=Session+expirée,+réessayez`);
  }
  pendingStates.delete(state);

  if (!code) {
    return res.redirect(`${FRONTEND}/connections?error=Autorisation+refusée`);
  }

  try {
    const db = getDb();

    // 1. Échanger le code contre un access_token
    const tokenData = await exchangeCode(platform, code, state);

    // 2. Récupérer les informations du compte
    const { user, pages } = await getAccounts(platform, tokenData.access_token);

    // 3. Sauvegarder en base chaque page/compte
    const insertStmt = db.prepare(`
      INSERT INTO social_connections
      (id, platform, account_id, account_name, account_type, avatar_url, access_token, refresh_token, page_id, page_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(platform, page_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        account_name = excluded.account_name,
        is_active = 1
    `);

    // Stocker le compte principal (profil utilisateur)
    const mainId = uuid();
    insertStmt.run(
      mainId, platform,
      user.id || '', user.name || platform, 'profile',
      user.avatar || '', encrypt(tokenData.access_token),
      tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      user.id || '', user.name || platform
    );

    // Pour Facebook, stocker aussi chaque page administrée séparément
    if (platform === 'facebook' && pages.length > 0) {
      for (const page of pages) {
        const pageId = uuid();
        insertStmt.run(
          pageId, 'facebook',
          user.id || '', user.name || '', 'page',
          page.avatar || '',
          encrypt(page.access_token || tokenData.access_token),
          null,
          page.id, page.name
        );
        // Instagram connecté à la même page Facebook
        // (si la page a un compte Instagram Business lié)
        try {
          const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`).then(r => r.json());
          if (igRes.instagram_business_account?.id) {
            const igAccId = igRes.instagram_business_account.id;
            const igInfo  = await fetch(`https://graph.facebook.com/v19.0/${igAccId}?fields=id,name,username,profile_picture_url&access_token=${page.access_token}`).then(r => r.json());
            insertStmt.run(
              uuid(), 'instagram',
              user.id || '', igInfo.name || igInfo.username || 'Instagram', 'profile',
              igInfo.profile_picture_url || '',
              encrypt(page.access_token),
              null,
              igAccId, igInfo.name || igInfo.username || 'Instagram'
            );
          }
        } catch {}
      }
    }

    const connectedCount = pages.length > 0 ? pages.length : 1;
    res.redirect(`${FRONTEND}/connections?success=${connectedCount}+compte(s)+connecté(s)&platform=${platform}`);

  } catch (err) {
    console.error(`OAuth callback error (${platform}):`, err.message);
    res.redirect(`${FRONTEND}/connections?error=${encodeURIComponent(err.message)}`);
  }
});

// ── GET /api/oauth/connections ────────────────────────────
// Liste toutes les connexions actives
router.get('/connections', (req, res) => {
  const rows = getDb().prepare(`
    SELECT id, platform, account_id, account_name, account_type, avatar_url, page_id, page_name, is_active, created_at
    FROM social_connections WHERE is_active = 1 ORDER BY platform, created_at DESC
  `).all();

  // Grouper par plateforme pour l'affichage
  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.platform]) grouped[r.platform] = [];
    grouped[r.platform].push(r);
  });

  res.json({ connections: rows, grouped });
});

// ── DELETE /api/oauth/connections/:id ─────────────────────
// Désactiver une connexion (ne supprime pas le token, juste désactive)
router.delete('/connections/:id', (req, res) => {
  getDb().prepare('UPDATE social_connections SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

/**
 * PATCH à appliquer dans routes/oauth.js
 * Remplace la route GET /api/oauth/status existante
 *
 * Nouveauté : retourne aussi le "mode" de l'app Facebook
 * (development vs live) pour avertir l'utilisateur dans l'UI.
 *
 * Pour détecter le mode, on fait un appel simple à l'API Graph.
 * Si l'app est en mode développement, seul le token d'un admin
 * peut appeler /app — les autres reçoivent une erreur de permission.
 * On ne peut pas détecter ça côté backend sans un appel actif,
 * donc on expose juste si les credentials sont configurés
 * et on laisse l'UI afficher le warning statique.
 */

// ── GET /api/oauth/status ─────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const fb = !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
  const tw = !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET)
  const li = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)

  // Optionnel : vérifier si l'app Facebook est en mode Live
  // (nécessite un appel à l'API Graph avec le token d'app)
  let fbMode = 'unknown'
  if (fb) {
    try {
      const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
      const r = await fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_APP_ID}?fields=status&access_token=${appToken}`)
      const d = await r.json()
      // status: 1 = live, 2 = development, 5 = waiting_approval
      if (d.status === 1) fbMode = 'live'
      else if (d.status === 2) fbMode = 'development'
    } catch {
      fbMode = 'unknown'
    }
  }

  res.json({
    facebook: {
      configured: fb,
      label: 'Facebook / Instagram',
      mode: fbMode, // 'live' | 'development' | 'unknown'
    },
    twitter: {
      configured: tw,
      label: 'X / Twitter',
    },
    linkedin: {
      configured: li,
      label: 'LinkedIn',
    },
  })
})



module.exports = router;
