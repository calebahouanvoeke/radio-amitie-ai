import { useState, useEffect } from 'react'
import { Newspaper, RefreshCw, Lightbulb, Settings, ExternalLink } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, EmptyState, PageHeader } from '../components/UI.jsx'

export default function Veille() {
  const [articles,  setArticles]  = useState([])
  const [summary,   setSummary]   = useState('')
  const [idea,      setIdea]      = useState(null)
  const [keywords,  setKeywords]  = useState('')
  const [showCfg,   setShowCfg]   = useState(false)
  const [kwDraft,   setKwDraft]   = useState('')
  const [ok,        setOk]        = useState('')
  const [ideaLoad,  setIdeaLoad]  = useState(null)
  const { get, post, put, loading, error, setError } = useApi()

  useEffect(() => {
    // Charger les articles ET les mots-clés depuis la DB
    get('/veille').then(d => setArticles(d.articles || [])).catch(() => {})
    get('/veille/config').then(d => { setKeywords(d.keywords || ''); setKwDraft(d.keywords || '') }).catch(() => {})
  }, [])

  async function refresh() {
    const res = await post('/veille/refresh').catch(() => null)
    if (res) {
      setSummary(res.daily_summary || '')
      setOk(`${res.new_articles} nouveaux articles détectés`)
      get('/veille').then(d => setArticles(d.articles || [])).catch(() => {})
    }
  }

  async function saveKeywords() {
    await put('/veille/config', { keywords: kwDraft })
    setKeywords(kwDraft)
    setShowCfg(false)
    setOk('Mots-clés enregistrés')
  }

  async function generateIdea(article) {
    setIdeaLoad(article.id); setIdea(null)
    const res = await post(`/veille/${article.id}/idea`).catch(() => null)
    setIdeaLoad(null)
    if (res) setIdea({ ...res, article_title: article.title })
  }

  return (
    <div className="page fade-in">
      <PageHeader title="Veille locale" subtitle="Surveillance automatique de l'actualité Nord-Franche-Comté">
        <button onClick={() => setShowCfg(s => !s)} className="btn-outline btn-sm">
          <Settings className="w-3.5 h-3.5" /> Mots-clés
        </button>
        <button onClick={refresh} disabled={loading} className="btn-primary btn-sm">
          {loading ? <><Spinner className="text-white" /> Actualisation…</> : <><RefreshCw className="w-3.5 h-3.5" /> Actualiser</>}
        </button>
      </PageHeader>

      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      {/* Config mots-clés */}
      {showCfg && (
        <div className="card-p mb-6 fade-in">
          <p className="text-sm font-medium text-zinc-700 mb-3">Mots-clés de surveillance</p>
          <p className="text-xs text-zinc-400 mb-3">Séparés par virgule. Ces mots-clés sont sauvegardés et persistent entre les sessions.</p>
          <div className="flex gap-2">
            <input className="input flex-1" value={kwDraft} onChange={e => setKwDraft(e.target.value)}
              placeholder="Grand-Charmont, Nord-Franche-Comté, Belfort…" />
            <button onClick={saveKeywords} className="btn-primary">Enregistrer</button>
            <button onClick={() => setShowCfg(false)} className="btn-outline">Annuler</button>
          </div>
          {keywords && <p className="text-xs text-zinc-400 mt-2">Actuellement : <span className="text-zinc-600">{keywords}</span></p>}
        </div>
      )}

      {/* Synthèse du jour */}
      {summary && (
        <div className="card-p mb-6 border-l-2 border-emerald-400 fade-in">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Synthèse éditoriale du jour</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Articles */}
        <div className="lg:col-span-3">
          {articles.length === 0 ? (
            <div className="card">
              <EmptyState icon={Newspaper} title="Aucun article" subtitle="Cliquez sur Actualiser pour charger les dernières actualités"
                action={<button onClick={refresh} disabled={loading} className="btn-primary">{loading ? <Spinner className="text-white" /> : 'Lancer la veille'}</button>} />
            </div>
          ) : (
            <div className="card divide-y divide-zinc-50">
              {articles.map(a => (
                <div key={a.id} className={`px-4 py-3.5 ${a.is_read ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 leading-snug">{a.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{a.source}</p>
                    </div>
                    {a.relevance_score > 60 && <span className="badge badge-green text-[10px] flex-shrink-0 mt-0.5">Pertinent</span>}
                  </div>
                  {a.emission_idea && typeof a.emission_idea === 'string' && !a.emission_idea.startsWith('{') && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded mb-2">{a.emission_idea}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => generateIdea(a)} disabled={ideaLoad === a.id}
                      className="btn-ghost btn-sm text-zinc-500">
                      {ideaLoad === a.id ? <Spinner className="text-zinc-400" /> : <Lightbulb className="w-3.5 h-3.5" />}
                      Idée d'émission
                    </button>
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="btn-ghost btn-sm text-zinc-400">
                        <ExternalLink className="w-3.5 h-3.5" /> Lire
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Idée générée */}
        <div className="lg:col-span-2">
          {idea ? (
            <div className="card-p fade-in sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-zinc-800">Idée d'émission</span>
              </div>
              <p className="text-xs text-zinc-400 mb-4 line-clamp-2">Source : {idea.article_title}</p>

              <div className="space-y-4">
                <div>
                  <p className="label">Titre de l'émission</p>
                  <p className="text-sm font-semibold text-zinc-900">{idea.emission_title}</p>
                </div>
                <div>
                  <p className="label">Angle éditorial</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{idea.angle}</p>
                </div>
                {Array.isArray(idea.questions) && idea.questions.length > 0 && (
                  <div>
                    <p className="label">Questions à poser</p>
                    <ol className="space-y-1.5">
                      {idea.questions.map((q, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-600">
                          <span className="text-zinc-300 font-mono flex-shrink-0">{i+1}.</span> {q}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div>
                  <p className="label">Invité idéal</p>
                  <p className="text-sm text-zinc-600">{idea.ideal_guest}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon={Lightbulb} title="Idée d'émission" subtitle="Cliquez sur « Idée d'émission » sur un article pour générer une idée" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
