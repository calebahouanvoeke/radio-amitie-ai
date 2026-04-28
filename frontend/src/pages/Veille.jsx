import { useState, useEffect } from 'react'
import { Newspaper, RefreshCw, Lightbulb, Settings, ExternalLink, Trash2, Trash, X, CheckCheck, Clock, TrendingUp } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, EmptyState, PageHeader } from '../components/UI.jsx'

/* ── Helpers ──────────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

function SourceBadge({ source }) {
  const colors = {
    'Google News': 'bg-blue-50 text-blue-600 border-blue-100',
    'France Info':  'bg-sky-50  text-sky-600  border-sky-100',
    'Le Monde':     'bg-rose-50 text-rose-600 border-rose-100',
    'Est Républicain': 'bg-amber-50 text-amber-700 border-amber-100',
    'France Bleu Besançon': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  }
  const base = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border'
  const src = Object.keys(colors).find(k => source?.includes(k)) || '__'
  const cls = colors[src] || 'bg-zinc-50 text-zinc-500 border-zinc-100'
  return <span className={`${base} ${cls}`}>{source}</span>
}

function RelevanceDot({ score }) {
  if (!score || score <= 60) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
      <TrendingUp className="w-2.5 h-2.5" /> Pertinent
    </span>
  )
}

/* ── Idea Panel ───────────────────────────────────────────── */
function IdeaPanel({ idea, onClose }) {
  if (!idea) return (
    <div className="card h-full flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
        <Lightbulb className="w-6 h-6 text-amber-300" />
      </div>
      <p className="text-sm font-medium text-zinc-500">Idée d'émission</p>
      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
        Cliquez sur « Idée d'émission » sur un article pour générer une proposition éditoriale
      </p>
    </div>
  )

  return (
    <div className="card-p fade-in sticky top-6 border-l-2 border-amber-400">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-sm font-semibold text-zinc-800">Proposition éditoriale</span>
        </div>
        <button onClick={onClose} className="btn-icon text-zinc-300 hover:text-zinc-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed line-clamp-2 italic">
        « {idea.article_title} »
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Titre d'émission</p>
          <p className="text-sm font-bold text-zinc-900 leading-snug">{idea.emission_title}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Angle éditorial</p>
          <p className="text-sm text-zinc-600 leading-relaxed">{idea.angle}</p>
        </div>

        {Array.isArray(idea.questions) && idea.questions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Questions clés</p>
            <ol className="space-y-2">
              {idea.questions.map((q, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-zinc-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Invité idéal</p>
          <p className="text-sm text-zinc-600 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100">
            {idea.ideal_guest}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Article Card ─────────────────────────────────────────── */
function ArticleCard({ article: a, onIdea, onDelete, ideaLoading }) {
  return (
    <div className={`group px-4 py-3.5 transition-colors hover:bg-zinc-50/80 ${a.is_read ? 'opacity-55' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div className="flex-shrink-0 mt-1.5">
          {!a.is_read
            ? <span className="block w-1.5 h-1.5 rounded-full bg-blue-500" />
            : <span className="block w-1.5 h-1.5 rounded-full bg-transparent" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-medium text-zinc-800 leading-snug mb-1.5">{a.title}</p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <SourceBadge source={a.source} />
            <RelevanceDot score={a.relevance_score} />
            {a.published_at && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                <Clock className="w-2.5 h-2.5" />
                {relativeTime(a.published_at)}
              </span>
            )}
          </div>

          {/* Inline idea preview */}
          {a.emission_idea && typeof a.emission_idea === 'string' && !a.emission_idea.startsWith('{') && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg mb-2">
              {a.emission_idea}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onIdea(a)}
              disabled={ideaLoading === a.id}
              className="btn-ghost btn-sm text-zinc-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              {ideaLoading === a.id
                ? <Spinner className="text-zinc-400" />
                : <Lightbulb className="w-3.5 h-3.5" />
              }
              <span>Idée d'émission</span>
            </button>

            {a.link && (
              <a href={a.link} target="_blank" rel="noreferrer"
                className="btn-ghost btn-sm text-zinc-400 hover:text-blue-600 transition-colors">
                <ExternalLink className="w-3 h-3" />
                <span>Lire</span>
              </a>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={e => onDelete(a.id, e)}
          className="btn-icon opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────── */
export default function Veille() {
  const [articles,  setArticles]  = useState([])
  const [summary,   setSummary]   = useState('')
  const [idea,      setIdea]      = useState(null)
  const [keywords,  setKeywords]  = useState('')
  const [showCfg,   setShowCfg]   = useState(false)
  const [kwDraft,   setKwDraft]   = useState('')
  const [ok,        setOk]        = useState('')
  const [ideaLoad,  setIdeaLoad]  = useState(null)
  const [filter,    setFilter]    = useState('all') // 'all' | 'unread'
  const { get, post, put, del, loading, error, setError } = useApi()

  useEffect(() => {
    get('/veille').then(d => setArticles(d.articles || [])).catch(() => {})
    get('/veille/config').then(d => {
      setKeywords(d.keywords || '')
      setKwDraft(d.keywords || '')
    }).catch(() => {})
  }, [])

  const unreadCount = articles.filter(a => !a.is_read).length
  const displayed   = filter === 'unread' ? articles.filter(a => !a.is_read) : articles

  async function refresh() {
    const res = await post('/veille/refresh').catch(() => null)
    if (res) {
      setSummary(res.daily_summary || '')
      setArticles(res.articles || [])
      setOk(`✓ ${res.new_articles} nouveaux articles — ${res.total || 0} collectés au total`)
    }
  }

  async function saveKeywords() {
    await put('/veille/config', { keywords: kwDraft })
    setKeywords(kwDraft)
    setShowCfg(false)
    setOk('✓ Mots-clés enregistrés')
  }

  async function generateIdea(article) {
    setIdeaLoad(article.id)
    setIdea(null)
    const res = await post(`/veille/${article.id}/idea`).catch(() => null)
    setIdeaLoad(null)
    if (res) setIdea({ ...res, article_title: article.title })
  }

  async function deleteArticle(id, e) {
    e.stopPropagation()
    await del(`/veille/${id}`).catch(() => null)
    setArticles(prev => prev.filter(a => a.id !== id))
    if (idea?.article_id === id) setIdea(null)
  }

  async function clearAll() {
    if (!confirm('Vider tout l\'historique des articles ?')) return
    await del('/veille').catch(() => null)
    setArticles([])
    setSummary('')
    setIdea(null)
    setOk('Historique vidé')
  }

  return (
    <div className="page fade-in">
      {/* ── Header ── */}
      <PageHeader title="Veille locale" subtitle="Surveillance automatique de l'actualité locale">
        <button onClick={() => setShowCfg(s => !s)}
          className={`btn-outline btn-sm ${showCfg ? 'border-zinc-400 bg-zinc-50' : ''}`}>
          <Settings className="w-3.5 h-3.5" />
          Mots-clés
        </button>
        {articles.length > 0 && (
          <button onClick={clearAll} className="btn-outline btn-sm text-red-500 hover:border-red-300">
            <Trash className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={refresh} disabled={loading} className="btn-primary btn-sm">
          {loading
            ? <><Spinner className="text-white" /> Actualisation…</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Actualiser</>
          }
        </button>
      </PageHeader>

      {/* ── Alerts ── */}
      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      {/* ── Keywords config ── */}
      {showCfg && (
        <div className="card-p mb-5 fade-in border-l-2 border-zinc-300">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Mots-clés de surveillance</p>
              <p className="text-xs text-zinc-400 mt-0.5">Séparés par virgule — Google News recherchera ces termes</p>
            </div>
            <button onClick={() => setShowCfg(false)} className="btn-icon text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" value={kwDraft}
              onChange={e => setKwDraft(e.target.value)}
              placeholder="Grand-Charmont, Belfort, Nord-Franche-Comté…" />
            <button onClick={saveKeywords} className="btn-primary">Enregistrer</button>
          </div>
          {keywords && (
            <p className="text-xs text-zinc-400 mt-2">
              Actuel : <span className="text-zinc-600 font-medium">{keywords}</span>
            </p>
          )}
        </div>
      )}

      {/* ── Daily summary ── */}
      {summary && (
        <div className="card-p mb-5 border-l-2 border-emerald-400 fade-in">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Synthèse du jour</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Articles column ── */}
        <div className="lg:col-span-3">

          {/* Filter bar */}
          {articles.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
                {[
                  ['all',    `Tous (${articles.length})`],
                  ['unread', `Non lus${unreadCount > 0 ? ` · ${unreadCount}` : ''}`],
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                      filter === val
                        ? 'bg-white shadow-sm text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                Historique limité aux 40 derniers articles
              </p>
            </div>
          )}

          {/* Article list */}
          {displayed.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Newspaper}
                title={filter === 'unread' ? 'Tout est lu !' : 'Aucun article'}
                subtitle={filter === 'unread'
                  ? 'Tous les articles ont été consultés'
                  : 'Cliquez sur Actualiser pour charger les dernières actualités'}
                action={filter === 'all' && (
                  <button onClick={refresh} disabled={loading} className="btn-primary">
                    {loading ? <Spinner className="text-white" /> : 'Lancer la veille'}
                  </button>
                )}
              />
            </div>
          ) : (
            <div className="card divide-y divide-zinc-50">
              {displayed.map(a => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  onIdea={generateIdea}
                  onDelete={deleteArticle}
                  ideaLoading={ideaLoad}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Idea panel ── */}
        <div className="lg:col-span-2">
          <IdeaPanel idea={idea} onClose={() => setIdea(null)} />
        </div>
      </div>
    </div>
  )
}