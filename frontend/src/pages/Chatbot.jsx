import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Globe, Clock } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, EmptyState, PageHeader } from '../components/UI.jsx'

function Bubble({ role, text, searchUsed, time }) {
  const isBot = role === 'bot' || role === 'assistant'
  return (
    <div className={`flex gap-2.5 ${isBot ? '' : 'flex-row-reverse'} fade-in`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[75%] ${isBot ? '' : 'items-end flex flex-col'}`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isBot
            ? 'bg-zinc-100 text-zinc-800 rounded-tl-sm'
            : 'bg-zinc-900 text-white rounded-tr-sm'
        }`}>
          {text}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${isBot ? '' : 'justify-end'}`}>
          {isBot && searchUsed && (
            <span className="flex items-center gap-1 text-[10px] text-blue-500">
              <Globe className="w-2.5 h-2.5" /> Recherche web
            </span>
          )}
          <span className="text-[10px] text-zinc-300">
            {new Date(time).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
          </span>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 fade-in">
      <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-zinc-100 px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center h-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i*0.15}s`, animationDuration: '0.8s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const QUICK = [
  'Quelle est la fréquence FM ?',
  'Comment écouter en ligne ?',
  'Comment faire une dédicace ?',
  'Qu\'est-ce que Radio Amitié ?',
]

export default function Chatbot() {
  const [messages,  setMessages]  = useState([
    { role: 'bot', text: 'Bonjour ! Je suis l\'assistant de Radio Amitié 99.2 FM. Je peux rechercher sur internet pour vous donner les informations les plus récentes. Comment puis-je vous aider ?', time: new Date().toISOString(), searchUsed: false }
  ])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const [history,  setHistory]  = useState([])
  const [sessionId] = useState(() => `web_${Date.now()}`)
  const bottomRef  = useRef()
  const { post, get, error, setError } = useApi()

  useEffect(() => {
    get('/chatbot').then(d => setHistory((d.conversations||[]).slice(0,20))).catch(()=>{})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send(e) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg, time: new Date().toISOString() }])
    setThinking(true)

    // Simuler un temps de réflexion court (UX)
    await new Promise(r => setTimeout(r, 300))

    try {
      const res = await post('/chatbot/message', { message: msg, session_id: sessionId })
      setMessages(m => [...m, { role: 'bot', text: res.response, time: new Date().toISOString(), searchUsed: res.search_used }])
      setHistory(h => [{ message: msg, response: res.response, created_at: new Date().toISOString() }, ...h.slice(0,19)])
    } catch (err) {
      setMessages(m => [...m, { role: 'bot', text: 'Une erreur est survenue. Veuillez réessayer.', time: new Date().toISOString() }])
    } finally { setThinking(false) }
  }

  return (
    <div className="page fade-in">
      <PageHeader title="Chatbot IA" subtitle="Assistant intelligent avec recherche web en temps réel" />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat — 2/3 */}
        <div className="lg:col-span-2 flex flex-col" style={{ height: '560px' }}>
          <div className="card flex flex-col flex-1 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => <Bubble key={i} {...m} />)}
              {thinking && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions rapides */}
            {messages.length <= 1 && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {QUICK.map(q => (
                  <button key={q} onClick={() => { setInput(q); setTimeout(send, 50) }}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-zinc-100 p-3">
              <form onSubmit={send} className="flex gap-2">
                <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Posez votre question…" disabled={thinking} />
                <button type="submit" disabled={thinking || !input.trim()} className="btn-primary px-3">
                  {thinking ? <span className="spin text-white" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
              <p className="text-[10px] text-zinc-300 mt-2 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Le chatbot recherche automatiquement sur internet si nécessaire
              </p>
            </div>
          </div>
        </div>

        {/* Historique — 1/3 */}
        <div>
          <p className="section-label">Conversations récentes</p>
          {history.length === 0 ? (
            <div className="card"><EmptyState icon={Bot} title="Aucune conversation" subtitle="Envoyez votre premier message" /></div>
          ) : (
            <div className="card divide-y divide-zinc-50 max-h-[480px] overflow-y-auto">
              {history.map((c, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-xs font-medium text-zinc-700 truncate">{c.message}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{c.response}</p>
                  <p className="text-[10px] text-zinc-300 mt-1">
                    {new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="card-p mt-4 border-l-2 border-amber-300">
            <p className="text-xs font-semibold text-zinc-600 mb-2">Intégration Messenger</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Configurez <code className="bg-zinc-100 px-1 py-0.5 rounded text-[10px]">FACEBOOK_PAGE_TOKEN</code> dans le fichier <code className="bg-zinc-100 px-1 py-0.5 rounded text-[10px]">.env</code> pour activer les réponses automatiques sur Messenger.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
