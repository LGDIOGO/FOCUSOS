'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PiggyBank, TrendingUp, Wallet, Sparkles, BarChart3,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  RotateCcw, Info, ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Config {
  currentAge: number
  retirementAge: number
  currentSavings: number
  targetAmount: number
  initialMonthlyContrib: number
  annualContribGrowth: number  // %/year — how much contribution increases each year
  annualReturn: number          // %/year — expected portfolio return
  annualInflation: number       // %/year — for real-value adjustment
  withdrawalRate: number        // %/year — for passive income calculation (4% rule etc.)
  showRealValues: boolean       // display inflation-adjusted values
}

interface YearRow {
  year: number
  age: number
  monthlyContrib: number        // contribution in that year
  yearlyContrib: number         // annual contribution
  totalContributed: number      // cumulative contributions since start
  balance: number               // nominal portfolio value
  realBalance: number           // inflation-adjusted portfolio value
  returns: number               // balance - totalContributed (compound gains)
}

interface ProjectionResult {
  rows: YearRow[]
  finalBalance: number
  totalContributed: number
  totalReturns: number
  passiveIncome: number
  goalReachedYear: number | null
  goalReachedAge: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS: Config = {
  currentAge: 25,
  retirementAge: 60,
  currentSavings: 0,
  targetAmount: 2_000_000,
  initialMonthlyContrib: 500,
  annualContribGrowth: 10,
  annualReturn: 12,
  annualInflation: 5,
  withdrawalRate: 4,
  showRealValues: false,
}

const PRESETS = [
  {
    label: 'Conservador',
    desc: 'Renda fixa / Tesouro',
    emoji: '🛡️',
    cfg: { annualReturn: 9, annualInflation: 5, annualContribGrowth: 5, withdrawalRate: 3 },
  },
  {
    label: 'Moderado',
    desc: 'Mix renda fixa+variável',
    emoji: '⚖️',
    cfg: { annualReturn: 12, annualInflation: 5, annualContribGrowth: 10, withdrawalRate: 4 },
  },
  {
    label: 'Agressivo',
    desc: 'Renda variável / ações',
    emoji: '🚀',
    cfg: { annualReturn: 15, annualInflation: 5, annualContribGrowth: 15, withdrawalRate: 5 },
  },
]

// ─── Calculation engine ───────────────────────────────────────────────────────

function project(cfg: Config): ProjectionResult {
  const totalYears = cfg.retirementAge - cfg.currentAge
  if (totalYears <= 0) {
    const passiveIncome = Math.round((cfg.currentSavings * cfg.withdrawalRate) / 100 / 12)
    return {
      rows: [], finalBalance: cfg.currentSavings, totalContributed: cfg.currentSavings,
      totalReturns: 0, passiveIncome, goalReachedYear: null, goalReachedAge: null,
    }
  }

  // Compound at monthly granularity for accuracy
  const monthlyRate = Math.pow(1 + cfg.annualReturn / 100, 1 / 12) - 1
  let balance = cfg.currentSavings
  let totalContributed = cfg.currentSavings
  let monthlyContrib = cfg.initialMonthlyContrib
  const rows: YearRow[] = []
  let goalReachedYear: number | null = null
  let goalReachedAge: number | null = null

  for (let y = 1; y <= totalYears; y++) {
    const yearlyContrib = monthlyContrib * 12
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContrib
      totalContributed += monthlyContrib
    }
    const age = cfg.currentAge + y
    const inflationFactor = Math.pow(1 + cfg.annualInflation / 100, y)
    const realBalance = Math.round(balance / inflationFactor)
    const returns = balance - totalContributed

    rows.push({
      year: y,
      age,
      monthlyContrib: Math.round(monthlyContrib),
      yearlyContrib: Math.round(yearlyContrib),
      totalContributed: Math.round(totalContributed),
      balance: Math.round(balance),
      realBalance,
      returns: Math.round(returns),
    })

    if (goalReachedYear === null && balance >= cfg.targetAmount) {
      goalReachedYear = y
      goalReachedAge = age
    }

    // Grow contribution by configured annual rate
    monthlyContrib *= 1 + cfg.annualContribGrowth / 100
  }

  const last = rows[rows.length - 1]
  const finalBalance = last?.balance ?? 0
  const passiveIncome = Math.round((finalBalance * cfg.withdrawalRate) / 100 / 12)

  return {
    rows,
    finalBalance,
    totalContributed: last?.totalContributed ?? 0,
    totalReturns: Math.round(finalBalance - (last?.totalContributed ?? 0)),
    passiveIncome,
    goalReachedYear,
    goalReachedAge,
  }
}

// Binary-search the minimum initial monthly contribution that reaches the target by retirement
function calcRequiredContrib(cfg: Config): number {
  const totalYears = cfg.retirementAge - cfg.currentAge
  if (totalYears <= 0 || cfg.targetAmount <= 0) return 0
  const { finalBalance } = project(cfg)
  if (finalBalance >= cfg.targetAmount) return cfg.initialMonthlyContrib

  // Upper bound: even with 0% return, contributing target/(years*12) per month accumulates = target
  let lo = 0
  let hi = cfg.targetAmount / Math.max(totalYears * 12, 1)

  // Verify upper bound (may need expansion if growth makes earlier years count more)
  for (let expand = 0; expand < 5; expand++) {
    const { finalBalance: fb } = project({ ...cfg, initialMonthlyContrib: hi })
    if (fb >= cfg.targetAmount) break
    hi *= 2
  }

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const { finalBalance: fb } = project({ ...cfg, initialMonthlyContrib: mid })
    if (fb >= cfg.targetAmount) hi = mid
    else lo = mid
  }
  return Math.ceil((lo + hi) / 2)
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtBRL(v: number, compact = false): string {
  if (compact) {
    if (Math.abs(v) >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1).replace('.', ',')}B`
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
  }
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

function fmtPct(v: number): string {
  return `${v.toFixed(1).replace('.', ',')}%`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderInput({
  label, value, min, max, step = 1, onChange,
  format: fmt = (v: number) => String(v), hint, color = 'red',
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; format?: (v: number) => string
  hint?: string; color?: 'red' | 'amber' | 'blue' | 'emerald'
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  const trackColor = color === 'amber' ? '#f59e0b' : color === 'blue' ? '#3b82f6' : color === 'emerald' ? '#10b981' : '#ef4444'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums shrink-0">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(0,0,0,0.3)]
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
      />
      {hint && <p className="text-xs text-[var(--text-muted)] leading-tight">{hint}</p>}
    </div>
  )
}

function MoneyInput({
  label, value, onChange, hint, placeholder,
}: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  function handleFocus() {
    setEditing(true)
    setRaw(value > 0 ? String(value) : '')
  }
  function handleBlur() {
    setEditing(false)
    const n = parseInt(raw.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n >= 0) onChange(n)
    setRaw('')
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value.replace(/\D/g, ''))
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[var(--text-secondary)]">{label}</label>
      <div className="flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 focus-within:border-[var(--text-muted)] transition-colors">
        <span className="text-sm text-[var(--text-muted)] mr-1.5 select-none font-medium">R$</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder ?? '0'}
          value={editing ? raw : (value > 0 ? value.toLocaleString('pt-BR') : '')}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className="flex-1 bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none min-w-0 placeholder:text-[var(--text-muted)]"
        />
      </div>
      {hint && <p className="text-xs text-[var(--text-muted)] leading-tight">{hint}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const contrib = Math.max(0, payload.find((p: any) => p.dataKey === 'totalContributed')?.value ?? 0)
  const ret = Math.max(0, payload.find((p: any) => p.dataKey === 'returns')?.value ?? 0)
  const total = contrib + ret
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-2xl text-xs min-w-[190px]">
      <p className="font-bold text-[var(--text-primary)] mb-2">Aos {label} anos</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-[var(--text-muted)]">Patrimônio total</span>
          <span className="font-bold text-[var(--text-primary)]">{fmtBRL(total, true)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-blue-400">↳ Aportado</span>
          <span className="text-blue-400 font-semibold">{fmtBRL(contrib, true)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-emerald-400">↳ Rendimentos</span>
          <span className="text-emerald-400 font-semibold">{fmtBRL(ret, true)}</span>
        </div>
        {total > 0 && contrib > 0 && (
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex justify-between gap-6">
              <span className="text-[var(--text-muted)]">Multiplicador</span>
              <span className="text-amber-400 font-bold">{(total / contrib).toFixed(2)}×</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── localStorage config hook ─────────────────────────────────────────────────

function useLocalConfig(): [Config, (v: Partial<Config>) => void, () => void] {
  const [cfg, setCfg] = useState<Config>(DEFAULTS)

  useEffect(() => {
    try {
      const s = localStorage.getItem('focusos:retirement')
      if (s) setCfg(prev => ({ ...prev, ...JSON.parse(s) }))
    } catch {}
  }, [])

  const update = useCallback((updates: Partial<Config>) => {
    setCfg(prev => {
      const next = { ...prev, ...updates }
      try { localStorage.setItem('focusos:retirement', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setCfg(DEFAULTS)
    try { localStorage.removeItem('focusos:retirement') } catch {}
  }, [])

  return [cfg, update, reset]
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AposentadoriaPage() {
  const router = useRouter()
  const [cfg, update, reset] = useLocalConfig()
  const [showTable, setShowTable] = useState(false)
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  function handleStartTracking() {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    try {
      if (!localStorage.getItem('focusos:retirement:trackingStart')) {
        localStorage.setItem('focusos:retirement:trackingStart', ym)
      }
    } catch {}
    router.push('/dashboard/aposentadoria/acompanhamento')
  }

  const result = useMemo(() => project(cfg), [cfg])
  const reqContrib = useMemo(() => calcRequiredContrib(cfg), [cfg])

  const yearsToRetire = cfg.retirementAge - cfg.currentAge
  const willReachGoal = result.goalReachedYear !== null
  const exceedsPct = cfg.targetAmount > 0 ? (result.finalBalance / cfg.targetAmount) * 100 : 0
  const lastRow = result.rows[result.rows.length - 1]

  function applyPreset(i: number) {
    setActivePreset(i)
    update(PRESETS[i].cfg)
  }

  // Chart data: stacked areas (contributed + returns = balance)
  const chartData = result.rows.map(r => {
    const inflAdj = Math.pow(1 + cfg.annualInflation / 100, r.year)
    const tc = cfg.showRealValues ? Math.round(r.totalContributed / inflAdj) : r.totalContributed
    const bal = cfg.showRealValues ? r.realBalance : r.balance
    return {
      age: r.age,
      totalContributed: tc,
      returns: Math.max(0, bal - tc),
    }
  })

  const chartTarget = cfg.showRealValues
    ? Math.round(cfg.targetAmount / Math.pow(1 + cfg.annualInflation / 100, yearsToRetire))
    : cfg.targetAmount

  const displayFinal = cfg.showRealValues ? (lastRow?.realBalance ?? 0) : result.finalBalance

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <PiggyBank size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">Aposentadoria</h1>
            <p className="text-sm text-[var(--text-muted)]">Calculadora de independência financeira</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
          >
            <Info size={18} />
          </button>
          <button
            onClick={reset}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
            title="Resetar configurações"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* ── Info panel ── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed border border-[var(--border-subtle)]">
              <p><strong className="text-[var(--text-primary)]">Como funciona:</strong> A calculadora simula o crescimento do seu patrimônio mês a mês considerando aportes mensais crescentes e juros compostos sobre o saldo acumulado.</p>
              <p><strong className="text-amber-400">Crescimento do aporte:</strong> Simula aumentos anuais de renda (promoções, reajustes). Ex: 10%/ano → aporte dobra a cada ~7 anos.</p>
              <p><strong className="text-emerald-400">Taxa de retirada (regra dos X%):</strong> Na aposentadoria, você retira X% do patrimônio por ano. A regra dos 4% é amplamente usada e considera a carteira durar 30+ anos.</p>
              <p><strong className="text-blue-400">Valores reais:</strong> Ativando "termos reais", todos os valores são ajustados pela inflação para mostrar o poder de compra atual.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">

        {/* ══════════════════════════════════════════════════════
            CONFIG PANEL
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Perfil de investimento</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(i)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-all",
                    activePreset === i
                      ? "border-amber-500/60 bg-amber-500/10"
                      : "border-[var(--border-subtle)] bg-[var(--bg-overlay)] hover:border-[var(--text-muted)]"
                  )}
                >
                  <span className="text-base">{p.emoji}</span>
                  <span className={cn("text-xs font-bold", activePreset === i ? "text-amber-400" : "text-[var(--text-primary)]")}>{p.label}</span>
                  <span className="text-[9px] text-[var(--text-muted)] leading-tight px-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Perfil */}
          <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-4 border border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">👤 Perfil</p>
            <div className="grid grid-cols-2 gap-4">
              <SliderInput
                label="Idade atual" value={cfg.currentAge} min={16} max={75} color="red"
                onChange={v => { update({ currentAge: v }); setActivePreset(null) }}
                format={v => `${v} anos`}
              />
              <SliderInput
                label="Aposentar com" value={cfg.retirementAge} min={Math.max(cfg.currentAge + 2, 30)} max={90} color="amber"
                onChange={v => { update({ retirementAge: v }); setActivePreset(null) }}
                format={v => `${v} anos`}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-primary)] text-xs text-[var(--text-muted)]">
              <span className="text-amber-400 font-bold">{yearsToRetire}</span>
              <span>anos de acumulação</span>
              {yearsToRetire < 10 && <span className="ml-auto text-orange-400">⚠ horizonte curto</span>}
            </div>
            <MoneyInput
              label="Patrimônio atual (R$)"
              value={cfg.currentSavings}
              onChange={v => { update({ currentSavings: v }); setActivePreset(null) }}
              hint="Quanto você já tem investido hoje — usado como saldo inicial"
              placeholder="0"
            />
          </div>

          {/* Meta */}
          <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-4 border border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">🎯 Meta</p>
            <MoneyInput
              label="Patrimônio alvo (R$)"
              value={cfg.targetAmount}
              onChange={v => { update({ targetAmount: v }); setActivePreset(null) }}
              hint="Quanto você quer ter acumulado ao se aposentar"
              placeholder="2.000.000"
            />
            <SliderInput
              label="Taxa de retirada anual" value={cfg.withdrawalRate} min={1} max={8} step={0.5} color="amber"
              onChange={v => { update({ withdrawalRate: v }); setActivePreset(null) }}
              format={fmtPct}
              hint={`Renda passiva estimada: ${fmtBRL(result.passiveIncome)}/mês na aposentadoria`}
            />
          </div>

          {/* Aportes */}
          <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-4 border border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">💰 Aportes mensais</p>
            <SliderInput
              label="Aporte mensal inicial" value={cfg.initialMonthlyContrib} min={50} max={50_000} step={50} color="blue"
              onChange={v => { update({ initialMonthlyContrib: v }); setActivePreset(null) }}
              format={v => fmtBRL(v)}
              hint={lastRow ? `No último ano (${lastRow.age}a): ${fmtBRL(lastRow.monthlyContrib)}/mês` : undefined}
            />
            <SliderInput
              label="Crescimento anual do aporte" value={cfg.annualContribGrowth} min={0} max={30} step={0.5} color="blue"
              onChange={v => { update({ annualContribGrowth: v }); setActivePreset(null) }}
              format={fmtPct}
              hint="Simula aumentos de renda (promoções, reajustes). 0% = aporte fixo para sempre"
            />
          </div>

          {/* Mercado */}
          <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-4 border border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">📈 Mercado</p>
            <SliderInput
              label="Taxa de rendimento anual" value={cfg.annualReturn} min={1} max={25} step={0.5} color="emerald"
              onChange={v => { update({ annualReturn: v }); setActivePreset(null) }}
              format={fmtPct}
              hint="Retorno médio anual esperado da carteira de investimentos"
            />
            <SliderInput
              label="Inflação anual" value={cfg.annualInflation} min={0} max={15} step={0.5} color="red"
              onChange={v => { update({ annualInflation: v }); setActivePreset(null) }}
              format={fmtPct}
              hint="IPCA médio esperado — usado para calcular valores em termos reais"
            />
          </div>

          {/* Real values toggle */}
          <button
            onClick={() => update({ showRealValues: !cfg.showRealValues })}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm",
              cfg.showRealValues
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            )}
          >
            <div className="flex items-center gap-2">
              <span>{cfg.showRealValues ? '✓' : '○'}</span>
              <span className="font-medium">Ver valores em termos reais</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">ajustado pela inflação</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            RESULTS PANEL
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Goal status banner */}
          <AnimatePresence mode="wait">
            {willReachGoal ? (
              <motion.div
                key="reached"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25"
              >
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    Meta atingida aos {result.goalReachedAge} anos —{' '}
                    {yearsToRetire - result.goalReachedYear!}{' '}
                    {yearsToRetire - result.goalReachedYear! === 1 ? 'ano' : 'anos'} antes do prazo!
                  </p>
                  {exceedsPct > 100 && (
                    <p className="text-xs text-emerald-400/70 mt-0.5">
                      Você vai acumular {Math.round(exceedsPct)}% da meta → {fmtBRL(displayFinal, true)}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="missed"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25"
              >
                <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Meta não atingida no prazo configurado</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    Aporte inicial necessário:{' '}
                    <span className="font-bold text-amber-300">{fmtBRL(reqContrib)}/mês</span>
                    {reqContrib > cfg.initialMonthlyContrib && (
                      <> — aumento de {fmtBRL(reqContrib - cfg.initialMonthlyContrib)}/mês</>
                    )}
                  </p>
                  <p className="text-xs text-amber-400/60 mt-0.5">
                    Com o aporte atual você vai ter {Math.round(exceedsPct)}% da meta: {fmtBRL(displayFinal, true)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Projected final balance */}
            <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-1 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <Wallet size={12} />
                <span>Patrimônio {cfg.showRealValues ? 'real ' : ''}projetado</span>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums mt-1.5",
                exceedsPct >= 100 ? "text-emerald-400" : exceedsPct >= 65 ? "text-amber-400" : "text-[var(--text-primary)]"
              )}>
                {fmtBRL(displayFinal, true)}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", exceedsPct >= 100 ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ width: `${Math.min(exceedsPct, 100)}%` }}
                  />
                </div>
                <span className={cn("text-xs font-bold tabular-nums", exceedsPct >= 100 ? "text-emerald-400" : "text-amber-400")}>
                  {Math.round(exceedsPct)}%
                </span>
              </div>
            </div>

            {/* Passive income */}
            <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-1 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <TrendingUp size={12} />
                <span>Renda passiva/mês</span>
              </div>
              <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1.5">
                {fmtBRL(result.passiveIncome, true)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">regra dos {cfg.withdrawalRate}% ao ano</p>
            </div>

            {/* Total contributed */}
            <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-1 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <BarChart3 size={12} />
                <span>Total aportado</span>
              </div>
              <p className="text-2xl font-bold text-blue-400 tabular-nums mt-1.5">
                {fmtBRL(result.totalContributed, true)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {result.finalBalance > 0
                  ? `${Math.round((result.totalContributed / result.finalBalance) * 100)}% do patrimônio final`
                  : '—'
                }
              </p>
            </div>

            {/* Compound returns */}
            <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 space-y-1 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
                <Sparkles size={12} />
                <span>Gerado pelos juros</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1.5">
                {fmtBRL(result.totalReturns, true)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {result.finalBalance > 0 && result.totalContributed > 0
                  ? `${(result.finalBalance / result.totalContributed).toFixed(1).replace('.', ',')}× o total aportado`
                  : '—'
                }
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStartTracking}
              className="flex items-center justify-between px-3 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-500/50 text-amber-300 transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <PiggyBank size={16} className="text-amber-400 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold leading-tight">Acompanhar</p>
                  <p className="text-[10px] text-amber-400/70 leading-tight">plano mês a mês</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-amber-400/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
            <button
              onClick={() => router.push('/dashboard/aposentadoria/reservas')}
              className="flex items-center justify-between px-3 py-3 rounded-2xl border border-blue-500/30 bg-blue-500/8 hover:bg-blue-500/15 hover:border-blue-500/50 text-blue-300 transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Wallet size={16} className="text-blue-400 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold leading-tight">Reservas</p>
                  <p className="text-[10px] text-blue-400/70 leading-tight">fundos separados</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-blue-400/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* Chart */}
          <div className="bg-[var(--bg-overlay)] rounded-2xl p-4 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Evolução patrimonial</p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block opacity-80" />
                  Aportado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block opacity-80" />
                  Rendimentos
                </span>
              </div>
            </div>
            <div className="h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="gradReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: any) => `${v}a`}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: any) => fmtBRL(v, true)}
                    width={62}
                  />
                  <Tooltip content={(props: any) => <ChartTooltip {...props} />} />
                  {cfg.targetAmount > 0 && (
                    <ReferenceLine
                      y={chartTarget}
                      stroke="#f59e0b"
                      strokeDasharray="5 3"
                      strokeWidth={1.5}
                      label={{ value: 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="totalContributed"
                    stackId="1"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fill="url(#gradContrib)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="returns"
                    stackId="1"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="url(#gradReturns)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {cfg.showRealValues && (
              <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                Valores ajustados pela inflação de {cfg.annualInflation}% a.a.
              </p>
            )}
          </div>

          {/* Year-by-year table toggle */}
          <button
            onClick={() => setShowTable(t => !t)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            <span className="font-medium">Projeção ano a ano — {yearsToRetire} anos</span>
            {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[var(--bg-overlay)] rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                          {[
                            'Ano', 'Idade',
                            'Aporte/mês', 'Aporte/ano',
                            'Total aportado',
                            cfg.showRealValues ? 'Patrimônio real' : 'Patrimônio nominal',
                            'Rendimentos',
                          ].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[var(--text-muted)] font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((r, idx) => {
                          const displayBal = cfg.showRealValues ? r.realBalance : r.balance
                          const isGoalRow = r.year === result.goalReachedYear
                          const isEven = idx % 2 === 0
                          return (
                            <tr
                              key={r.year}
                              className={cn(
                                "border-b border-[var(--border-subtle)]/50 transition-colors",
                                isGoalRow
                                  ? "bg-emerald-500/10"
                                  : isEven
                                    ? "bg-transparent"
                                    : "bg-[var(--bg-primary)]/30"
                              )}
                            >
                              <td className="px-3 py-2 text-[var(--text-muted)] tabular-nums">
                                {r.year}
                                {isGoalRow && <span className="ml-1 text-emerald-400 text-[10px]">★</span>}
                              </td>
                              <td className="px-3 py-2 font-semibold text-[var(--text-primary)] tabular-nums">
                                {r.age}a
                              </td>
                              <td className="px-3 py-2 text-blue-400 tabular-nums whitespace-nowrap">
                                {fmtBRL(r.monthlyContrib)}
                              </td>
                              <td className="px-3 py-2 text-blue-400/70 tabular-nums whitespace-nowrap">
                                {fmtBRL(r.yearlyContrib, true)}
                              </td>
                              <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                                {fmtBRL(r.totalContributed, true)}
                              </td>
                              <td className={cn(
                                "px-3 py-2 font-bold tabular-nums whitespace-nowrap",
                                displayBal >= cfg.targetAmount ? "text-emerald-400" : "text-[var(--text-primary)]"
                              )}>
                                {fmtBRL(displayBal, true)}
                              </td>
                              <td className="px-3 py-2 text-emerald-400 tabular-nums whitespace-nowrap">
                                {fmtBRL(r.returns, true)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {cfg.showRealValues && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-2 border-t border-[var(--border-subtle)]">
                      Patrimônio ajustado pela inflação de {cfg.annualInflation}% a.a. (poder de compra em valores de hoje)
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
