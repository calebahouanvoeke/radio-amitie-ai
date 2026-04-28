import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Trash2, Trash, Mic2, Copy, Check, ChevronRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, PageHeader } from '../components/UI.jsx'

// ── Bouton copier ─────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
    >
      {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
    </button>
  )
}

// ── Badge statut ──────────────────────────────────────────
function StatusDot({ status }) {
  if (status === 'done') return <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Terminé</span>
  if (status === 'processing') return <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />En cours</span>
  if (status === 'error') return <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Erreur</span>
  return null
}

// ── Panneau résultats avec onglets ────────────────────────
const RESULT_TABS = [
  { key: 'summary',              label: 'Résumé web',   field: 'summary' },
  { key: 'description_facebook', label: 'Facebook',     field: 'description_facebook' },
  { key: 'description_web',      label: 'SEO',          field: 'description_web' },
  { key: 'transcript',           label: 'Transcription',field: 'transcript' },
]

function ResultPanel({ item, onClose }) {
  const [activeTab, setActiveTab] = useState('summary')
  if (!item) return null

  const activeField = RESULT_TABS.find(t => t.key === activeTab)?.field
  const content = item[activeField] || ''

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{item.original_name}</p>
          <div className="mt-1"><StatusDot status={item.status} /></div>
        </div>
      </div>

      {item.status === 'processing' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Transcription en cours…</p>
            <p className="text-xs text-zinc-300 mt-1">Mise à jour automatique</p>
          </div>
        </div>
      )}

      {item.status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-500">{item.summary}</p>
          </div>
        </div>
      )}

      {item.status === 'done' && (
        <>
          {/* Onglets */}
          <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg mb-4">
            {RESULT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-[11px] px-2 py-1.5 rounded-md transition-all font-medium ${
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                {RESULT_TABS.find(t => t.key === activeTab)?.label}
              </p>
              <CopyBtn text={content} />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {content || <span className="text-zinc-300 italic">Aucun contenu</span>}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────
export default function Transcription() {
  const [list,      setList]      = useState([])
  const [selected,  setSelected]  = useState(null)
  const [file,      setFile]      = useState(null)
  const [title,     setTitle]     = useState('')
  const [mode,      setMode]      = useState('audio')
  const [manualTxt, setManualTxt] = useState('')
  const [ok,        setOk]        = useState('')
  const fileRef = useRef()
  const pollRef = useRef()
  const { get, post, del, loading, error, setError } = useApi()

  useEffect(() => {
    load()
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    clearInterval(pollRef.current)
    if (list.some(t => t.status === 'processing'))
      pollRef.current = setInterval(load, 5000)
  }, [list])

  async function load() {
    const d = await get('/transcription').catch(() => ({ transcriptions: [] }))
    const items = d.transcriptions || []
    setList(items)
    // Mettre à jour l'item sélectionné si en cours
    if (selected) {
      const updated = items.find(t => t.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return setError('Sélectionnez un fichier audio')
    if (file.size > 25 * 1024 * 1024) {
      return setError(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum 25 Mo.`)
    }
    const form = new FormData()
    form.append('audio', file)
    if (title) form.append('emission_title', title)
    const res = await post('/transcription/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).catch(() => null)
    if (res) {
      setOk('Transcription lancée — résultat dans 1 à 3 minutes.')
      setFile(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      load()
    }
  }

  async function handleText(e) {
    e.preventDefault()
    if (!manualTxt.trim()) return setError('Saisissez du texte')
    const res = await post('/transcription/text', { text: manualTxt, emission_title: title }).catch(() => null)
    if (res) {
      setOk('Résumés générés !')
      load()
    }
  }

  async function loadDetail(item) {
    const d = await get(`/transcription/${item.id}`).catch(() => item)
    setSelected(d)
  }

  async function remove(id, e) {
    e?.stopPropagation()
    await del(`/transcription/${id}`)
    setList(l => l.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function clearAll() {
    if (!confirm('Vider tout l\'historique ?')) return
    for (const t of list) await del(`/transcription/${t.id}`).catch(() => null)
    setList([])
    setSelected(null)
    setOk('Historique vidé')
  }

  return (
    <div className="page fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Transcription</h1>
          <p className="text-sm text-zinc-400 mt-1">Audio vers texte et résumés automatiques</p>
        </div>
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
          {[['audio', 'Fichier audio'], ['text', 'Texte direct']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                mode === m ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok} onClose={() => setOk('')} />}

      {/* Layout 3 colonnes */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

        {/* Colonne 1 — Formulaire upload */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="rounded-xl border border-zinc-100 bg-white p-5 flex flex-col gap-4">

            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Titre de l'émission
              </label>
              <input
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300 text-zinc-900 placeholder:text-zinc-300"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="La Matinale du lundi…"
              />
            </div>

            {mode === 'audio' ? (
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                  Fichier audio <span className="text-red-400">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  file ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-zinc-600 font-medium">
                      {file ? file.name : 'Cliquez ou glissez'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {file ? `${(file.size / 1024 / 1024).toFixed(1)} Mo` : 'MP3, WAV, M4A — 25 Mo max'}
                    </p>
                  </div>
                  <input ref={fileRef} type="file" className="hidden"
                    accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4"
                    onChange={e => setFile(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                  Texte <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300 text-zinc-900 placeholder:text-zinc-300 resize-none"
                  rows={8}
                  value={manualTxt}
                  onChange={e => setManualTxt(e.target.value)}
                  placeholder="Collez votre texte ici…"
                />
              </div>
            )}

            <button
              onClick={mode === 'audio' ? handleUpload : handleText}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading
                ? <><Spinner className="text-white" /> Traitement…</>
                : mode === 'audio' ? <><Mic2 className="w-4 h-4" /> Transcrire</> : 'Générer les résumés'
              }
            </button>
          </div>
        </div>

        {/* Colonne 2 — Historique */}
        <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Historique ({list.length})
            </p>
            {list.length > 0 && (
              <div className="flex gap-2">
                <button onClick={clearAll}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash className="w-3 h-3" /> Vider
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-100 bg-white min-h-0">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                  <Mic2 className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-xs text-zinc-400">Aucune transcription</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {list.map(t => (
                  <div
                    key={t.id}
                    onClick={() => loadDetail(t)}
                    className={`group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                      selected?.id === t.id ? 'bg-zinc-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate">{t.original_name}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusDot status={t.status} />
                      <button
                        onClick={e => remove(t.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-3.5 h-3.5 transition-colors ${selected?.id === t.id ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne 3 — Résultats */}
        <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Résultats</p>
          <div className="flex-1 rounded-xl border border-zinc-100 bg-white p-5 min-h-0 flex flex-col">
            {selected ? (
              <ResultPanel item={selected} onClose={() => setSelected(null)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                  <FileText className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-sm text-zinc-400">Sélectionnez une transcription</p>
                <p className="text-xs text-zinc-300 mt-1">Les résultats s'afficheront ici</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}