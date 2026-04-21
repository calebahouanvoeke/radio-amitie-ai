import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Trash2, Mic2 } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, ResultBox, StatusBadge, Spinner, EmptyState, PageHeader, FormField } from '../components/UI.jsx'

export default function Transcription() {
  const [list,    setList]    = useState([])
  const [sel,     setSel]     = useState(null)
  const [file,    setFile]    = useState(null)
  const [title,   setTitle]   = useState('')
  const [mode,    setMode]    = useState('audio') // audio | text
  const [manualTxt, setManualTxt] = useState('')
  const [ok,      setOk]      = useState('')
  const fileRef               = useRef()
  const pollRef               = useRef()
  const { get, post, del, loading, error, setError } = useApi()

  useEffect(() => { load(); return () => clearInterval(pollRef.current) }, [])
  useEffect(() => {
    clearInterval(pollRef.current)
    if (list.some(t => t.status === 'processing'))
      pollRef.current = setInterval(load, 5000)
  }, [list])

  async function load() {
    const d = await get('/transcription').catch(() => ({ transcriptions: [] }))
    setList(d.transcriptions || [])
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return setError('Sélectionnez un fichier audio')
    const form = new FormData()
    form.append('audio', file)
    if (title) form.append('emission_title', title)
    const res = await post('/transcription/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => null)
    if (res) { setOk('Transcription lancée ! Résultat dans 1 à 5 minutes.'); setFile(null); setTitle(''); fileRef.current && (fileRef.current.value = ''); load() }
  }

  async function handleText(e) {
    e.preventDefault()
    if (!manualTxt.trim()) return setError('Saisissez du texte')
    const res = await post('/transcription/text', { text: manualTxt, emission_title: title }).catch(() => null)
    if (res) { setOk('Résumés générés !'); setSel(res); load() }
  }

  async function loadDetail(t) {
    const d = await get(`/transcription/${t.id}`).catch(() => t)
    setSel(d)
  }

  async function remove(id) {
    if (!confirm('Supprimer cette transcription ?')) return
    await del(`/transcription/${id}`)
    setList(l => l.filter(x => x.id !== id))
    if (sel?.id === id) setSel(null)
  }

  return (
    <div className="page fade-in">
      <PageHeader title="Transcription automatique" subtitle="Convertissez vos émissions en texte et générez des résumés">
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
          {[['audio','Fichier audio'],['text','Texte direct']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all ${mode===m?'bg-white shadow-sm text-zinc-900 font-medium':'text-zinc-500 hover:text-zinc-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}  onClose={() => setOk('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulaire — 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-p">
            <form onSubmit={mode === 'audio' ? handleUpload : handleText} className="space-y-4">
              <FormField label="Titre de l'émission">
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="La Matinale du lundi…" />
              </FormField>

              {mode === 'audio' ? (
                <FormField label="Fichier audio" required hint="MP3, WAV, M4A, OGG, FLAC — 150 Mo max">
                  <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-all">
                    <Upload className="w-6 h-6 text-zinc-300" />
                    <span className="text-sm text-zinc-500">{file ? file.name : 'Cliquez ou glissez un fichier'}</span>
                    <input ref={fileRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4"
                      onChange={e => setFile(e.target.files[0])} />
                  </label>
                </FormField>
              ) : (
                <FormField label="Texte de l'émission" required>
                  <textarea className="textarea" rows={8} value={manualTxt} onChange={e => setManualTxt(e.target.value)}
                    placeholder="Collez ici le texte pour générer un résumé…" />
                </FormField>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <><Spinner className="text-white" /> Traitement…</> : mode === 'audio' ? 'Transcrire' : 'Générer les résumés'}
              </button>
            </form>
          </div>

          {/* Détail */}
          {sel && (
            <div className="card-p space-y-1 fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-zinc-700 truncate">{sel.original_name}</span>
                <StatusBadge status={sel.status} />
              </div>
              {sel.status === 'done' ? (
                <>
                  <ResultBox label="Résumé (site web)"     value={sel.summary} rows={4} />
                  <ResultBox label="Publication Facebook"   value={sel.description_facebook} rows={3} />
                  <ResultBox label="Description SEO"        value={sel.description_web} rows={3} />
                  {sel.transcript && (
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                        Voir la transcription complète
                      </summary>
                      <div className="mt-2 result-box text-xs max-h-40 overflow-y-auto">{sel.transcript}</div>
                    </details>
                  )}
                </>
              ) : sel.status === 'processing' ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-4 justify-center">
                  <Spinner className="text-zinc-400" /> En cours… mise à jour automatique
                </div>
              ) : <Alert type="error" message={sel.summary} />}
            </div>
          )}
        </div>

        {/* Liste — 3/5 */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label mb-0">Historique</p>
            <button onClick={load} className="btn-ghost btn-sm"><span className="text-zinc-400">↻</span> Actualiser</button>
          </div>

          {list.length === 0 ? (
            <div className="card">
              <EmptyState icon={Mic2} title="Aucune transcription" subtitle="Uploadez votre première émission pour commencer" />
            </div>
          ) : (
            <div className="card divide-y divide-zinc-50">
              {list.map(t => (
                <div key={t.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${sel?.id === t.id ? 'bg-zinc-50' : ''}`}
                  onClick={() => loadDetail(t)}>
                  <FileText className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-800 font-medium truncate">{t.original_name}</div>
                    <div className="text-xs text-zinc-400">
                      {new Date(t.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                  <button onClick={e => { e.stopPropagation(); remove(t.id) }} className="btn-icon opacity-0 group-hover:opacity-100 hover:text-red-500">
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
