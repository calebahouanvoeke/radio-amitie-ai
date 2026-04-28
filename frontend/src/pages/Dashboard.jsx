import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic2, Share2, Newspaper, BarChart3, Bot, ImagePlus,
  ArrowUpRight, Music2, Radio, Wifi
} from 'lucide-react'
import { useApi } from '../hooks/useApi.js'

const MODULES = [
  {
    to: '/transcription',
    Icon: Mic2,
    label: 'Transcription',
    desc: 'Audio vers texte + résumés',
    accent: '#18181b',
    tag: 'IA'
  },
  {
    to: '/publisher',
    Icon: Share2,
    label: 'Publisher',
    desc: 'Publier sur tous les réseaux',
    accent: '#18181b',
    tag: 'Social'
  },
  {
    to: '/veille',
    Icon: Newspaper,
    label: 'Veille locale',
    desc: 'Actualités en temps réel',
    accent: '#18181b',
    tag: 'RSS'
  },
  {
    to: '/audience',
    Icon: BarChart3,
    label: 'Audience',
    desc: 'Stats et recommandations',
    accent: '#18181b',
    tag: 'RadioKing'
  },
  {
    to: '/chatbot',
    Icon: Bot,
    label: 'Chatbot IA',
    desc: 'Répond aux auditeurs',
    accent: '#18181b',
    tag: 'IA'
  },
  {
    to: '/visuals',
    Icon: ImagePlus,
    label: 'Visuels IA',
    desc: 'Affiches et bannières',
    accent: '#18181b',
    tag: 'Génératif'
  },
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

      {/* En-tête sobre */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-zinc-400 mt-1">Centre d'automatisation IA — Radio Amitié 99.2 FM</p>
          </div>
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
            health
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-zinc-200 bg-zinc-50 text-zinc-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
            {health ? 'Serveur actif' : 'Connexion…'}
          </div>
        </div>
      </div>

      {/* Titre en cours — carte horizontale épurée */}
      {track?.title && (
        <div className="mb-8 p-4 rounded-xl border border-zinc-100 bg-zinc-50 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-200">
              {track.cover_url
                ? <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-zinc-400" /></div>
              }
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-0.5">En diffusion</p>
            <p className="text-sm font-semibold text-zinc-900 truncate">{track.title}</p>
            {track.artist && <p className="text-xs text-zinc-400 truncate">{track.artist}</p>}
          </div>
          <Radio className="w-4 h-4 text-zinc-300 flex-shrink-0" />
        </div>
      )}

      {/* Grille modules */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Modules</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map(({ to, Icon, label, desc, tag }) => (
          <Link key={to} to={to}
            className="group relative p-5 rounded-xl border border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-sm transition-all duration-200">

            <div className="flex items-start justify-between mb-6">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                <Icon className="w-4 h-4 text-zinc-700" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-900 mb-1">{label}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
            </div>

            <span className="absolute bottom-4 right-4 text-[10px] text-zinc-300 font-medium">{tag}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}