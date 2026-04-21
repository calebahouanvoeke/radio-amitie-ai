import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic2, Share2, Newspaper, BarChart3, Bot, ImagePlus, ArrowRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'

const MODULES = [
  { to: '/transcription', Icon: Mic2,       label: 'Transcription',   desc: 'Audio vers texte + résumés automatiques'  },
  { to: '/social',        Icon: Share2,      label: 'Réseaux sociaux', desc: 'Générer et publier sur toutes les plateformes' },
  { to: '/veille',        Icon: Newspaper,   label: 'Veille locale',   desc: 'Actualités Nord-Franche-Comté en temps réel'  },
  { to: '/audience',      Icon: BarChart3,   label: 'Audience',        desc: 'Statistiques et recommandations RadioKing'     },
  { to: '/chatbot',       Icon: Bot,         label: 'Chatbot IA',      desc: 'Répond aux auditeurs avec recherche web'       },
  { to: '/visuals',       Icon: ImagePlus,   label: 'Visuels IA',      desc: 'Affiches et bannières par intelligence artificielle' },
]

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [track,  setTrack]  = useState(null)
  const { get } = useApi()

  useEffect(() => {
    get('/health').then(setHealth).catch(() => {})
    get('/audience/live').then(setTrack).catch(() => {})
  }, [])

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Centre d'automatisation IA de Radio Amitié 99.2 FM</p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${health ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}>
          <span className={health ? 'live-dot' : 'w-2 h-2 rounded-full bg-zinc-300'} />
          {health ? 'Serveur actif' : 'Connexion…'}
        </div>
      </div>

      {/* Titre en cours */}
      {track?.title && (
        <div className="card p-4 mb-8 flex items-center gap-3 fade-in">
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
            {track.cover_url
              ? <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl">🎵</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="live-dot" />
              <span className="text-xs text-emerald-600 font-medium">En diffusion maintenant</span>
            </div>
            <div className="text-sm font-semibold text-zinc-900 truncate">{track.title}</div>
            {track.artist && <div className="text-xs text-zinc-400">{track.artist}</div>}
          </div>
        </div>
      )}

      {/* Modules */}
      <p className="section-label">Modules disponibles</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map(({ to, Icon, label, desc }) => (
          <Link key={to} to={to}
            className="card-hover p-5 flex flex-col gap-3 group fade-in">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                <Icon className="w-4 h-4 text-zinc-700" />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 mb-1">{label}</div>
              <div className="text-xs text-zinc-400 leading-relaxed">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
