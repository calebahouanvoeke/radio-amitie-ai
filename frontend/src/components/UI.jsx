import { useState } from 'react'
import { AlertCircle, CheckCircle2, Info, Copy, Check, Loader2 } from 'lucide-react'

export function Spinner({ className = '' }) {
  return <Loader2 className={`w-4 h-4 animate-spin ${className}`} />
}

export function Alert({ type = 'error', message, onClose }) {
  if (!message) return null
  const map = {
    error:   { cls: 'alert-error',   Icon: AlertCircle },
    success: { cls: 'alert-success', Icon: CheckCircle2 },
    info:    { cls: 'alert-info',    Icon: Info },
  }
  const { cls, Icon } = map[type] || map.error
  return (
    <div className={`${cls} fade-in`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="ml-auto opacity-50 hover:opacity-100 text-lg leading-none">×</button>}
    </div>
  )
}

export function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className={`btn-icon btn-sm ${className}`} title="Copier">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function ResultBox({ label, value, rows = 4, onChange }) {
  if (!value) return null
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="label mb-0">{label}</span>
        <CopyBtn text={value} />
      </div>
      {onChange
        ? <textarea className="textarea" rows={rows} value={value} onChange={e => onChange(e.target.value)} />
        : <div className="result-box min-h-0">{value}</div>
      }
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    done:       ['badge-green',  '✓ Terminé'],
    processing: ['badge-blue',   'En cours…'],
    error:      ['badge-red',    'Erreur'],
    pending:    ['badge-zinc',   'En attente'],
  }
  const [cls, label] = map[status] || ['badge-zinc', status]
  return <span className={cls}>{label}</span>
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="empty fade-in">
      <Icon className="empty-icon" />
      <p className="empty-title">{title}</p>
      {subtitle && <p className="empty-sub">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function FormField({ label, required, children, hint }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  )
}
