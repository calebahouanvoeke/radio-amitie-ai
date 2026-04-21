import { useState, useEffect } from 'react'
import { ImagePlus, Trash2, Download } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, EmptyState, PageHeader, FormField } from '../components/UI.jsx'

const STYLES = [
  { key: 'photorealistic modern', label: 'Photoréaliste moderne'   },
  { key: 'vintage radio poster',  label: 'Affiche radio vintage'   },
  { key: 'colorful multicultural', label: 'Multiculturel coloré'  },
  { key: 'minimalist flat',       label: 'Minimaliste épuré'       },
  { key: 'concert event poster',  label: 'Affiche événement'       },
  { key: 'news broadcast studio', label: 'Studio journalistique'   },
  { key: 'african music vibrant', label: 'Musique africaine vive'  },
  { key: 'community radio warm',  label: 'Radio communautaire'     },
]

export default function Visuals() {
  const [visuals,   setVisuals]   = useState([])
  const [generated, setGenerated] = useState(null)
  const [form,      setForm]      = useState({ emission_title: '', emission_description: '', style: 'photorealistic modern' })
  const [ok,        setOk]        = useState('')
  const { get, post, del, loading, error, setError } = useApi()

  useEffect(() => {
    get('/visuals').then(d => setVisuals(d.visuals || [])).catch(() => {})
  }, [])

  async function generate(e) {
    e.preventDefault()
    if (!form.emission_title) return setError('Titre de l\'émission requis')
    setGenerated(null)
    const res = await post('/visuals/generate', form).catch(() => null)
    if (res) {
      setGenerated(res)
      setOk('Visuel généré avec succès !')
      get('/visuals').then(d => setVisuals(d.visuals || [])).catch(() => {})
    }
  }

  async function remove(id) {
    await del(`/visuals/${id}`)
    setVisuals(v => v.filter(x => x.id !== id))
    if (generated?.id === id) setGenerated(null)
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="page fade-in">
      <PageHeader title="Visuels IA" subtitle="Générez des affiches et bannières haute qualité avec Flux (Pollinations.ai — 100% gratuit)" />

      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="space-y-4">
          <p className="section-label">Générer un visuel</p>
          <div className="card-p">
            <form onSubmit={generate} className="space-y-4">
              <FormField label="Titre de l'émission" required>
                <input className="input" value={form.emission_title} onChange={e => sf('emission_title', e.target.value)}
                  placeholder="Le Grand Mix du vendredi…" />
              </FormField>
              <FormField label="Description" hint="Plus la description est précise, meilleur sera le résultat.">
                <textarea className="textarea" rows={3} value={form.emission_description}
                  onChange={e => sf('emission_description', e.target.value)}
                  placeholder="Ambiance musicale, thème, couleurs souhaitées, artistes invités…" />
              </FormField>
              <FormField label="Style visuel">
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLES.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => sf('style', key)}
                      className={`text-xs py-2 px-3 rounded-lg border text-left transition-all ${form.style === key ? 'bg-zinc-900 border-zinc-900 text-white font-medium' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </FormField>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading
                  ? <><Spinner className="text-white" /> Génération Flux en cours (30–60s)…</>
                  : 'Générer le visuel'}
              </button>
            </form>
            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Propulsé par <strong>Pollinations.ai</strong> (modèle Flux) — 100% gratuit, sans clé API requise.
            </p>
          </div>

          {/* Résultat */}
          {generated?.image_url && (
            <div className="card overflow-hidden fade-in">
              <img src={generated.image_url} alt={generated.emission_title}
                className="w-full aspect-video object-cover" />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{generated.emission_title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">1280 × 720 px</p>
                </div>
                <a href={generated.image_url} download
                  className="btn-outline btn-sm">
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
              </div>
              {generated.prompt && (
                <details className="px-4 pb-4">
                  <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                    Voir le prompt utilisé
                  </summary>
                  <p className="text-xs text-zinc-500 mt-2 p-2.5 bg-zinc-50 rounded-lg leading-relaxed">{generated.prompt}</p>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Galerie */}
        <div>
          <p className="section-label">Galerie</p>
          {visuals.length === 0 ? (
            <div className="card">
              <EmptyState icon={ImagePlus} title="Aucun visuel" subtitle="Générez votre premier visuel d'émission" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visuals.map(v => (
                <div key={v.id} className="card overflow-hidden group">
                  <div className="relative aspect-video bg-zinc-100">
                    <img src={v.image_url} alt={v.emission_title}
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a href={v.image_url} download className="btn-outline btn-sm bg-white border-white">
                        <Download className="w-3 h-3" />
                      </a>
                      <button onClick={() => remove(v.id)} className="btn-danger btn-sm bg-white">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-zinc-700 truncate">{v.emission_title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(v.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
