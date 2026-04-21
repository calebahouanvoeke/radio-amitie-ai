/**
 * Service OAuth — Connexion aux réseaux sociaux sans token manuel
 * Supporte : Facebook, Instagram (via Facebook), Twitter/X, LinkedIn
 *
 * Flux OAuth standard :
 * 1. L'utilisateur clique "Connecter"
 * 2. Il est redirigé vers la plateforme (Facebook, Twitter…)
 * 3. Il autorise l'application
 * 4. La plateforme redirige vers notre callback avec un code
 * 5. On échange le code contre un access_token
 * 6. On stocke le token chiffré en base
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

const BASE = process.env.APP_BASE_URL || 'http://localhost:3001';

// ── Clés OAuth (configurées dans .env) ──────────────────
const config = {
  facebook: {
    appId:     () => process.env.FACEBOOK_APP_ID,
    appSecret: () => process.env.FACEBOOK_APP_SECRET,
    authUrl:   'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl:  'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes:    'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish,public_profile,email',
    apiBase:   'https://graph.facebook.com/v19.0',
  },
  twitter: {
    clientId:     () => process.env.TWITTER_CLIENT_ID,
    clientSecret: () => process.env.TWITTER_CLIENT_SECRET,
    authUrl:      'https://twitter.com/i/oauth2/authorize',
    tokenUrl:     'https://api.twitter.com/2/oauth2/token',
    scopes:       'tweet.read tweet.write users.read offline.access',
    apiBase:      'https://api.twitter.com/2',
  },
  linkedin: {
    clientId:     () => process.env.LINKEDIN_CLIENT_ID,
    clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET,
    authUrl:      'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl:     'https://www.linkedin.com/oauth/v2/accessToken',
    scopes:       'w_member_social r_liteprofile r_emailaddress',
    apiBase:      'https://api.linkedin.com/v2',
  },
};

// ── Chiffrement simple des tokens en base ────────────────
const CIPHER_KEY = process.env.TOKEN_SECRET || 'radio_amitie_secret_key_32chars!!';
function encrypt(text) {
  try {
    const iv  = crypto.randomBytes(16);
    const key = Buffer.from(CIPHER_KEY.padEnd(32).slice(0, 32));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  } catch { return text; }
}
function decrypt(text) {
  try {
    const [ivHex, encrypted] = text.split(':');
    const key = Buffer.from(CIPHER_KEY.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch { return text; }
}

// ── Génère l'URL d'autorisation OAuth ────────────────────
function getAuthUrl(platform, state) {
  const c = config[platform];
  if (!c) throw new Error(`Plateforme inconnue : ${platform}`);

  const redirectUri = `${BASE}/api/oauth/callback/${platform}`;

  if (platform === 'facebook') {
    if (!c.appId()) throw new Error('FACEBOOK_APP_ID manquant dans .env');
    const params = new URLSearchParams({
      client_id:     c.appId(),
      redirect_uri:  redirectUri,
      scope:         c.scopes,
      state,
      response_type: 'code',
    });
    return `${c.authUrl}?${params}`;
  }

  if (platform === 'twitter') {
    if (!c.clientId()) throw new Error('TWITTER_CLIENT_ID manquant dans .env');
    // Twitter utilise PKCE
    const codeChallenge = state; // simplifié
    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             c.clientId(),
      redirect_uri:          redirectUri,
      scope:                 c.scopes,
      state,
      code_challenge:        codeChallenge,
      code_challenge_method: 'plain',
    });
    return `${c.authUrl}?${params}`;
  }

  if (platform === 'linkedin') {
    if (!c.clientId()) throw new Error('LINKEDIN_CLIENT_ID manquant dans .env');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     c.clientId(),
      redirect_uri:  redirectUri,
      scope:         c.scopes,
      state,
    });
    return `${c.authUrl}?${params}`;
  }
}

// ── Échange le code contre un access_token ───────────────
async function exchangeCode(platform, code, state) {
  const c = config[platform];
  const redirectUri = `${BASE}/api/oauth/callback/${platform}`;
  let tokenData = {};

  if (platform === 'facebook') {
    const params = new URLSearchParams({
      client_id:     c.appId(),
      client_secret: c.appSecret(),
      redirect_uri:  redirectUri,
      code,
    });
    const res  = await fetch(`${c.tokenUrl}?${params}`);
    tokenData  = await res.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    return { access_token: tokenData.access_token, platform };
  }

  if (platform === 'twitter') {
    const body = new URLSearchParams({
      code,
      grant_type:    'authorization_code',
      client_id:     c.clientId(),
      redirect_uri:  redirectUri,
      code_verifier: state,
    });
    const credentials = Buffer.from(`${c.clientId()}:${c.clientSecret()}`).toString('base64');
    const res  = await fetch(c.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` },
      body: body.toString()
    });
    tokenData = await res.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    return { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, platform };
  }

  if (platform === 'linkedin') {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     c.clientId(),
      client_secret: c.clientSecret(),
    });
    const res  = await fetch(c.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    tokenData = await res.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    return { access_token: tokenData.access_token, platform };
  }
}

// ── Récupère les pages/comptes associés ──────────────────
async function getAccounts(platform, accessToken) {
  if (platform === 'facebook') {
    // Récupérer le profil utilisateur
    const meRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${accessToken}`);
    const me     = await meRes.json();

    // Récupérer les pages administrées
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
    const pagesData = await pagesRes.json();
    const pages  = (pagesData.data || []).map(p => ({
      id:           p.id,
      name:         p.name,
      type:         'page',
      avatar:       `https://graph.facebook.com/${p.id}/picture?type=square`,
      access_token: p.access_token, // token spécifique à chaque page
      category:     p.category,
    }));

    return { user: { id: me.id, name: me.name, avatar: me.picture?.data?.url }, pages };
  }

  if (platform === 'twitter') {
    const res  = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    const user = data.data;
    return {
      user: { id: user?.id, name: user?.name, username: user?.username, avatar: user?.profile_image_url },
      pages: [{ id: user?.id, name: `@${user?.username}`, type: 'profile', avatar: user?.profile_image_url }]
    };
  }

  if (platform === 'linkedin') {
    const res  = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    const name = `${data.localizedFirstName || ''} ${data.localizedLastName || ''}`.trim();
    return {
      user: { id: data.id, name },
      pages: [{ id: data.id, name, type: 'profile' }]
    };
  }

  return { user: {}, pages: [] };
}

// ── Publication via token stocké ─────────────────────────
async function publishToAccount(connection, content) {
  const token = decrypt(connection.access_token);
  const { platform, account_id, page_id } = connection;

  if (platform === 'facebook') {
    const id  = page_id || account_id;
    const body = { message: content.text, access_token: token };
    if (content.image_url) {
      // Photo post
      const form = new URLSearchParams({ url: content.image_url, caption: content.text, access_token: token });
      const res  = await fetch(`https://graph.facebook.com/v19.0/${id}/photos`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return { success: true, post_id: data.id || data.post_id };
    }
    const res  = await fetch(`https://graph.facebook.com/v19.0/${id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { success: true, post_id: data.id };
  }

  if (platform === 'twitter') {
    const body = { text: content.text?.slice(0, 280) };
    const res  = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message);
    return { success: true, post_id: data.data?.id };
  }

  if (platform === 'linkedin') {
    const body = {
      author: `urn:li:person:${account_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    const res  = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.message) throw new Error(data.message);
    return { success: true, post_id: data.id };
  }

  return { success: false, error: 'Plateforme non supportée' };
}

module.exports = { getAuthUrl, exchangeCode, getAccounts, publishToAccount, encrypt, decrypt };
