'use client';

import { useState } from 'react';
import { Sparkles, X, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, WifiOff, RefreshCw } from 'lucide-react';

interface Recommendation {
  priorite: 'haute' | 'moyenne' | 'basse'
  action: string
  impact: string
}

interface FleetAnalysis {
  sante_globale: string
  score: number
  resume: string
  points_positifs: string[]
  alertes: string[]
  recommandations: Recommendation[]
  tendance: string
  message_principal: string
}

interface Props {
  stats: { total: number; available: number; borrowed: number; broken: number; maintenance: number; active_loans: number }
  categories: { name: string; total: number; available: number; borrowed: number; broken: number }[]
  recentLoans: unknown[]
  recentIncidents: unknown[]
}

const SANTE_COLORS: Record<string, string> = {
  Excellent: 'var(--et-success)',
  Bon: '#10b981',
  Moyen: 'var(--et-warning)',
  Critique: 'var(--et-danger)',
}

const PRIORITE_BADGE: Record<string, string> = {
  haute: 'badge badge-broken',
  moyenne: 'badge badge-maintenance',
  basse: 'badge badge-neutral',
}

export function AIInsightsPanel({ stats, categories, recentLoans, recentIncidents }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<FleetAnalysis | null>(null)
  const [error, setError] = useState('')

  const analyze = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/fleet-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, categories, recentLoans, recentIncidents }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setAnalysis(data.analysis)
      setOpen(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('credit') || msg.includes('balance') || msg.includes('billing')) {
        setError('credits')
      } else if (msg.includes('apiKey') || msg.includes('authentication') || msg.includes('API key')) {
        setError('apikey')
      } else {
        setError('generic')
      }
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = analysis
    ? analysis.score >= 80 ? 'var(--et-success)'
    : analysis.score >= 60 ? 'var(--et-warning)'
    : 'var(--et-danger)'
    : 'var(--et-primary)'

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={analyze}
        disabled={loading}
        className="btn btn-primary"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
      >
        {loading ? (
          <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? 'Analyse en cours…' : 'Analyse IA'}
      </button>

      {/* Overlay erreur */}
      {error && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setError('')}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl p-6 fade-in"
            style={{ background: 'var(--et-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4"
              style={{ background: error === 'credits' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)' }}>
              {error === 'credits'
                ? <AlertTriangle className="w-7 h-7" style={{ color: 'var(--et-warning)' }} />
                : <WifiOff className="w-7 h-7" style={{ color: 'var(--et-danger)' }} />
              }
            </div>

            <h3 className="text-base font-bold text-center mb-1" style={{ color: 'var(--et-text)' }}>
              {error === 'credits' && 'Crédits API insuffisants'}
              {error === 'apikey' && 'Clé API non configurée'}
              {error === 'generic' && 'Analyse indisponible'}
            </h3>

            <p className="text-sm text-center mb-4" style={{ color: 'var(--et-text-muted)' }}>
              {error === 'credits' &&
                'Le solde du compte API Anthropic est épuisé. Rechargez des crédits sur console.anthropic.com → Plans & Billing.'}
              {error === 'apikey' &&
                "La clé API n'est pas définie. Ajoutez ANTHROPIC_API_KEY dans votre fichier .env.local et redémarrez le serveur."}
              {error === 'generic' &&
                "L'analyse IA est momentanément indisponible. Vérifiez votre connexion et réessayez dans quelques instants."}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setError(''); analyze(); }}
                className="btn btn-secondary flex-1 justify-center"
                style={{ fontSize: '0.8rem' }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Réessayer
              </button>
              <button
                onClick={() => setError('')}
                className="btn btn-ghost flex-1 justify-center"
                style={{ fontSize: '0.8rem' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel overlay */}
      {open && analysis && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-6"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden fade-in"
            style={{ background: 'var(--et-surface)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <h2 className="font-bold text-white">Analyse IA de la flotte</h2>
              </div>
              <button onClick={() => setOpen(false)} className="flex items-center justify-center w-7 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Score + état */}
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-2xl shrink-0 text-2xl font-bold text-white"
                  style={{ background: scoreColor }}
                >
                  {analysis.score}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold" style={{ color: SANTE_COLORS[analysis.sante_globale] ?? 'var(--et-text)' }}>
                      {analysis.sante_globale}
                    </span>
                    {analysis.tendance === 'hausse' ? <TrendingUp className="w-4 h-4" style={{ color: 'var(--et-success)' }} />
                      : analysis.tendance === 'baisse' ? <TrendingDown className="w-4 h-4" style={{ color: 'var(--et-danger)' }} />
                      : <Minus className="w-4 h-4" style={{ color: 'var(--et-text-muted)' }} />}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--et-text)' }}>{analysis.message_principal}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>{analysis.resume}</p>
                </div>
              </div>

              {/* Points positifs */}
              {analysis.points_positifs.length > 0 && (
                <div>
                  <p className="section-label">✅ Points positifs</p>
                  <div className="space-y-1.5">
                    {analysis.points_positifs.map((p, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--et-success)' }} />
                        <p className="text-sm" style={{ color: 'var(--et-text-secondary)' }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertes */}
              {analysis.alertes.length > 0 && (
                <div>
                  <p className="section-label">⚠️ Alertes</p>
                  <div className="space-y-1.5">
                    {analysis.alertes.map((a, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--et-warning)' }} />
                        <p className="text-sm" style={{ color: 'var(--et-text-secondary)' }}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommandations */}
              {analysis.recommandations.length > 0 && (
                <div>
                  <p className="section-label">🎯 Recommandations</p>
                  <div className="space-y-2">
                    {analysis.recommandations.map((r, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={PRIORITE_BADGE[r.priorite]}>{r.priorite}</span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--et-text)' }}>{r.action}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>Impact : {r.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--et-border)' }}>
                <Sparkles className="w-3 h-3" style={{ color: 'var(--et-text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
                  Généré par Claude AI · Les recommandations sont indicatives
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
