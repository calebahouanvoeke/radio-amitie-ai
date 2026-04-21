import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Mic2, Share2, Newspaper, BarChart3, Bot, ImagePlus, Send, Plug } from 'lucide-react'
import PlayerBar    from './components/PlayerBar.jsx'
import { usePlayer } from './hooks/usePlayer.js'
import Dashboard     from './pages/Dashboard.jsx'
import Transcription from './pages/Transcription.jsx'
import Social        from './pages/Social.jsx'
import Veille        from './pages/Veille.jsx'
import Audience      from './pages/Audience.jsx'
import Chatbot       from './pages/Chatbot.jsx'
import Visuals       from './pages/Visuals.jsx'
import Publisher     from './pages/Publisher.jsx'
import Connections   from './pages/Connections.jsx'

const NAV = [
  { to: '/',              end: true, Icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/transcription',            Icon: Mic2,            label: 'Transcription'   },
  { to: '/social',                   Icon: Share2,          label: 'Réseaux sociaux' },
  { to: '/publisher',                Icon: Send,            label: 'Publisher'       },
  { to: '/connections',              Icon: Plug,            label: 'Connexions'      },
  { to: '/veille',                   Icon: Newspaper,       label: 'Veille locale'   },
  { to: '/audience',                 Icon: BarChart3,       label: 'Audience'        },
  { to: '/chatbot',                  Icon: Bot,             label: 'Chatbot'         },
  { to: '/visuals',                  Icon: ImagePlus,       label: 'Visuels IA'      },
]

export default function App() {
  const player = usePlayer()

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-xs font-bold tracking-tight flex-shrink-0">RA</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 leading-tight truncate">Radio Amitié</div>
            <div className="text-[11px] text-zinc-400 leading-tight">Centre IA · 99.2 FM</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <p className="section-label px-3 pt-1">Navigation</p>
          {NAV.map(({ to, end, Icon, label }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Statut serveur */}
        <div className="px-4 py-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-xs text-zinc-400">RadioKing · En direct</span>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main-content pb-20">
        <Routes>
          <Route path="/"              element={<Dashboard />}     />
          <Route path="/transcription" element={<Transcription />} />
          <Route path="/social"        element={<Social />}        />
          <Route path="/veille"        element={<Veille />}        />
          <Route path="/audience"      element={<Audience />}      />
          <Route path="/chatbot"       element={<Chatbot />}       />
          <Route path="/visuals"       element={<Visuals />}       />
          <Route path="/publisher"     element={<Publisher />}     />
          <Route path="/connections"   element={<Connections />}   />
        </Routes>
      </main>

      {/* Barre de lecture globale */}
      <PlayerBar
        playing={player.playing}
        loading={player.loading}
        track={player.track}
        onToggle={player.toggle}
      />
    </div>
  )
}
