const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const FB = 'https://graph.facebook.com/v19.0';
const token  = () => process.env.FACEBOOK_PAGE_TOKEN  || (() => { throw new Error('FACEBOOK_PAGE_TOKEN manquant') })();
const pageId = () => process.env.FACEBOOK_PAGE_ID     || (() => { throw new Error('FACEBOOK_PAGE_ID manquant') })();

async function publishPost(message, scheduledAt = null) {
  const body = { message, access_token: token() };
  if (scheduledAt) {
    body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    body.published = false;
  }
  const res = await fetch(`${FB}/${pageId()}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { post_id: data.id };
}

async function publishWithImage(message, imagePath) {
  const form = new FormData();
  form.append('source', fs.createReadStream(imagePath));
  form.append('caption', message);
  form.append('access_token', token());
  const res = await fetch(`${FB}/${pageId()}/photos`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { post_id: data.post_id || data.id };
}

async function sendMessenger(recipientId, message) {
  const res = await fetch(`${FB}/me/messages?access_token=${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message }, messaging_type: 'RESPONSE' })
  });
  return res.json();
}

function verifyWebhook(query) {
  const vt = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'radio_amitie_secret_2024';
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === vt)
    return { valid: true, challenge: query['hub.challenge'] };
  return { valid: false };
}

module.exports = { publishPost, publishWithImage, sendMessenger, verifyWebhook };
