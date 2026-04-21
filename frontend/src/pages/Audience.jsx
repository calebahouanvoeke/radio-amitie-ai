import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Users, TrendingUp, Clock, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { useApi } from '../hooks/useApi.js'
import { Alert, Spinner, EmptyState, PageHeader } from '../components/UI.jsx'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card-p">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-500" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-zinc-900 mb-0.5">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
      {sub && <div className="text-xs text-emerald-600 mt-1">{sub}</div>}
    </div>
  )
}

export default function Audience() {
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [ok, setOk] = useState('')
  const { get, post, loading, error, setError } = useApi()

  useEffect(() => {
    get('/audience').then(d => setHistory(d.reports || [])).catch(() => {})
  }, [])

  async function analyze() {
    const res = await post('/audience/analyze').catch(() => null)
    if (res) {
      setReport(res)
      setOk('Analyse générée')
      get('/audience').then(d => setHistory(d.reports || [])).catch(() => {})
    }
  }

  const stats  = report?.stats
  const analysis = report?.analysis

  return (
    <div className="page fade-in">
      <PageHeader title="Audience" subtitle="Statistiques RadioKing et recommandations de programmation">
        <button onClick={analyze} disabled={loading} className="btn-primary">
          {loading ? <><Spinner className="text-white" /> Analyse en cours…</> : <><RefreshCw className="w-3.5 h-3.5" /> Analyser</>}
        </button>
      </PageHeader>

      {error && <Alert type="error"   message={error} onClose={() => setError(null)} />}
      {ok    && <Alert type="success" message={ok}    onClose={() => setOk('')} />}

      {!report && !loading && (
        <div className="card">
          <EmptyState icon={BarChart3} title="Aucune analyse"
            subtitle="Cliquez sur Analyser pour obtenir les statistiques d'audience en temps réel"
            action={<button onClick={analyze} className="btn-primary"><BarChart3 className="w-4 h-4" /> Analyser maintenant</button>} />
        </div>
      )}

      {report && (
        <div className="space-y-5 fade-in">
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users}     label="Auditeurs en ce moment"  value={stats?.current_listeners ?? '—'} sub="En direct" />
            <StatCard icon={TrendingUp} label="Pic aujourd'hui"        value={stats?.peak_today ?? '—'} />
            <StatCard icon={Clock}      label="Heure de pointe"        value={stats?.peak_hour ?? '—'} />
            <StatCard icon={Activity}   label="Écoutes aujourd'hui"    value={stats?.total_today ?? '—'} />
          </div>

          {/* Graphe horaire */}
          {stats?.hourly && (
            <div className="card-p">
              <p className="text-sm font-semibold text-zinc-800 mb-4">Audience par heure de la journée</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.hourly} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ border: '1px solid #e4e4e7', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: '#f4f4f5' }} />
                  <Bar dataKey="v" name="Auditeurs" fill="#18181b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Graphe hebdomadaire */}
          {stats?.daily && (
            <div className="card-p">
              <p className="text-sm font-semibold text-zinc-800 mb-4">Audience par jour de la semaine</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ border: '1px solid #e4e4e7', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="v" name="Auditeurs" stroke="#18181b" strokeWidth={2} fill="#f4f4f5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Analyse IA */}
          {analysis && (
            <div className="card-p">
              <p className="text-sm font-semibold text-zinc-800 mb-4">Analyse et recommandations</p>
              {analysis.summary && (
                <p className="text-sm text-zinc-600 leading-relaxed mb-4 pb-4 border-b border-zinc-100">{analysis.summary}</p>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.isArray(analysis.insights) && analysis.insights.length > 0 && (
                  <div>
                    <p className="label">Observations</p>
                    <ul className="space-y-2">
                      {analysis.insights.map((ins, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-600">
                          <span className="text-zinc-300 mt-1">→</span> {ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                  <div>
                    <p className="label">Recommandations</p>
                    <ol className="space-y-2">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-zinc-600">
                          <span className="font-mono text-zinc-300 flex-shrink-0">{i+1}.</span> {r}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
