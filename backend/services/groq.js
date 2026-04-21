const Groq = require('groq-sdk');

let client;
function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquante dans .env — Inscrivez-vous sur console.groq.com (gratuit)');
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

// Modèle principal : llama-3.3-70b-versatile (meilleur qualité, gratuit)
// Modèle rapide   : llama-3.1-8b-instant (plus rapide, gratuit)
const MODEL_SMART = 'llama-3.3-70b-versatile';
const MODEL_FAST  = 'llama-3.1-8b-instant';

async function chat(messages, systemPrompt = '', fast = false) {
  const groq = getClient();
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const res = await groq.chat.completions.create({
    model: fast ? MODEL_FAST : MODEL_SMART,
    messages: msgs,
    temperature: 0.7,
    max_tokens: 1024,
  });
  return res.choices[0].message.content;
}

async function generate(prompt, fast = false) {
  return chat([{ role: 'user', content: prompt }], '', fast);
}

// ── Résumé de transcription ──────────────────────────────
async function summarizeTranscript(transcript, emissionTitle = '') {
  const prompt = `Tu es rédacteur web pour Radio Amitié 99.2 FM, radio associative de Grand-Charmont (Nord-Franche-Comté).

Transcription${emissionTitle ? ` de l'émission "${emissionTitle}"` : ''} :
${transcript.slice(0, 3000)}

Génère uniquement ce JSON (sans balises markdown, sans texte avant/après) :
{"summary":"Résumé de 120 mots pour le site web, ton informatif et accessible.","description_facebook":"Publication Facebook 50 mots max, ton chaleureux, 2 emojis, hashtag #RadioAmitie #992FM","description_web":"Description SEO 80 mots avec mots-clés importants.","themes":["thème 1","thème 2","thème 3"]}`;

  const raw = await generate(prompt);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { summary: raw.replace(/[{}[\]"]/g, '').slice(0, 500), description_facebook: '', description_web: '', themes: [] };
  }
}

// ── Publications réseaux sociaux ─────────────────────────
async function generateSocialPosts(data) {
  const { title, description, date, guests = [], topics = [] } = data;
  const prompt = `Tu es community manager de Radio Amitié 99.2 FM, radio associative de Grand-Charmont.

Émission : "${title}"
Description : ${description || 'N/A'}
${date ? `Date : ${date}` : ''}${guests.length ? `\nInvités : ${guests.join(', ')}` : ''}${topics.length ? `\nSujets : ${topics.join(', ')}` : ''}

Génère uniquement ce JSON (sans markdown) :
{"facebook":"Publication Facebook 120 mots max, chaleureux, 3 emojis, #RadioAmitié #992FM #GrandCharmont","instagram":"Légende Instagram 80 mots, percutant, 5 hashtags pertinents #radioamitie","twitter":"Tweet 240 caractères max, accrocheur, 2 hashtags","linkedin":"Post LinkedIn 100 mots, professionnel mais chaleureux"}`;

  const raw = await generate(prompt);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { facebook: raw.slice(0, 400), instagram: '', twitter: '', linkedin: '' };
  }
}

// ── Analyse articles de veille ───────────────────────────
async function analyzeNewsArticles(articles, radioContext) {
  const list = articles.slice(0, 15).map((a, i) => `${i+1}. "${a.title}" (${a.source})`).join('\n');
  const prompt = `Tu es directeur éditorial de Radio Amitié 99.2 FM, ${radioContext.city} (${radioContext.region}).

Actualités collectées :
${list}

Sélectionne les 5 plus pertinentes pour une radio locale communautaire.
Génère uniquement ce JSON (sans markdown) :
{"selected":[{"index":1,"relevance_score":85,"reason":"Pertinent car...","emission_idea":"Idée d'émission en 2 phrases."}],"daily_summary":"Synthèse éditoriale du jour en 2 phrases."}`;

  const raw = await generate(prompt, true);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { selected: [], daily_summary: 'Analyse indisponible.' };
  }
}

// ── Analyse audience RadioKing ────────────────────────────
async function analyzeAudienceData(stats) {
  const prompt = `Tu es consultant programmation radio pour Radio Amitié 99.2 FM.

Données : auditeurs actuel=${stats.current_listeners}, pic=${stats.peak_today} à ${stats.peak_hour}
Programme hebdomadaire : ${JSON.stringify(stats.daily || [])}

Génère uniquement ce JSON (sans markdown) :
{"insights":["observation 1","observation 2","observation 3"],"peak_hours":"description des heures de pointe","recommendations":["recommandation concrète 1","recommandation 2","recommandation 3"],"summary":"Résumé exécutif 2 phrases pour la direction."}`;

  const raw = await generate(prompt, true);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { insights: [], recommendations: [], summary: 'Analyse indisponible.' };
  }
}

// ── Réponse chatbot avec historique et contexte web ──────
async function generateChatbotResponse(userMessage, conversationHistory = [], webContext = '') {
  const system = `Tu es l'assistant intelligent de Radio Amitié 99.2 FM (Grand-Charmont, Nord-Franche-Comté).
Tu réponds aux auditeurs avec chaleur et précision. Tu as accès à Internet via des recherches.

Informations clés :
- Fréquence : 99.2 FM
- Écoute en ligne : https://play.radioking.io/radio-amitie1
- Application Android : Google Play "Radio Amitié 99.2"
- Dédicaces : message Facebook sur la page Radio Amitié

${webContext ? `Informations trouvées sur le web :\n${webContext}\n` : ''}

Instructions :
- Réponds toujours en français
- Sois chaleureux, précis et concis (3-4 phrases max)
- Si tu ne sais pas quelque chose, dis-le honnêtement
- Pour les questions sur l'actualité locale, utilise les infos web ci-dessus`;

  const messages = [
    ...conversationHistory.slice(-8),
    { role: 'user', content: userMessage }
  ];

  return chat(messages, system, false);
}

// ── Prompt image optimisé ─────────────────────────────────
async function generateImagePrompt(title, description, style) {
  const styleMap = {
    'photorealistic modern':   'hyperrealistic photography, modern studio with professional lighting, DSLR 85mm lens, shallow depth of field, cinematic color grading',
    'vintage radio poster':    'vintage 1960s retro illustration, warm amber and sepia tones, art deco elements, nostalgic atmosphere, film grain',
    'colorful multicultural':  'vibrant saturated colors, diverse multicultural joyful people, festive cultural celebration, dynamic composition, golden hour light',
    'minimalist flat':         'clean minimalist scene, soft pastel palette, geometric shapes, negative space, Scandinavian design aesthetic',
    'concert event poster':    'epic concert stage photography, dramatic spotlights, smoke effects, energetic crowd silhouettes, moody blue and orange tones',
    'news broadcast studio':   'professional broadcast studio, sleek modern set, blue and white lighting, high-tech monitors, editorial photography',
    'african music vibrant':   'vibrant West African scene, bold kente cloth patterns, warm golden sunlight, musicians with traditional instruments, joyful energy',
    'community radio warm':    'cozy intimate radio studio, warm amber lighting, diverse community gathering, authentic candid photography',
  };
  const styleDesc = styleMap[style] || style;

  const prompt = `You are a world-class Flux/Stable Diffusion prompt engineer creating stunning visuals.

Write a detailed English prompt for FLUX.1-schnell image model.
Radio show: "${title}"
Context: ${description || 'French community radio show, multicultural, Grand-Charmont France'}
Style: ${styleDesc}

STRICT RULES — violating these ruins the image:
- Zero text, zero letters, zero numbers, zero signs anywhere in image
- No watermarks, no overlays, no UI elements
- Be hyper-specific: describe exact scene, subjects, lighting, camera angle, mood
- Use Flux-optimized keywords: photorealistic, hyperdetailed, professional photography, award-winning
- 60-90 words maximum
- Output ONLY the raw prompt, no quotes, no explanation, no prefix`;

  const result = await generate(prompt, true);
  // Nettoyer la réponse (supprimer guillemets, préfixes éventuels)
  return result
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^(prompt:|here is|here's|result:)/i, '')
    .trim();
}

module.exports = {
  generate, chat,
  summarizeTranscript, generateSocialPosts,
  analyzeNewsArticles, analyzeAudienceData,
  generateChatbotResponse, generateImagePrompt
};
