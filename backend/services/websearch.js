const fetch = require('node-fetch');

/**
 * Recherche web via DuckDuckGo Instant Answer API (100% gratuit, sans clé)
 */
async function duckDuckGoSearch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&skip_disambig=1&no_html=1`;

  const res = await fetch(url, { timeout: 8000, headers: { 'User-Agent': 'RadioAmitie-Bot/2.0' } });
  const data = await res.json();

  const results = [];

  // Réponse instantanée
  if (data.AbstractText) results.push({ type: 'abstract', text: data.AbstractText, source: data.AbstractSource });

  // Réponse directe
  if (data.Answer) results.push({ type: 'answer', text: data.Answer });

  // Résultats associés
  (data.RelatedTopics || []).slice(0, 5).forEach(t => {
    if (t.Text) results.push({ type: 'related', text: t.Text, url: t.FirstURL });
  });

  return results;
}

/**
 * Recherche Wikipedia en français (100% gratuit)
 */
async function wikipediaSearch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  try {
    const res = await fetch(url, { timeout: 6000 });
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title, extract: data.extract, url: data.content_urls?.desktop?.page };
  } catch { return null; }
}

/**
 * Recherche actualité locale via RSS Google News (gratuit)
 */
async function searchLocalNews(keywords) {
  const Parser = require('rss-parser');
  const parser = new Parser({ timeout: 8000 });
  const query = encodeURIComponent(keywords);
  const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;

  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 5).map(i => ({
      title: i.title?.replace(/ - .*$/, ''),
      link: i.link,
      pubDate: i.pubDate
    }));
  } catch { return []; }
}

/**
 * Fonction principale : recherche combinée pour le chatbot
 */
async function webSearch(query) {
  const results = [];

  try {
    const ddg = await duckDuckGoSearch(query);
    results.push(...ddg);
  } catch {}

  // Si peu de résultats, essayer Wikipedia
  if (results.length < 2) {
    const wiki = await wikipediaSearch(query);
    if (wiki?.extract) results.push({ type: 'wikipedia', text: wiki.extract.slice(0, 400), source: 'Wikipedia' });
  }

  // Formater en texte pour le LLM
  if (results.length === 0) return null;

  return results
    .slice(0, 4)
    .map(r => r.text)
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 800);
}

module.exports = { webSearch, duckDuckGoSearch, wikipediaSearch, searchLocalNews };
