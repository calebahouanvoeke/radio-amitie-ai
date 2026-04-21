import { useState, useEffect, useRef } from 'react'
import {
  Send, Calendar, Clock, ImagePlus, Video, Type,
  Facebook, Twitter, Linkedin, Instagram, Trash2,
  CheckCircle2, AlertCircle, Timer, Sparkles, Copy, Check, Plug
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, EmptyState, PageHeader, FormField } from '../components/UI.jsx'

// ── Icônes plateforme ─────────────────────────────────────
const PLATFORM_ICONS = { facebook: Facebook, instagram: Instagram, twitter: Twitter, linkedin: Linkedin }
const PLATFORM_META  = {
  facebook:  { label: 'Facebook',   color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  instagram: { label: 'Instagram',  color: 'text-pink-600',  bg: 'bg-pink-50',  border: 'border-pink-200' },
  twitter:   { label: 'X/Twitter',  color: 'text-sky-500',   bg: 'bg-sky-50',   border: 'border-sky-200'  },
  linkedin:  { label: 'LinkedIn',   color: 'text-blue-800',  bg: 'bg-blue-50',  border: 'border-blue-200' },
}

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: 'text-pink-600',  bg: 'bg-pink-50',  border: 'border-pink-200'  },
  { key: 'twitter',   label: 'X/Twitter', Icon: Twitter,   color: 'text-sky-500',   bg: 'bg-sky-50',   border: 'border-sky-200'   },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,  color: 'text-blue-800',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
]

const CONTENT_TYPES = [
  { key: 'text',  label: 'Texte',       Icon: Type      },
  { key: 'image', label: 'Texte + Image', Icon: ImagePlus },
  { key: 'video', label: 'Vidéo',       Icon: Video     },
]

function PlatformBadge({ platform, success, error, note }) {
  const p = PLATFORMS.find(x => x.key === platform)
  if (!p) return null
  const { Icon, label, color } = p
  return (
    <div className={`flex items-center gap-1.5 text-xs ${success ? 'text-emerald-600' : error ? 'text-red-500' : 'text-zinc-400'}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {success && <CheckCircle2 className="w-3 h-3" />}
      {error   && <AlertCircle  className="w-3 h-3" />}
      {note    && <span className="text-zinc-300">— manuel</span>}
    </div>
  )
}

function CopyTextBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="btn-ghost btn-sm text-xs">
      {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
    </button>
  )
}

function QueueItem({ post, onDelete, onPublishNow }) {
  const p  = PLATFORMS.filter(x => post.platforms.includes(x.key))
  const st = post.status
  return (
    <div className="px-4 py-3.5 hover:bg-zinc-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Type */}
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          {post.content_type === 'image' ? <ImagePlus className="w-4 h-4 text-zinc-400" />
          : post.content_type === 'video' ? <Video className="w-4 h-4 text-zinc-400" />
          : <Type className="w-4 h-4 text-zinc-400" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Texte */}
          <p className="text-sm text-zinc-700 line-clamp-2 mb-1.5">
            {post.content_text || <span className="text-zinc-300 italic">Visuel uniquement</span>}
          </p>

          {/* Plateformes */}
          <div className="flex flex-wrap gap-2 mb-1.5">
            {p.map(({ key, label, Icon, color }) => (
              <span key={key} className={`flex items-center gap-1 text-xs ${color}`}>
                <Icon className="w-3 h-3" /> {label}
              </span>
            ))}
          </div>

          {/* Statut & date */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {st === 'pending' && post.scheduled_at && (
              <span className="flex items-center gap-1 text-amber-600">
                <Timer className="w-3 h-3" />
                Programmé — {new Date(post.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {st === 'published' && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Publié</span>}
            {st === 'failed'    && <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" /> Échec</span>}
            {st === 'ready'     && <span className="text-zinc-400">Prêt</span>}
          </div>

          {/* Résultats par plateforme */}
          {post.results && Object.keys(post.results).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {Object.entries(post.results).map(([plat, r]) => (
                <PlatformBadge key={plat} platform={plat} success={r.success} error={r.error} note={r.note} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {(st === 'pending' || st === 'ready') && (
            <button onClick={() => onPublishNow(post.id)} className="btn-outline btn-sm text-xs">
              Publier
            </button>
          )}
          <button onClick={() => onDelete(post.id)} className="btn-icon hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Publisher() {
  const [posts,         setPosts]         = useState([])
  const [connections,   setConnections]   = useState([])  // comptes OAuth connectés
  const [contentType,   setContentType]   = useState('text')
  const [selectedPlats, setSelectedPlats] = useState([])
  const [text,          setText]          = useState('')
  const [perPlatText,   setPerPlatText]   = useState({})
  const [usePerPlat,    setUsePerPlat]    = useState(false)
  const [scheduleMode,  setScheduleMode]  = useState(false)
  const [scheduledAt,   setScheduledAt]   = useState('')
  const [imageFile,     setImageFile]     = useState(null)
  const [videoFile,     setVideoFile]     = useState(null)
  const [imagePreview,  setImagePreview]  = useState(null)
  const [aiForm,        setAiForm]        = useState({ title: '', description: '', guests: '', topics: '' })
  const [showAi,        setShowAi]        = useState(false)
  const [tab,           setTab]           = useState('compose')  // compose | queue
  const [ok,            setOk]            = useState('')
  const imgRef = useRef(); const vidRef = useRef()
  const { get, post, del, loading, error, setError } = useApi()

  useEffect(() => {
    loadQueue()
    loadConnections()
  }, [])

  async function loadQueue() {
    const d = await get('/publisher').catch(() => ({ posts: [] }))
    setPosts(d.posts || [])
  }

  async function loadConnections() {
    const d = await get('/oauth/connections').catch(() => ({ connections: [] }))
    const conns = d.connections || []
    setConnections(conns)
    // Auto-sélectionner toutes les plateformes connectées
    const platforms = [...new Set(conns.filter(c => c.is_active).map(c => c.platform))]
    setSelectedPlats(platforms)
  }

  function togglePlatform(key) {
    setSelectedPlats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function handleImage(e) {
    const f = e.target.files[0]; if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  async function generateAiTexts() {
    if (!aiForm.title) return setError('Titre requis pour la génération IA')
    const res = await post('/publisher/generate-ai', {
      ...aiForm,
      platforms: selectedPlats
    }).catch(() => null)
    if (res) {
      if (usePerPlat) setPerPlatText(res)
      else setText(res.facebook || res.instagram || Object.values(res)[0] || '')
      setShowAi(false)
      setOk('Textes générés par l\'IA !')
    }
  }

  async function publish(e) {
    e.preventDefault()
    if (selectedPlats.length === 0) return setError('Sélectionnez au moins une plateforme')
    if (!text.trim() && !imageFile && !videoFile) return setError('Ajoutez du contenu (texte, image ou vidéo)')

    const form = new FormData()
    form.append('content_text',  usePerPlat ? JSON.stringify(perPlatText) : text)
    form.append('platforms',     JSON.stringify(selectedPlats))
    form.append('content_type',  contentType)
    if (scheduleMode && scheduledAt) form.append('scheduled_at', scheduledAt)
    if (imageFile) form.append('image', imageFile)
    if (videoFile) form.append('video', videoFile)

    const res = await post('/publisher/create', form, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => null)
    if (res) {
      setOk(scheduleMode ? `Publication programmée pour le ${new Date(scheduledAt).toLocaleString('fr-FR')}` : 'Publication envoyée !')
      setText(''); setImageFile(null); setImagePreview(null); setVideoFile(null)
      if (imgRef.current) imgRef.current.value = ''
      if (vidRef.current) vidRef.current.value = ''
      setScheduleMode(false); setScheduledAt('')
      loadQueue()
      setTab('queue')
    }
  }

  async function publishNow(id) {
    const res = await post(`/publisher/${id}/publish`).catch(() => null)
    if (res) { setOk('Publication envoyée !'); loadQueue() }
  }

  async function remove(id) {
    await del(`/publisher/${id}`)
    setPosts(p => p.filter(x => x.id !== id))
  }

  const pending   = posts.filter(p => p.status === 'pending' || p.status === 'ready')
  const published = posts.filter(p => p.status === 'published' || p.status === 'failed')

  return (
    <div className="page fade-in">
      <PageHeader title="Publisher" subtitle="Publiez sur tous vos réseaux sociaux simultanément — comme Buffer">
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
          {[['compose','Composer'],['queue','File d\'attente']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all ${tab===t?'bg-white shadow-sm text-zinc-900 font-medium':'text-zinc-500 hover:text-zinc-700'}`}>
              {l} {t === 'queue' && pending.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] rounded-full px-1.5">{pending.length}</span>}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compositeur — 2/3 */}
          <div className="lg:col-span-2 space-y-4">

            {/* Sélection comptes connectés */}
            <div className="card-p">
              <div className="flex items-center justify-between mb-3">
                <p className="label mb-0">Publier sur</p>
                <Link to="/connections" className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
                  <Plug className="w-3 h-3" /> Gérer les connexions
                </Link>
              </div>

              {connections.filter(c => c.is_active).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-400 mb-2">Aucun réseau social connecté</p>
                  <Link to="/connections" className="btn-primary btn-sm">
                    <Plug className="w-3.5 h-3.5" /> Connecter mes réseaux
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Grouper par plateforme */}
                  {Object.entries(
                    connections.filter(c => c.is_active).reduce((acc, c) => {
                      if (!acc[c.platform]) acc[c.platform] = []
                      acc[c.platform].push(c)
                      return acc
                    }, {})
                  ).map(([platform, conns]) => {
                    const meta  = PLATFORM_META[platform] || { label: platform, color: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-200' }
                    const Icon  = PLATFORM_ICONS[platform]
                    const active = selectedPlats.includes(platform)
                    return (
                      <button key={platform} type="button"
                        onClick={() => setSelectedPlats(prev => active ? prev.filter(k => k !== platform) : [...prev, platform])}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${active ? `${meta.bg} ${meta.border}` : 'border-zinc-100 hover:border-zinc-200'}`}>
                        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${active ? meta.color : 'text-zinc-300'}`} />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${active ? meta.color : 'text-zinc-400'}`}>{meta.label}</p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {conns.map(c => c.page_name || c.account_name).join(', ')}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? `${meta.bg} ${meta.border}` : 'border-zinc-200'}`}>
                          {active && <Check className={`w-2.5 h-2.5 ${meta.color}`} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Type de contenu */}
            <div className="card-p">
              <p className="label mb-3">Type de contenu</p>
              <div className="flex gap-2">
                {CONTENT_TYPES.map(({ key, label, Icon }) => (
                  <button key={key} type="button" onClick={() => setContentType(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${contentType===key?'bg-zinc-900 border-zinc-900 text-white':'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Éditeur de contenu */}
            <div className="card-p space-y-4">
              <div className="flex items-center justify-between">
                <p className="label mb-0">Contenu</p>
                <div className="flex gap-2">
                  <button onClick={() => setUsePerPlat(s => !s)} className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${usePerPlat?'bg-zinc-900 border-zinc-900 text-white':'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    Texte par plateforme
                  </button>
                  <button onClick={() => setShowAi(s => !s)} className="btn-outline btn-sm text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Générer avec l'IA
                  </button>
                </div>
              </div>

              {/* Génération IA */}
              {showAi && (
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 space-y-3 fade-in">
                  <p className="text-xs font-medium text-zinc-600">Générer les textes avec l'IA</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-sm" placeholder="Titre de l'émission *" value={aiForm.title} onChange={e => setAiForm(f => ({...f, title: e.target.value}))} />
                    <input className="input text-sm" placeholder="Description" value={aiForm.description} onChange={e => setAiForm(f => ({...f, description: e.target.value}))} />
                    <input className="input text-sm" placeholder="Invités" value={aiForm.guests} onChange={e => setAiForm(f => ({...f, guests: e.target.value}))} />
                    <input className="input text-sm" placeholder="Sujets abordés" value={aiForm.topics} onChange={e => setAiForm(f => ({...f, topics: e.target.value}))} />
                  </div>
                  <button onClick={generateAiTexts} disabled={loading} className="btn-primary btn-sm">
                    {loading ? <Spinner className="text-white" /> : <Sparkles className="w-3.5 h-3.5" />} Générer
                  </button>
                </div>
              )}

              {/* Texte unique ou par plateforme */}
              {!usePerPlat ? (
                <div>
                  <textarea className="textarea" rows={6} value={text} onChange={e => setText(e.target.value)}
                    placeholder="Rédigez votre publication… ce texte sera envoyé sur toutes les plateformes sélectionnées." />
                  <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>{text.length} caractères</span>
                    {text.length > 280 && <span className="text-amber-500">⚠️ Trop long pour X/Twitter (280 max)</span>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {PLATFORMS.filter(p => selectedPlats.includes(p.key)).map(({ key, label, Icon, color }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}><Icon className="w-3.5 h-3.5" />{label}</span>
                        <CopyTextBtn text={perPlatText[key] || ''} />
                      </div>
                      <textarea className="textarea text-sm" rows={4}
                        value={perPlatText[key] || ''} onChange={e => setPerPlatText(t => ({...t, [key]: e.target.value}))}
                        placeholder={`Texte pour ${label}…`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Upload image */}
              {(contentType === 'image') && (
                <div>
                  <p className="label">Image</p>
                  <label className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${imagePreview ? 'border-zinc-300' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}>
                    {imagePreview
                      ? <img src={imagePreview} alt="preview" className="max-h-40 rounded-lg object-contain" />
                      : <><ImagePlus className="w-6 h-6 text-zinc-300" /><span className="text-sm text-zinc-400">Cliquez pour ajouter une image</span></>
                    }
                    <input ref={imgRef} type="file" className="hidden" accept="image/*" onChange={handleImage} />
                  </label>
                  {imageFile && <p className="text-xs text-zinc-400 mt-1">{imageFile.name} — {(imageFile.size/1024).toFixed(0)} Ko</p>}
                </div>
              )}

              {/* Upload vidéo */}
              {contentType === 'video' && (
                <div>
                  <p className="label">Vidéo</p>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:border-zinc-300 hover:bg-zinc-50">
                    <Video className="w-6 h-6 text-zinc-300" />
                    <span className="text-sm text-zinc-400">{videoFile ? videoFile.name : 'Cliquez pour ajouter une vidéo'}</span>
                    <input ref={vidRef} type="file" className="hidden" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                  </label>
                </div>
              )}
            </div>

            {/* Programmation */}
            <div className="card-p">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700">Programmation</p>
                </div>
                <button onClick={() => setScheduleMode(s => !s)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${scheduleMode?'bg-zinc-900 border-zinc-900 text-white':'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                  {scheduleMode ? 'Programmé' : 'Publier maintenant'}
                </button>
              </div>

              {scheduleMode ? (
                <div className="flex gap-3 items-center">
                  <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <input type="datetime-local" className="input flex-1"
                    value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0,16)} />
                </div>
              ) : (
                <p className="text-xs text-zinc-400">La publication sera envoyée immédiatement sur toutes les plateformes sélectionnées.</p>
              )}
            </div>

            {/* Bouton publier */}
            <button onClick={publish} disabled={loading || selectedPlats.length === 0}
              className="btn-primary w-full justify-center text-base py-3">
              {loading
                ? <><Spinner className="text-white" /> En cours…</>
                : scheduleMode
                  ? <><Calendar className="w-4 h-4" /> Programmer la publication</>
                  : <><Send className="w-4 h-4" /> Publier maintenant</>
              }
            </button>

            {/* Note Facebook uniquement */}
            <div className="card-p bg-amber-50 border-amber-100">
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Note :</strong> La publication automatique fonctionne sur <strong>Facebook</strong> (si <code>FACEBOOK_PAGE_TOKEN</code> configuré).
                Pour Instagram, X/Twitter et LinkedIn, les textes sont générés et vous pouvez les copier avec le bouton dédié.
                La publication multi-plateformes complète requiert des accès API approuvés par chaque réseau social.
              </p>
            </div>
          </div>

          {/* Aperçu — 1/3 */}
          <div>
            <p className="section-label">Aperçu</p>
            <div className="space-y-3">
              {PLATFORMS.filter(p => selectedPlats.includes(p.key)).map(({ key, label, Icon, color, bg, border }) => {
                const txt = usePerPlat ? (perPlatText[key] || '') : text
                return (
                  <div key={key} className={`card p-4 border ${border}`}>
                    <div className={`flex items-center gap-2 mb-2 ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-semibold">{label}</span>
                      <CopyTextBtn text={txt} />
                    </div>
                    {imagePreview && contentType === 'image' && (
                      <img src={imagePreview} alt="" className="w-full rounded-lg mb-2 aspect-video object-cover" />
                    )}
                    <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                      {txt || <span className="text-zinc-300 italic">Aucun texte</span>}
                    </p>
                    {key === 'twitter' && txt && (
                      <p className={`text-[10px] mt-1 ${txt.length > 280 ? 'text-red-500' : 'text-zinc-300'}`}>
                        {txt.length}/280
                      </p>
                    )}
                  </div>
                )
              })}
              {selectedPlats.length === 0 && (
                <div className="card p-6 text-center">
                  <p className="text-xs text-zinc-400">Sélectionnez des plateformes pour voir l'aperçu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* En attente */}
          <div>
            <p className="section-label">Programmées ({pending.length})</p>
            {pending.length === 0 ? (
              <div className="card"><EmptyState icon={Timer} title="Aucune publication programmée" subtitle="Composez et programmez une publication" /></div>
            ) : (
              <div className="card divide-y divide-zinc-50">
                {pending.map(p => <QueueItem key={p.id} post={p} onDelete={remove} onPublishNow={publishNow} />)}
              </div>
            )}
          </div>

          {/* Publiées */}
          <div>
            <p className="section-label">Historique ({published.length})</p>
            {published.length === 0 ? (
              <div className="card"><EmptyState icon={CheckCircle2} title="Aucune publication envoyée" subtitle="L'historique apparaîtra ici" /></div>
            ) : (
              <div className="card divide-y divide-zinc-50">
                {published.map(p => <QueueItem key={p.id} post={p} onDelete={remove} onPublishNow={publishNow} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
