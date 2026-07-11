'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PiggyBank, ArrowLeft, CheckCircle2, XCircle, MinusCircle,
  TrendingUp, Calendar, Target, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTrackingEntries, useUpsertTracking, type TrackingEntry } from '@/lib/hooks/useRetirementTracking'

// ─── Config shape (minimal — only what we need) ───────────────────────────────

interface RetirementConfig {
  initialMonthlyContrib: number
  annualContribGrowth: number
}

const DEFAULTS: RetirementConfig = {
  initialMonthlyContrib: 500,
  annualContribGrowth: 10,
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthsBetween(startYM: string, endYM: string): string[] {
  const [sy, sm] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  const months: string[] = []
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

function monthIndex(startYM: string, targetYM: string): number {
  const [sy, sm] = startYM.split('-').map(Number)
  const [ty, tm] = targetYM.split('-').map(Number)
  return (ty - sy) * 12 + (tm - sm)
}

function plannedForMonth(cfg: RetirementConfig, startYM: string, targetYM: string): number {
  const idx = monthIndex(startYM, targetYM)
  const yearIdx = Math.floor(idx / 12)
  return Math.round(cfg.initialMonthlyContrib * Math.pow(1 + cfg.annualContribGrowth / 100, yearIdx))
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} ${y}`
}

// ─── localStorage hook ────────────────────────────────────────────────────────

function useTrackingState() {
  const [startYM, setStartYM] = useState<string | null>(null)
  const [cfg, setCfg] = useState<RetirementConfig>(DEFAULTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('focusos:retirement:trackingStart')
      if (s) setStartYM(s)

      const raw = localStorage.getItem('focusos:retirement')
      if (raw) {
        const parsed = JSON.parse(raw)
        setCfg(prev => ({
          ...prev,
          initialMonthlyContrib: parsed.initialMonthlyContrib ?? prev.initialMonthlyContrib,
          annualContribGrowth: parsed.annualContribGrowth ?? prev.annualContribGrowth,
        }))
      }
    } catch {}
    setMounted(true)
  }, [])

  function initTracking(ym: string) {
    setStartYM(ym)
    try { localStorage.setItem('focusos:retirement:trackingStart', ym) } catch {}
  }

  function resetTracking() {
    setStartYM(null)
    try { localStorage.removeItem('focusos:retirement:trackingStart') } catch {}
  }

  return { startYM, cfg, mounted, initTracking, resetTracking }
}

// ─── Month row component ──────────────────────────────────────────────────────

function MonthRow({
  ym,
  planned,
  entry,
  isCurrent,
  isFuture,
  onMark,
}: {
  ym: string
  planned: number
  entry?: TrackingEntry
  isCurrent: boolean
  isFuture: boolean
  onMark: (status: 'done' | 'partial' | 'skipped', actual: number) => void
}) {
  const [showPartialInput, setShowPartialInput] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')

  const status = entry?.status
  const actual = entry?.actual_amount ?? 0

  function handlePartialSubmit() {
    const v = parseInt(partialAmount.replace(/\D/g, ''), 10)
    if (!isNaN(v) && v > 0) {
      onMark('partial', v)
      setShowPartialInput(false)
      setPartialAmount('')
    }
  }

  const statusBadge = () => {
    if (isFuture) return <span className="text-xs text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">Futuro</span>
    if (!status) return <span className="text-xs text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">Pendente</span>
    if (status === 'done') return (
      <span className="flex items-center gap-1 text-xs text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 font-medium">
        <CheckCircle2 size={11} /> Aportei
      </span>
    )
    if (status === 'partial') return (
      <span className="flex items-center gap-1 text-xs text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 font-medium">
        <MinusCircle size={11} /> Parcial — {fmtBRL(actual)}
      </span>
    )
    return (
      <span className="flex items-center gap-1 text-xs text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 font-medium">
        <XCircle size={11} /> Não aportei
      </span>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 transition-all",
      isCurrent
        ? "border-amber-500/30 bg-amber-500/5"
        : isFuture
          ? "border-[var(--border-subtle)] opacity-40"
          : status === 'done'
            ? "border-emerald-500/20 bg-emerald-500/5"
            : status === 'skipped'
              ? "border-red-500/20 bg-red-500/5"
              : "border-[var(--border-subtle)] bg-[var(--bg-overlay)]"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 text-center">
            <p className={cn("text-sm font-bold", isCurrent ? "text-amber-400" : "text-[var(--text-primary)]")}>
              {fmtMonthLabel(ym)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{fmtBRL(planned)}</p>
          </div>
          <div className="shrink-0">{statusBadge()}</div>
        </div>

        {!isFuture && (
          <div className="flex items-center gap-1.5 shrink-0">
            {status !== 'done' && (
              <button
                onClick={() => onMark('done', planned)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all"
              >
                Fiz ✓
              </button>
            )}
            {status !== 'partial' && !showPartialInput && (
              <button
                onClick={() => setShowPartialInput(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
              >
                Parcial
              </button>
            )}
            {status !== 'skipped' && (
              <button
                onClick={() => onMark('skipped', 0)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-[var(--border-subtle)] transition-all"
              >
                ✗
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPartialInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)] shrink-0">R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder={String(planned)}
                value={partialAmount}
                onChange={e => setPartialAmount(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handlePartialSubmit()}
                autoFocus
                className="flex-1 bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none min-w-0 border-b border-[var(--border-subtle)] pb-0.5"
              />
              <button
                onClick={handlePartialSubmit}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
              >
                OK
              </button>
              <button
                onClick={() => { setShowPartialInput(false); setPartialAmount('') }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AcompanhamentoPage() {
  const router = useRouter()
  const { startYM, cfg, mounted, initTracking, resetTracking } = useTrackingState()
  const { data: entries = [], isLoading } = useTrackingEntries()
  const { mutate: upsert } = useUpsertTracking()

  const todayYM = currentYM()

  const months = useMemo(() => {
    if (!startYM) return []
    return getMonthsBetween(startYM, todayYM).reverse() // newest first
  }, [startYM, todayYM])

  const entryMap = useMemo(() => {
    const m = new Map<string, TrackingEntry>()
    entries.forEach(e => m.set(e.year_month, e))
    return m
  }, [entries])

  const stats = useMemo(() => {
    if (months.length === 0) return { total: 0, done: 0, partial: 0, skipped: 0, adherence: 0, totalPlanned: 0, totalActual: 0 }
    const past = months.filter(ym => ym <= todayYM)
    let done = 0, partial = 0, skipped = 0, totalPlanned = 0, totalActual = 0
    past.forEach(ym => {
      const e = entryMap.get(ym)
      const planned = plannedForMonth(cfg, startYM!, ym)
      totalPlanned += planned
      if (e?.status === 'done') { done++; totalActual += planned }
      else if (e?.status === 'partial') { partial++; totalActual += e.actual_amount }
      else if (e?.status === 'skipped') { skipped++ }
    })
    const adherence = past.length > 0 ? Math.round(((done + partial) / past.length) * 100) : 0
    return { total: past.length, done, partial, skipped, adherence, totalPlanned, totalActual }
  }, [months, entryMap, cfg, startYM, todayYM])

  if (!mounted) return null

  if (!startYM) {
    return (
      <div className="flex flex-col gap-5 p-4 lg:p-6 pb-24 lg:pb-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <PiggyBank size={22} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Acompanhamento</h1>
              <p className="text-sm text-[var(--text-muted)]">Registre seus aportes mensais</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 flex items-center justify-center">
            <Calendar size={32} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Comece a acompanhar</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
              A partir de hoje você vai registrar mês a mês se fez o aporte planejado.
              Isso vai te ajudar a manter a disciplina financeira.
            </p>
          </div>
          <button
            onClick={() => initTracking(todayYM)}
            className="px-6 py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25"
          >
            Iniciar acompanhamento
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 pb-24 lg:pb-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/aposentadoria')}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <PiggyBank size={22} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">Acompanhamento</h1>
            <p className="text-sm text-[var(--text-muted)] truncate">
              Desde {fmtMonthLabel(startYM)}
            </p>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm('Resetar histórico de acompanhamento?')) resetTracking() }}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Resetar"
        >
          <XCircle size={16} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
            <Target size={12} />
            <span>Aderência</span>
          </div>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            stats.adherence >= 80 ? "text-emerald-400" : stats.adherence >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {stats.adherence}%
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {stats.done + stats.partial}/{stats.total} meses
          </p>
        </div>

        <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
            <TrendingUp size={12} />
            <span>Total aportado</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-blue-400">
            {fmtBRL(stats.totalActual)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            de {fmtBRL(stats.totalPlanned)} planejado
          </p>
        </div>

        <div className="bg-[var(--bg-overlay)] rounded-2xl p-3.5 border border-emerald-500/20 bg-emerald-500/5 col-span-1 flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-emerald-400">{stats.done}</p>
            <p className="text-xs text-[var(--text-muted)]">meses completos</p>
          </div>
        </div>

        <div className="bg-[var(--bg-overlay)] rounded-2xl p-3.5 border border-red-500/20 bg-red-500/5 col-span-1 flex items-center gap-2.5">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-red-400">{stats.skipped}</p>
            <p className="text-xs text-[var(--text-muted)]">meses sem aporte</p>
          </div>
        </div>
      </div>

      {/* Config info */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-400/60" />
        <span>
          Plano: aporte inicial de {fmtBRL(cfg.initialMonthlyContrib)}/mês com crescimento de {cfg.annualContribGrowth}%/ano.{' '}
          Para alterar, volte à calculadora.
        </span>
      </div>

      {/* Month list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {months.length} {months.length === 1 ? 'mês' : 'meses'}
        </p>

        {isLoading ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">Carregando...</div>
        ) : (
          months.map(ym => (
            <MonthRow
              key={ym}
              ym={ym}
              planned={plannedForMonth(cfg, startYM, ym)}
              entry={entryMap.get(ym)}
              isCurrent={ym === todayYM}
              isFuture={ym > todayYM}
              onMark={(status, actual) =>
                upsert({
                  year_month: ym,
                  planned_amount: plannedForMonth(cfg, startYM, ym),
                  actual_amount: actual,
                  status,
                })
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
