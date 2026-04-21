/**
 * Connections.jsx — Gestion OAuth multi-comptes façon Buffer
 *
 * Principe :
 * - UNE seule app par réseau social (configurée une fois dans .env)
 * - N'importe quel compte/page peut se connecter via OAuth standard
 * - Les tokens sont stockés en base, pas dans .env
 * - Le .env ne change JAMAIS après la configuration initiale
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plug, Unplug, CheckCircle2, AlertCircle, Facebook,
  Twitter, Linkedin, Instagram, RefreshCw, Shield, Info,
  Plus, Trash2, ExternalLink, Lock, Globe, ChevronDown,
  ChevronUp, AlertTriangle
} from 'lucide-react'
import { useApi } from '../hooks/useApi.js'

// ── Config visuelle par plateforme ───────────────────────────────────────────
const PLATFORMS = {
  facebook: {
    label: 'Facebook',
    Icon: Facebook,
    color: '#1877F2',
    bg: '#EBF3FF',
    border: '#BDD7FF',
    textColor: '#0A4D9E',
    description: 'Pages Facebook, profils, groupes.',
    note: 'Connecter Facebook peut aussi lier automatiquement Instagram Business si associé à une page.',
    connectUrl: '/api/oauth/connect/facebook',
    docsUrl: 'https://developers.facebook.com',
    scopes: 'pages_manage_posts, pages_read_engagement, instagram_content_publish',
    modeWarning: true, // nécessite mode "Live" dans Facebook Developer
  },
  instagram: {
    label: 'Instagram',
    Icon: Instagram,
    color: '#E1306C',
    bg: '#FDEEF4',
    border: '#F9BDD4',
    textColor: '#8B0A38',
    description: 'Comptes Instagram Business liés à une Page Facebook.',
    note: 'Connecté automatiquement via Facebook. Nécessite un compte Instagram Business.',
    connectUrl: '/api/oauth/connect/facebook', // instagram se connecte via facebook
    docsUrl: null,
    scopes: 'instagram_basic, instagram_content_publish',
    autoConnected: true, // pas de bouton connecter direct
  },
  twitter: {
    label: 'X / Twitter',
    Icon: Twitter,
    color: '#000000',
    bg: '#F0F0F0',
    border: '#CCCCCC',
    textColor: '#111111',
    description: 'Profil personnel ou compte professionnel.',
    note: null,
    connectUrl: '/api/oauth/connect/twitter',
    docsUrl: 'https://developer.twitter.com',
    scopes: 'tweet.read, tweet.write, users.read',
    modeWarning: false,
  },
  linkedin: {
    label: 'LinkedIn',
    Icon: Linkedin,
    color: '#0A66C2',
    bg: '#EBF3FB',
    border: '#BDD5F0',
    textColor: '#064A90',
    description: 'Profil professionnel ou Page entreprise.',
    note: null,
    connectUrl: '/api/oauth/connect/linkedin',
    docsUrl: 'https://linkedin.com/developers/apps',
    scopes: 'w_member_social, r_liteprofile',
    modeWarning: false,
  },
}

// ── Composant : Badge de statut ──────────────────────────────────────────────
function StatusBadge({ active, count }) {
  if (!active) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 500,
      padding: '2px 8px', borderRadius: '999px',
      background: '#DCFCE7', color: '#166534',
      border: '0.5px solid #86EFAC',
    }}>
      <CheckCircle2 size={10} />
      {count} connecté{count > 1 ? 's' : ''}
    </span>
  )
}

// ── Composant : Compte connecté individuel ───────────────────────────────────
function ConnectedAccount({ conn, onDisconnect, platform }) {
  const meta = PLATFORMS[conn.platform] || PLATFORMS[platform]
  const Icon = meta?.Icon || Plug
  const [confirming, setConfirming] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 10px', borderRadius: '8px',
      background: 'var(--color-background-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
    }}>
      {/* Avatar */}
      {conn.avatar_url ? (
        <img
          src={conn.avatar_url} alt=""
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: meta?.bg || '#F0F0F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={meta?.color || '#666'} />
        </div>
      )}

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conn.page_name || conn.account_name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0, textTransform: 'capitalize' }}>
          {conn.account_type === 'page' ? '📄 Page' : conn.account_type === 'profile' ? '👤 Profil' : conn.account_type}
          {conn.platform !== platform && ` · via ${PLATFORMS[conn.platform]?.label || conn.platform}`}
        </p>
      </div>

      {/* Token sécurisé */}
      <Lock size={11} color="var(--color-text-tertiary)" title="Token chiffré en base" />

      {/* Déconnecter */}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          title="Déconnecter ce compte"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--color-text-tertiary)', borderRadius: 4,
            display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
        >
          <Unplug size={13} />
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#DC2626' }}>Confirmer ?</span>
          <button
            onClick={() => { onDisconnect(conn.id); setConfirming(false) }}
            style={{ fontSize: 11, padding: '2px 8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >Oui</button>
          <button
            onClick={() => setConfirming(false)}
            style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: 4, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >Non</button>
        </div>
      )}
    </div>
  )
}

// ── Composant : Carte d'une plateforme ───────────────────────────────────────
function PlatformCard({ platformKey, meta, connections, configured, oauthStatus, connecting, onConnect, onDisconnect }) {
  const { label, Icon, color, bg, border, textColor, description, note, connectUrl, docsUrl, scopes, modeWarning, autoConnected } = meta
  const active = connections.filter(c => c.platform === platformKey && c.is_active)
  const [expanded, setExpanded] = useState(false)
  const isConnecting = connecting === platformKey

  const statusInfo = oauthStatus[platformKey] || {}

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: `0.5px solid ${active.length ? border : 'var(--color-border-tertiary)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* En-tête */}
      <div style={{ padding: '16px 16px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icône */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>

        {/* Titre + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{label}</h3>
            <StatusBadge active={active.length > 0} count={active.length} />
            {!configured && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: '#FEF9C3', color: '#854D0E', border: '0.5px solid #FDE047',
              }}>
                Non configuré
              </span>
            )}
            {configured && modeWarning && statusInfo.mode === 'development' && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: '#FEF3C7', color: '#92400E', border: '0.5px solid #FCD34D',
              }}>
                Mode Dev
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>{description}</p>
        </div>

        {/* Bouton action */}
        <div style={{ flexShrink: 0 }}>
          {autoConnected ? (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              Via Facebook →
            </span>
          ) : configured ? (
            <button
              onClick={() => onConnect(platformKey, connectUrl)}
              disabled={isConnecting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 500, padding: '6px 12px',
                borderRadius: 7, cursor: isConnecting ? 'default' : 'pointer',
                border: `0.5px solid ${active.length ? 'var(--color-border-secondary)' : color}`,
                background: active.length ? 'var(--color-background-secondary)' : color,
                color: active.length ? 'var(--color-text-secondary)' : '#fff',
                opacity: isConnecting ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {isConnecting ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeDashoffset="8"/>
                  </svg>
                  Connexion…
                </>
              ) : active.length ? (
                <><Plus size={12} /> Ajouter un compte</>
              ) : (
                <><Plug size={12} /> Connecter</>
              )}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(s => !s)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                border: '0.5px solid var(--color-border-secondary)',
                background: 'none', color: 'var(--color-text-tertiary)',
              }}
            >
              <Shield size={12} /> Config .env
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Warning mode développement Facebook */}
      {configured && modeWarning && (
        <div style={{
          margin: '0 16px 12px',
          padding: '8px 12px',
          borderRadius: 8,
          background: '#FFFBEB',
          border: '0.5px solid #FDE68A',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, color: '#92400E', margin: 0, fontWeight: 500 }}>
              Action requise : passer l'app en mode "Live"
            </p>
            <p style={{ fontSize: 11, color: '#B45309', margin: '2px 0 0' }}>
              En mode Développement, seuls les admins peuvent se connecter.
              Pour que n'importe quel compte Facebook puisse se connecter,
              allez dans <strong>developers.facebook.com</strong> → votre app → basculez sur <strong>"Live"</strong>.
            </p>
            {docsUrl && (
              <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                Ouvrir Facebook Developers <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Comptes connectés */}
      {active.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {active.map(conn => (
            <ConnectedAccount key={conn.id} conn={conn} onDisconnect={onDisconnect} platform={platformKey} />
          ))}
        </div>
      )}

      {/* Note informationnelle */}
      {note && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Info size={11} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>{note}</p>
        </div>
      )}

      {/* Scopes (info, collapsible) */}
      {configured && (
        <div
          style={{
            borderTop: '0.5px solid var(--color-border-tertiary)',
            padding: '8px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(s => !s)}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={10} /> Permissions : {scopes}
          </span>
          {expanded ? <ChevronUp size={11} color="var(--color-text-tertiary)" /> : <ChevronDown size={11} color="var(--color-text-tertiary)" />}
        </div>
      )}

      {/* Guide de configuration (expandable) */}
      {!configured && expanded && (
        <ConfigGuide platformKey={platformKey} meta={meta} />
      )}
    </div>
  )
}

// ── Composant : Guide de configuration ──────────────────────────────────────
const CONFIG_GUIDES = {
  facebook: {
    steps: [
      { text: 'Allez sur', link: 'https://developers.facebook.com', linkText: 'developers.facebook.com' },
      { text: 'Créez une app → type "Consommateur" ou "Entreprise"' },
      { text: 'Ajoutez le produit "Facebook Login"' },
      { text: 'Dans Paramètres → OAuth Client → URI de redirection valides :', code: 'http://localhost:3001/api/oauth/callback/facebook' },
      { text: 'Dans Paramètres de base → copiez App ID et App Secret' },
      { text: 'Ajoutez dans votre .env :', code: 'FACEBOOK_APP_ID=...\nFACEBOOK_APP_SECRET=...' },
      { text: '⚠️ Important : basculez l\'app en mode "Live" pour permettre à n\'importe quel compte de se connecter', highlight: true },
    ]
  },
  twitter: {
    steps: [
      { text: 'Allez sur', link: 'https://developer.twitter.com', linkText: 'developer.twitter.com' },
      { text: 'Créez un projet et une app' },
      { text: 'Dans l\'app → Settings → activez OAuth 2.0' },
      { text: 'Type : "Web App, Automated App or Bot"' },
      { text: 'Callback URL :', code: 'http://localhost:3001/api/oauth/callback/twitter' },
      { text: 'Website URL : votre domaine (ex: http://localhost:5173)' },
      { text: 'Copiez Client ID et Client Secret dans .env :', code: 'TWITTER_CLIENT_ID=...\nTWITTER_CLIENT_SECRET=...' },
    ]
  },
  linkedin: {
    steps: [
      { text: 'Allez sur', link: 'https://www.linkedin.com/developers/apps', linkText: 'linkedin.com/developers/apps' },
      { text: 'Créez une app → associez à une Page LinkedIn entreprise' },
      { text: 'Onglet "Auth" → Redirect URLs :', code: 'http://localhost:3001/api/oauth/callback/linkedin' },
      { text: 'Activez les scopes : w_member_social, r_liteprofile, r_emailaddress' },
      { text: 'Copiez Client ID et Client Secret dans .env :', code: 'LINKEDIN_CLIENT_ID=...\nLINKEDIN_CLIENT_SECRET=...' },
    ]
  },
}

function ConfigGuide({ platformKey, meta }) {
  const guide = CONFIG_GUIDES[platformKey]
  if (!guide) return null
  return (
    <div style={{
      borderTop: '0.5px solid var(--color-border-tertiary)',
      padding: '14px 16px',
      background: 'var(--color-background-secondary)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
        ⚙️ Configuration {meta.label}
      </p>
      <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {guide.steps.map((step, i) => (
          <li key={i} style={{
            fontSize: 12, color: step.highlight ? '#92400E' : 'var(--color-text-secondary)',
            background: step.highlight ? '#FFFBEB' : 'none',
            padding: step.highlight ? '4px 8px' : 0,
            borderRadius: step.highlight ? 4 : 0,
          }}>
            {step.text}
            {step.link && (
              <> <a href={step.link} target="_blank" rel="noopener noreferrer"
                style={{ color: meta.color, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {step.linkText} <ExternalLink size={10} />
              </a></>
            )}
            {step.code && (
              <pre style={{
                margin: '4px 0 0', padding: '6px 10px', borderRadius: 6,
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-secondary)',
                fontSize: 11, fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-primary)',
                overflowX: 'auto', whiteSpace: 'pre-wrap',
              }}>{step.code}</pre>
            )}
          </li>
        ))}
      </ol>
      <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '12px 0 0' }}>
        Après modification du .env, redémarrez le serveur (<code style={{ fontSize: 10 }}>npm run dev</code>) puis revenez ici.
      </p>
    </div>
  )
}

// ── Composant principal : Connections ────────────────────────────────────────
export default function Connections() {
  const [searchParams] = useSearchParams()
  const [connections, setConnections] = useState([])
  const [oauthStatus, setOauthStatus] = useState({})
  const [connecting, setConnecting] = useState(null)
  const [alert, setAlert] = useState(null) // { type: 'success'|'error', msg: '' }
  const { get, del } = useApi()

  // ── Charger données ──────────────────────────────────────────────────────
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

  // ── Paramètres URL retour OAuth ──────────────────────────────────────────
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const platform = searchParams.get('platform')
    if (success) {
      setAlert({ type: 'success', msg: `✅ ${success}${platform ? ` (${PLATFORMS[platform]?.label || platform})` : ''}` })
      loadConnections()
    }
    if (error) {
      setAlert({ type: 'error', msg: `❌ ${decodeURIComponent(error)}` })
    }
    // Nettoyer l'URL
    if (success || error) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, loadConnections])

  // ── Connexion OAuth ──────────────────────────────────────────────────────
  function handleConnect(platform, connectUrl) {
    setConnecting(platform)
    // Redirection vers le backend OAuth — le flow OAuth se fait côté serveur
    // Quand l'utilisateur revient, la page recharge et les paramètres URL
    // contiennent success= ou error=
    window.location.href = connectUrl
  }

  // ── Déconnexion ──────────────────────────────────────────────────────────
  async function handleDisconnect(id) {
    await del(`/oauth/connections/${id}`)
    setConnections(prev => prev.map(c => c.id === id ? { ...c, is_active: 0 } : c))
    setAlert({ type: 'success', msg: 'Compte déconnecté.' })
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  const totalConnected = connections.filter(c => c.is_active).length

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>Connexions</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
              Connectez autant de comptes que vous voulez — une seule app par réseau suffit.
            </p>
          </div>
          <button
            onClick={() => { loadConnections(); loadStatus() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, padding: '6px 12px', borderRadius: 7,
              border: '0.5px solid var(--color-border-secondary)',
              background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: alert.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `0.5px solid ${alert.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: alert.type === 'success' ? '#166534' : '#991B1B',
          fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{alert.msg}</span>
          <button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit', opacity: 0.6 }}>×</button>
        </div>
      )}

      {/* Résumé global */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderRadius: 10, marginBottom: 24,
        background: totalConnected ? '#F0FDF4' : 'var(--color-background-secondary)',
        border: `0.5px solid ${totalConnected ? '#86EFAC' : 'var(--color-border-tertiary)'}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: totalConnected ? '#DCFCE7' : 'var(--color-background-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {totalConnected
            ? <CheckCircle2 size={18} color="#16A34A" />
            : <Plug size={18} color="var(--color-text-tertiary)" />
          }
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
            {totalConnected
              ? `${totalConnected} compte${totalConnected > 1 ? 's' : ''} connecté${totalConnected > 1 ? 's' : ''}`
              : 'Aucun compte connecté'}
          </p>
          <p style={{ fontSize: 12, color: totalConnected ? '#16A34A' : 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
            {totalConnected
              ? 'Prêt à publier depuis le Publisher sur ces comptes.'
              : 'Cliquez "Connecter" sur une plateforme pour commencer.'}
          </p>
        </div>
      </div>

      {/* Explication "comment ça marche" */}
      <div style={{
        padding: '12px 14px', borderRadius: 8, marginBottom: 20,
        background: 'var(--color-background-secondary)',
        border: '0.5px solid var(--color-border-tertiary)',
        fontSize: 12, color: 'var(--color-text-secondary)',
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Info size={13} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong style={{ color: 'var(--color-text-primary)' }}>Comment ça marche :</strong>{' '}
          Une seule app est configurée par réseau social (dans .env, une fois pour toutes).
          Vous pouvez ensuite connecter autant de comptes différents que vous voulez via OAuth —
          chaque token est stocké chiffré en base. Le .env ne change jamais.
        </span>
      </div>

      {/* Grille des plateformes */}
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Plateformes
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {Object.entries(PLATFORMS).map(([key, meta]) => (
          <PlatformCard
            key={key}
            platformKey={key}
            meta={meta}
            connections={connections}
            configured={oauthStatus[key]?.configured || false}
            oauthStatus={oauthStatus}
            connecting={connecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Sécurité */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--color-background-secondary)',
        border: '0.5px solid var(--color-border-tertiary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Lock size={13} color="var(--color-text-tertiary)" />
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>Sécurité des tokens</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.6 }}>
          Tous les access tokens sont chiffrés en AES-256-CBC avant stockage en base.
          La clé de chiffrement est définie dans <code style={{ fontSize: 11, padding: '1px 4px', background: 'var(--color-background-primary)', borderRadius: 3 }}>TOKEN_SECRET</code> dans votre .env.
          Aucun token n'est jamais exposé côté frontend.
        </p>
      </div>
    </div>
  )
}