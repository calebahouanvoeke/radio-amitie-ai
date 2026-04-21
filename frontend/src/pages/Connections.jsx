import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plug, Unplug, CheckCircle2, Facebook, Twitter,
  Linkedin, Instagram, RefreshCw, Plus, User,
  LayoutDashboard, AlertTriangle
} from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { Alert, PageHeader } from '../components/UI.jsx'

const PLATFORMS = {
  facebook: {
    label: 'Facebook',
    Icon: Facebook,
    color: '#1877F2',
    bg: '#EBF3FF',
    border: '#BDD7FF',
    connectUrl: '/api/oauth/connect/facebook',
    modeWarning: true,
  },
  instagram: {
    label: 'Instagram',
    Icon: Instagram,
    color: '#E1306C',
    bg: '#FDEEF4',
    border: '#F9BDD4',
    connectUrl: '/api/oauth/connect/facebook',
    autoConnected: true,
  },
  twitter: {
    label: 'X / Twitter',
    Icon: Twitter,
    color: '#000000',
    bg: '#F0F0F0',
    border: '#CCCCCC',
    connectUrl: '/api/oauth/connect/twitter',
  },
  linkedin: {
    label: 'LinkedIn',
    Icon: Linkedin,
    color: '#0A66C2',
    bg: '#EBF3FB',
    border: '#BDD5F0',
    connectUrl: '/api/oauth/connect/linkedin',
  },
}

function AccountRow({ conn, onDisconnect, platformMeta }) {
  const [confirming, setConfirming] = useState(false)
  const { Icon, color, bg } = platformMeta
  const isPage = conn.account_type === 'page'

  return (
    <div className="flex items-center gap-3 p-2.5 bg-zinc-50 rounded-lg">
      {conn.avatar_url ? (
        <img
          src={conn.avatar_url}
          alt=""
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}>
          <Icon size={15} color={color} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">
          {conn.page_name || conn.account_name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {isPage
            ? <LayoutDashboard size={10} className="text-zinc-400" />
            : <User size={10} className="text-zinc-400" />
          }
          <span className="text-[11px] text-zinc-400">
            {isPage ? 'Page' : 'Profil'}
          </span>
        </div>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn-icon hover:text-red-500 transition-colors"
          title="Déconnecter"
        >
          <Unplug size={13} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500">Déconnecter ?</span>
          <button
            onClick={() => { onDisconnect(conn.id); setConfirming(false) }}
            className="text-xs px-2 py-0.5 bg-red-500 text-white rounded cursor-pointer border-none"
          >
            Oui
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-2 py-0.5 border border-zinc-200 rounded cursor-pointer bg-white text-zinc-500"
          >
            Non
          </button>
        </div>
      )}
    </div>
  )
}

function PlatformCard({ platformKey, meta, connections, configured, oauthStatus, connecting, onConnect, onDisconnect }) {
  const { label, Icon, color, bg, border, connectUrl, modeWarning, autoConnected } = meta
  const active = connections.filter(c => c.platform === platformKey && c.is_active)
  const isConnecting = connecting === platformKey
  const showModeWarning = configured && modeWarning && oauthStatus[platformKey]?.mode === 'development'

  return (
    <div className="card overflow-hidden"
      style={{ borderColor: active.length ? border : undefined }}>

      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}>
          <Icon size={18} color={color} />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{label}</span>
          {active.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={9} />
              {active.length}
            </span>
          )}
          {showModeWarning && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle size={9} />
              Mode Dev
            </span>
          )}
        </div>

        {autoConnected ? (
          <span className="text-xs text-zinc-400 italic">Via Facebook</span>
        ) : configured ? (
          <button
            onClick={() => onConnect(platformKey, connectUrl)}
            disabled={isConnecting}
            className={`btn-sm flex items-center gap-1.5 ${active.length ? 'btn-outline' : 'btn-primary'}`}
            style={!active.length ? { background: color, borderColor: color } : {}}
          >
            {isConnecting
              ? <RefreshCw size={12} className="animate-spin" />
              : active.length
                ? <><Plus size={12} /> Ajouter</>
                : <><Plug size={12} /> Connecter</>
            }
          </button>
        ) : (
          <span className="text-xs text-zinc-400">Non configuré</span>
        )}
      </div>

      {showModeWarning && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-700">
            App en mode Développement — allez sur{' '}
            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
              className="underline font-medium">
              developers.facebook.com
            </a>
            {' '}et basculez en <strong>Live</strong>.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {active.map(conn => (
            <AccountRow
              key={conn.id}
              conn={conn}
              onDisconnect={onDisconnect}
              platformMeta={meta}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Connections() {
  const [searchParams] = useSearchParams()
  const [connections, setConnections] = useState([])
  const [oauthStatus, setOauthStatus] = useState({})
  const [connecting, setConnecting] = useState(null)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const { get, del } = useApi()

  const loadConnections = useCallback(async () => {
    const d = await get('/oauth/connections').catch(() => ({ connections: [] }))
    setConnections(d.connections || [])
  }, [get])

  const loadStatus = useCallback(async () => {
    const d = await get('/oauth/status').catch(() => ({}))
    setOauthStatus(d)
  }, [get])

  useEffect(() => {
    loadConnections()
    loadStatus()
  }, [loadConnections, loadStatus])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success) { setOk(success); loadConnections() }
    if (error) setErr(decodeURIComponent(error))
    if (success || error) window.history.replaceState({}, '', window.location.pathname)
  }, [searchParams, loadConnections])

  function handleConnect(platform, connectUrl) {
    setConnecting(platform)
    window.location.href = connectUrl
  }

  async function handleDisconnect(id) {
    await del(`/oauth/connections/${id}`)
    setConnections(prev => prev.map(c => c.id === id ? { ...c, is_active: 0 } : c))
    setOk('Compte déconnecté')
  }

  const totalConnected = connections.filter(c => c.is_active).length

  return (
    <div className="page fade-in">
      <PageHeader
        title="Connexions"
        subtitle={totalConnected
          ? `${totalConnected} compte${totalConnected > 1 ? 's' : ''} connecté${totalConnected > 1 ? 's' : ''}`
          : 'Connectez vos réseaux sociaux'
        }
      >
        <button onClick={() => { loadConnections(); loadStatus() }} className="btn-outline btn-sm">
          <RefreshCw size={13} /> Actualiser
        </button>
      </PageHeader>

      {err && <Alert type="error" message={err} onClose={() => setErr('')} />}
      {ok && <Alert type="success" message={ok} onClose={() => setOk('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(PLATFORMS).map(([key, meta]) => (
          <PlatformCard
            key={key}
            platformKey={key}
            meta={meta}
            connections={connections}
            configured={oauthStatus[key]?.configured ?? false}
            oauthStatus={oauthStatus}
            connecting={connecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>
    </div>
  )
}
