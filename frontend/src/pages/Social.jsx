import { useState, useEffect } from 'react'
import { Share2, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, ResultBox, Spinner, EmptyState, PageHeader, FormField, CopyBtn } from '../components/UI.jsx'

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  color: 'text-blue-600',  bg: 'bg-blue-50'  },
  { key: 'instagram', label: 'Instagram', color: 'text-pink-600',  bg: 'bg-pink-50'  },
  { key: 'twitter',   label: 'X / Twitter', color: 'text-sky-600', bg: 'bg-sky-50'   },
  { key: 'linkedin',  label: 'LinkedIn',  color: 'text-blue-800',  bg: 'bg-blue-50'  },
]

export default function Social() {
  const [posts,  setPosts]  = useState([])
  const [result, setResult] = useState(null)
  const [texts,  setTexts]  = useState({})
  const [form,   setForm]   = useState({ emission_title: '', emission_description: '', date: '', guests: '', topics: '' })
  const [ok,     setOk]     = useState('')
  const { get, post, put, del, loading, error, setError } = useApi()

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    const d = await get('/social').catch(() => ({ posts: [] }))
    setPosts(d.posts || [])
  }

  async function generate(e) {
    e.preventDefault()
    if (!form.emission_title) return setError('Titre de l\'émission requis')
    setResult(null); setTexts({})
    const res = await post('/social/generate', {
      emission_title: form.emission_title,
      emission_description: form.emission_description,
      date: form.date,
      guests: form.guests,
      topics: form.topics,
    }).catch(() => null)
    if (res) {
      setResult(res)
      setTexts({ facebook: res.facebook||'', instagram: res.instagram||'', twitter: res.twitter||'', linkedin: res.linkedin||'' })
      loadPosts()
    }
  }

  async function publish(platforms) {
    if (!result?.id) return
    // Sauvegarder les modifications d'abord
    await put(`/social/${result.id}`, { facebook_text: texts.facebook, instagram_text: texts.instagram, twitter_text: texts.twitter, linkedin_text: texts.linkedin })
    const res = await post(`/social/${result.id}/publish`, { platforms }).catch(() => null)
    if (res) {
      const ok = Object.values(res.results || {}).filter(r => r.success).length
      setOk(`${ok} publication${ok > 1 ? 's' : ''} envoyée${ok > 1 ? 's' : ''} avec succès !`)
      loadPosts()
    }
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="page fade-in">
      <PageHeader title="Réseaux sociaux" subtitle="Générez et publiez sur toutes vos plateformes en un clic" />

      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="space-y-4">
          <p className="section-label">Créer une publication</p>
          <div className="card-p">
            <form onSubmit={generate} className="space-y-4">
              <FormField label="Titre de l'émission" required>
                <input className="input" value={form.emission_title} onChange={e => sf('emission_title', e.target.value)} placeholder="Le Grand Mix du vendredi…" />
              </FormField>
              <FormField label="Description">
                <textarea className="textarea" rows={3} value={form.emission_description} onChange={e => sf('emission_description', e.target.value)} placeholder="Thèmes abordés, ambiance…" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date de diffusion">
                  <input type="date" className="input" value={form.date} onChange={e => sf('date', e.target.value)} />
                </FormField>
                <FormField label="Invités (séparés par virgule)">
                  <input className="input" value={form.guests} onChange={e => sf('guests', e.target.value)} placeholder="Mohamed, Aissatou…" />
                </FormField>
              </div>
              <FormField label="Sujets abordés (séparés par virgule)">
                <input className="input" value={form.topics} onChange={e => sf('topics', e.target.value)} placeholder="musique africaine, culture…" />
              </FormField>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <><Spinner className="text-white" /> Génération…</> : 'Générer les publications'}
              </button>
            </form>
          </div>

          {/* Résultats */}
          {result && (
            <div className="card-p fade-in space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-800">Publications générées</span>
                <button onClick={() => publish(['facebook'])} className="btn-primary btn-sm">
                  Publier sur Facebook
                </button>
              </div>

              {PLATFORMS.map(({ key, label, color, bg }) => texts[key] !== undefined && (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
                    <div className="flex items-center gap-1">
                      {key === 'twitter' && <span className="text-xs text-zinc-400">{texts.twitter?.length||0}/280</span>}
                      <CopyBtn text={texts[key]} />
                    </div>
                  </div>
                  <textarea className="textarea text-xs" rows={key === 'twitter' ? 3 : 5}
                    value={texts[key]} onChange={e => setTexts(t => ({ ...t, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        <div>
          <p className="section-label">Historique</p>
          {posts.length === 0 ? (
            <div className="card">
              <EmptyState icon={Share2} title="Aucune publication" subtitle="Générez votre première publication" />
            </div>
          ) : (
            <div className="card divide-y divide-zinc-50">
              {posts.map(p => (
                <div key={p.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => { setResult(p); setTexts({ facebook: p.facebook_text||'', instagram: p.instagram_text||'', twitter: p.twitter_text||'', linkedin: p.linkedin_text||'' }) }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-800 truncate">{p.emission_title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5 truncate">{p.facebook_text?.slice(0, 60)}…</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {p.published_facebook ? <span className="badge badge-green text-[10px]"><CheckCircle2 className="w-2.5 h-2.5" /> FB</span> : <span className="badge badge-zinc text-[10px]">FB</span>}
                      <span className="text-xs text-zinc-300">{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); del(`/social/${p.id}`); setPosts(l => l.filter(x => x.id !== p.id)) }}
                    className="btn-icon hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
