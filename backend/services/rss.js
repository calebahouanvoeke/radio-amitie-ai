const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadioAmitie-Bot/2.0)' },
  customFields: { item: ['media:content', 'media:thumbnail'] }
});

/**
 * Sources RSS fiables en français — toujours actives
 */
const FIXED_SOURCES = [
  { name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml' },
  { name: 'France Info', url: 'https://www.francetvinfo.fr/titres.rss' },
  { name: 'France Bleu Besançon', url: 'https://www.francebleu.fr/rss/france-bleu-besancon.xml' },
  { name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/podcasts/chronique-afrique.xml' },
  { name: 'Actu.fr Belfort', url: 'https://actu.fr/bourgogne-franche-comte/belfort_90010/rss.xml' },
  { name: 'Est Républicain', url: 'https://www.estrepublicain.fr/arc/outboundfeeds/rss/' },
];

/**
 * Construit les URLs Google News pour chaque mot-clé
 */
function buildGoogleSources(keywords) {
  return keywords.map(kw => ({
    name: `Google News — ${kw}`,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(kw)}&hl=fr&gl=FR&ceid=FR:fr`,
    keyword: kw
  }));
}

/**
 * Récupère un flux RSS avec timeout et retry
 */
async function fetchFeed(source, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const feed = await parser.parseURL(source.url);
      return feed.items.slice(0, 10).map(item => ({
        id: require('crypto').createHash('md5').update((item.link || item.title || '') + source.name).digest('hex'),        title: (item.title || '').replace(/ [-–|].*$/, '').trim(),
        link: item.link || '',
        source: source.name,
        keyword: source.keyword || 'général',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.contentSnippet || item.content || item.summary || '',
      }));
    } catch (err) {
      if (i === retries) {
        console.warn(`⚠️  RSS inaccessible (${source.name}): ${err.message.slice(0, 60)}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return [];
}

/**
 * Récupère les articles depuis toutes les sources
 */
async function fetchNewsArticles(keywords) {
  const googleSources = buildGoogleSources(keywords);

  // Sources Google News en premier (ciblées), puis sources fixes
  const allSources = [...googleSources, ...FIXED_SOURCES];

  // Fetch en parallèle
  const results = await Promise.allSettled(allSources.map(src => fetchFeed(src)));

  const seen = new Set();
  const articles = [];

  results.forEach(r => {
    if (r.status === 'fulfilled') {
      r.value.forEach(a => {
        if (!a.title || a.title.length < 10) return;
        const key = a.title.toLowerCase().replace(/\s+/g, '').slice(0, 60);
        if (!seen.has(key)) {
          seen.add(key);
          articles.push(a);
        }
      });
    }
  });

  // Trier par date décroissante
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  console.log(`📰  ${articles.length} articles collectés (${keywords.join(', ')})`);
  return articles;
}

/**
 * Pré-filtre : score de pertinence basé sur les mots-clés dans le titre
 * Si aucun article ne matche les mots-clés, renvoie TOUS les articles des sources fixes
 */
function preFilter(articles, keywords) {
  const kws = keywords.map(k => k.toLowerCase().trim());

  const scored = articles.map(a => {
    const titleLow = a.title.toLowerCase();
    const score = kws.reduce((acc, k) => acc + (titleLow.includes(k) ? 2 : 0), 0)
      + (a.keyword !== 'général' ? 1 : 0); // bonus si vient d'une source Google News ciblée
    return { ...a, pre_score: score };
  });

  // Articles avec mots-clés trouvés
  const matched = scored.filter(a => a.pre_score > 0);

  if (matched.length >= 3) {
    return matched.sort((a, b) => b.pre_score - a.pre_score);
  }

  // Fallback : retourner tous les articles récents si aucun match
  console.log('⚠️  Peu de matches sur mots-clés, fallback sur tous les articles récents');
  return scored.sort((a, b) => b.pre_score - a.pre_score);
}

module.exports = { fetchNewsArticles, preFilter };
