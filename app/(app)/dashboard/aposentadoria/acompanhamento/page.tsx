'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PiggyBank, ArrowLeft, XCircle, TrendingUp, Target } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTrackingEntries, useUpsertTracking, type TrackingEntry } from '@/lib/hooks/useRetirementTracking'

// ─── Config ───────────────────────────────────────────────────────────────────

interface Cfg {
  initialMonthlyContrib: number
  annualContribGrowth: number
  currentAge: number
  retirementAge: number
}

const CFG_DEF: Cfg = { initialMonthlyContrib: 500, annualContribGrowth: 10, currentAge: 25, retirementAge: 60 }

// ─── Level system ─────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, name: 'Iniciante',    emoji: '🐣', min: 0,  color: 'text-gray-400',   bar: '#9ca3af', msg: 'Todo grande investidor começou do zero.' },
  { level: 2, name: 'Poupador',     emoji: '🐥', min: 15, color: 'text-blue-400',   bar: '#60a5fa', msg: 'Você está construindo o hábito de investir.' },
  { level: 3, name: 'Disciplinado', emoji: '💰', min: 30, color: 'text-indigo-400', bar: '#818cf8', msg: 'Consistência é o segredo dos grandes patrimônios.' },
  { level: 4, name: 'Investidor',   emoji: '📈', min: 50, color: 'text-amber-400',  bar: '#fbbf24', msg: 'Metade do caminho. Os juros compostos já trabalham por você.' },
  { level: 5, name: 'Consistente',  emoji: '🏦', min: 65, color: 'text-orange-400', bar: '#fb923c', msg: 'Seu patrimônio está crescendo de verdade.' },
  { level: 6, name: 'Expert',       emoji: '💎', min: 80, color: 'text-purple-400', bar: '#c084fc', msg: 'Poucos chegam aqui. Você é diferente.' },
  { level: 7, name: 'Mestre',       emoji: '👑', min: 95, color: 'text-yellow-400', bar: '#facc15', msg: 'Lendário. Seu futuro financeiro está garantido.' },
]

function getLevel(adherence: number) {
  let cur = LEVELS[0]
  for (const l of LEVELS) { if (adherence >= l.min) cur = l; else break }
  const nxtIdx = LEVELS.findIndex(l => l.level === cur.level) + 1
  const nxt = nxtIdx < LEVELS.length ? LEVELS[nxtIdx] : null
  const progress = nxt
    ? Math.min(100, ((adherence - cur.min) / (nxt.min - cur.min)) * 100)
    : 100
  return { cur, nxt, progress }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function nowYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthsBetween(a: string, b: string): string[] {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  const list: string[] = []
  let y = ay, m = am
  while (y < by || (y === by && m <= bm)) {
    list.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return list
}

function monthIdx(start: string, target: string): number {
  const [sy, sm] = start.split('-').map(Number)
  const [ty, tm] = target.split('-').map(Number)
  return (ty - sy) * 12 + (tm - sm)
}

function planned(cfg: Cfg, start: string, target: string): number {
  const idx = monthIdx(start, target)
  return Math.round(cfg.initialMonthlyContrib * Math.pow(1 + cfg.annualContribGrowth / 100, Math.floor(idx / 12)))
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtYM(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} ${y}`
}

// ─── localStorage ─────────────────────────────────────────────────────────────

function useLocalState() {
  const [startYM, setStartYM] = useState<string | null>(null)
  const [cfg, setCfg] = useState<Cfg>(CFG_DEF)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('focusos:retirement:trackingStart')
      if (s) setStartYM(s)
      const raw = localStorage.getItem('focusos:retirement')
      if (raw) {
        const p = JSON.parse(raw)
        setCfg(prev => ({
          initialMonthlyContrib: p.initialMonthlyContrib ?? prev.initialMonthlyContrib,
          annualContribGrowth:   p.annualContribGrowth   ?? prev.annualContribGrowth,
          currentAge:            p.currentAge            ?? prev.currentAge,
          retirementAge:         p.retirementAge         ?? prev.retirementAge,
        }))
      }
    } catch {}
    setMounted(true)
  }, [])

  function init(ym: string) {
    setStartYM(ym)
    try { localStorage.setItem('focusos:retirement:trackingStart', ym) } catch {}
  }
  function reset() {
    setStartYM(null)
    try { localStorage.removeItem('focusos:retirement:trackingStart') } catch {}
  }
  return { startYM, cfg, mounted, init, reset }
}

// ─── Level card ───────────────────────────────────────────────────────────────

function LevelCard({ adherence, done, partial, total }: { adherence: number; done: number; partial: number; total: number }) {
  const { cur, nxt, progress } = getLevel(adherence)
  return (
    <div className="rounded-2xl p-4 border border-[var(--border-subtle)] bg-[var(--bg-overlay)] flex items-center gap-4">
      <motion.div
        key={cur.level}
        initial={{ scale: 0.4, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="text-5xl shrink-0 select-none"
      >
        {cur.emoji}
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-end justify-between gap-2 mb-0.5">
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold leading-none mb-0.5">Nível {cur.level}</p>
            <p className={cn('text-lg font-bold leading-tight', cur.color)}>{cur.name}</p>
          </div>
          <span className={cn('text-2xl font-black tabular-nums leading-none', cur.color)}>{adherence}%</span>
        </div>
        {/* XP bar */}
        <div className="h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden my-2">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cur.bar }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{cur.msg}</p>
        {nxt && (
          <p className="text-[10px] text-[var(--text-muted)]/60 mt-1">
            Próximo: {nxt.name} {nxt.emoji} ao atingir {nxt.min}%
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  startYM, endYM, todayYM, entryMap,
}: {
  startYM: string; endYM: string; todayYM: string; entryMap: Map<string, TrackingEntry>
}) {
  const rows = useMemo(() => {
    const all = monthsBetween(startYM, endYM)
    const byYear = new Map<number, string[]>()
    all.forEach(ym => {
      const y = Number(ym.split('-')[0])
      if (!byYear.has(y)) byYear.set(y, [])
      byYear.get(y)!.push(ym)
    })
    return Array.from(byYear.entries()).map(([year, months]) => ({ year, months }))
  }, [startYM, endYM])

  function cellClass(ym: string): string {
    if (ym > todayYM)  return 'bg-[var(--border-subtle)] opacity-30'
    if (ym === todayYM) return 'bg-amber-400/40 ring-1 ring-amber-500 ring-inset'
    const e = entryMap.get(ym)
    if (!e)                   return 'bg-[var(--border-subtle)] opacity-60'
    if (e.status === 'done')    return 'bg-emerald-500'
    if (e.status === 'partial') return 'bg-amber-400'
    if (e.status === 'skipped') return 'bg-red-500/70'
    return 'bg-[var(--border-subtle)] opacity-60'
  }

  return (
    <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 border border-[var(--border-subtle)]">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Jornada completa — até a aposentadoria
      </p>

      {/* Month header */}
      <div className="flex gap-0.5 mb-1.5 ml-9">
        {MONTHS_PT.map(m => (
          <span key={m} className="w-4 text-center text-[8px] text-[var(--text-muted)] shrink-0 font-medium leading-none">{m[0]}</span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-y-auto max-h-72 space-y-0.5 pr-1">
        {rows.map(({ year, months }) => {
          const firstMonth = Number(months[0].split('-')[1])
          const startPad = firstMonth - 1
          return (
            <div key={year} className="flex items-center gap-0.5">
              <span className="text-[9px] text-[var(--text-muted)] w-8 shrink-0 font-mono tabular-nums leading-none">{year}</span>
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={i} className="w-4 h-4 shrink-0" />
              ))}
              {months.map(ym => (
                <div
                  key={ym}
                  title={fmtYM(ym)}
                  className={cn(
                    'w-4 h-4 rounded-[3px] shrink-0 transition-transform hover:scale-125 cursor-default',
                    cellClass(ym)
                  )}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-[var(--border-subtle)]">
        {[
          ['bg-emerald-500', 'Aportei'],
          ['bg-amber-400', 'Parcial'],
          ['bg-red-500/70', 'Pulei'],
          ['bg-amber-400/40 ring-1 ring-amber-500 ring-inset', 'Mês atual'],
          ['bg-[var(--border-subtle)] opacity-30', 'Futuro'],
        ].map(([cls, lbl]) => (
          <span key={lbl} className="flex items-center gap-1">
            <span className={cn('w-3 h-3 rounded-[2px] inline-block shrink-0', cls)} />
            <span className="text-[10px] text-[var(--text-muted)]">{lbl}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Month row (compact) ──────────────────────────────────────────────────────

function MonthRow({
  ym, plannedAmt, entry, isCurrent, onMark,
}: {
  ym: string; plannedAmt: number; entry?: TrackingEntry
  isCurrent: boolean
  onMark: (status: 'done' | 'partial' | 'skipped', actual: number) => void
}) {
  const [showInput, setShowInput] = useState(false)
  const [raw, setRaw] = useState('')
  const status = entry?.status

  function submit() {
    const v = parseInt(raw.replace(/\D/g, ''), 10)
    if (!isNaN(v) && v > 0) { onMark('partial', v); setShowInput(false); setRaw('') }
  }

  return (
    <div className={cn(
      'rounded-xl border p-3 transition-colors',
      isCurrent   ? 'border-amber-500/30 bg-amber-500/5' :
      status === 'done'    ? 'border-emerald-500/20 bg-emerald-500/5' :
      status === 'skipped' ? 'border-red-500/15 bg-red-500/5' :
      'border-[var(--border-subtle)] bg-[var(--bg-overlay)]'
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('text-sm font-bold shrink-0', isCurrent ? 'text-amber-400' : 'text-[var(--text-primary)]')}>
            {fmtYM(ym)}
          </span>
          <span className="text-xs text-[var(--text-muted)] shrink-0">{fmtBRL(plannedAmt)}</span>
          {status === 'done'    && <span className="text-xs text-emerald-400 font-medium">✓ Feito</span>}
          {status === 'partial' && <span className="text-xs text-amber-400 font-medium">◐ {fmtBRL(entry!.actual_amount)}</span>}
          {status === 'skipped' && <span className="text-xs text-red-400 font-medium">✗ Pulei</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status !== 'done' && (
            <button onClick={() => onMark('done', plannedAmt)}
              className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all">
              ✓
            </button>
          )}
          {!showInput && (
            <button onClick={() => setShowInput(true)}
              className="px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
              ◐
            </button>
          )}
          {status !== 'skipped' && (
            <button onClick={() => onMark('skipped', 0)}
              className="px-2 py-1 rounded-lg text-xs bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-red-400 hover:bg-red-500/10 transition-all">
              ✗
            </button>
          )}
        </div>
      </div>

      {showInput && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-muted)]">R$</span>
          <input
            type="text" inputMode="numeric" placeholder={String(plannedAmt)}
            value={raw}
            onChange={e => setRaw(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
            className="flex-1 bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none border-b border-[var(--border-subtle)] pb-0.5 min-w-0"
          />
          <button onClick={submit} className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30">OK</button>
          <button onClick={() => { setShowInput(false); setRaw('') }} className="text-xs text-[var(--text-muted)] px-1">✕</button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AcompanhamentoPage() {
  const router = useRouter()
  const { startYM, cfg, mounted, init, reset } = useLocalState()
  const { data: entries = [], isLoading } = useTrackingEntries()
  const { mutate: upsert } = useUpsertTracking()

  const todayYM = nowYM()

  const endYM = useMemo(() => {
    const yearsLeft = Math.max(cfg.retirementAge - cfg.currentAge, 1)
    const d = new Date()
    d.setFullYear(d.getFullYear() + yearsLeft)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [cfg])

  const pastMonths = useMemo(() => {
    if (!startYM) return []
    return monthsBetween(startYM, todayYM).reverse()
  }, [startYM, todayYM])

  const entryMap = useMemo(() => {
    const m = new Map<string, TrackingEntry>()
    entries.forEach(e => m.set(e.year_month, e))
    return m
  }, [entries])

  const stats = useMemo(() => {
    if (!startYM || pastMonths.length === 0)
      return { done: 0, partial: 0, skipped: 0, adherence: 0, totalActual: 0, totalPlanned: 0 }
    let done = 0, partial = 0, skipped = 0, totalActual = 0, totalPlanned = 0
    pastMonths.forEach(ym => {
      const e = entryMap.get(ym)
      const p = planned(cfg, startYM, ym)
      totalPlanned += p
      if (e?.status === 'done')    { done++;    totalActual += p }
      else if (e?.status === 'partial') { partial++; totalActual += e.actual_amount }
      else if (e?.status === 'skipped') { skipped++ }
    })
    const adherence = pastMonths.length > 0
      ? Math.round(((done + partial) / pastMonths.length) * 100) : 0
    return { done, partial, skipped, adherence, totalActual, totalPlanned }
  }, [pastMonths, entryMap, cfg, startYM])

  if (!mounted) return null

  // ── Empty state ──
  if (!startYM) {
    return (
      <div className="flex flex-col gap-5 p-4 lg:p-6 pb-24 lg:pb-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Acompanhamento</h1>
        </div>
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="text-7xl"
          >
            🐣
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Comece sua jornada</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
              Registre cada aporte mês a mês e veja seu personagem evoluir até a aposentadoria.
            </p>
          </div>
          <button
            onClick={() => init(todayYM)}
            className="px-6 py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25"
          >
            Iniciar agora
          </button>
        </div>
      </div>
    )
  }

  // ── Main ──
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 pb-24 lg:pb-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/aposentadoria')} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">Acompanhamento</h1>
          <p className="text-sm text-[var(--text-muted)]">Desde {fmtYM(startYM)}</p>
        </div>
        <button
          onClick={() => { if (window.confirm('Resetar histórico de acompanhamento?')) reset() }}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Resetar"
        >
          <XCircle size={16} />
        </button>
      </div>

      {/* Level card */}
      <LevelCard
        adherence={stats.adherence}
        done={stats.done}
        partial={stats.partial}
        total={pastMonths.length}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { val: stats.done,    label: 'Completo',  cls: 'text-emerald-400' },
          { val: stats.partial, label: 'Parcial',   cls: 'text-amber-400' },
          { val: stats.skipped, label: 'Pulados',   cls: 'text-red-400' },
          { val: pastMonths.length - stats.done - stats.partial - stats.skipped, label: 'Pendente', cls: 'text-[var(--text-muted)]' },
        ].map(({ val, label, cls }) => (
          <div key={label} className="bg-[var(--bg-overlay)] rounded-xl p-3 border border-[var(--border-subtle)] text-center">
            <p className={cn('text-xl font-bold tabular-nums', cls)}>{val}</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Total aportado vs planejado */}
      {stats.totalPlanned > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-sm">
          <span className="text-[var(--text-muted)] flex items-center gap-1.5">
            <TrendingUp size={14} /> Total aportado
          </span>
          <div className="text-right">
            <span className="font-bold text-blue-400">{fmtBRL(stats.totalActual)}</span>
            <span className="text-[var(--text-muted)] text-xs ml-1">/ {fmtBRL(stats.totalPlanned)}</span>
          </div>
        </div>
      )}

      {/* Full journey grid */}
      <MonthGrid startYM={startYM} endYM={endYM} todayYM={todayYM} entryMap={entryMap} />

      {/* Month list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Histórico</p>
        {isLoading ? (
          <div className="text-center py-6 text-sm text-[var(--text-muted)]">Carregando...</div>
        ) : pastMonths.length === 0 ? (
          <div className="text-center py-6 text-sm text-[var(--text-muted)]">Nenhum mês ainda.</div>
        ) : (
          pastMonths.map(ym => (
            <MonthRow
              key={ym}
              ym={ym}
              plannedAmt={planned(cfg, startYM, ym)}
              entry={entryMap.get(ym)}
              isCurrent={ym === todayYM}
              onMark={(status, actual) => upsert({
                year_month: ym,
                planned_amount: planned(cfg, startYM, ym),
                actual_amount: actual,
                status,
              })}
            />
          ))
        )}
      </div>
    </div>
  )
}
