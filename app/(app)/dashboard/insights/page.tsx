'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Trophy, Target, Flame, CheckCircle2, Loader2 } from 'lucide-react'
import { useAnalyticsData, buildHeatmapGrid, AnalyticsPeriod } from '@/lib/hooks/useAnalytics'
import { useSettings } from '@/lib/hooks/useSettings'
import { cn } from '@/lib/utils/cn'

// ────────────────────────────────────────────────────────────────────────────
// Color helpers
// ────────────────────────────────────────────────────────────────────────────
function scoreColor(score: number | null, target: number): string {
  if (score === null) return '#ffffff08'
  if (score === 0) return '#ef444480'
  if (score >= target) return '#22c55e'
  if (score >= target * 0.65) return '#f59e0b'
  return '#ef4444'
}

function scoreBg(score: number | null, target: number): string {
  if (score === null) return 'bg-white/5'
  if (score === 0) return 'bg-red-500/40'
  if (score >= target) return 'bg-green-500'
  if (score >= target * 0.65) return 'bg-amber-400'
  return 'bg-red-500'
}

function scoreBadge(score: number, target: number) {
  if (score >= target) return { label: 'Meta atingida', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
  if (score >= target * 0.65) return { label: 'Quase lá', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { label: 'Abaixo da meta', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
}

// ────────────────────────────────────────────────────────────────────────────
// Period tabs
// ────────────────────────────────────────────────────────────────────────────
const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
]

// ────────────────────────────────────────────────────────────────────────────
// Heatmap calendar
// ────────────────────────────────────────────────────────────────────────────
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function Heatmap({
  dailyData,
  period,
  target,
}: {
  dailyData: ReturnType<typeof useAnalyticsData>['dailyData']
  period: AnalyticsPeriod
  target: number
}) {
  const [tooltip, setTooltip] = useState<{ date: string; score: number | null; done: number; total: number } | null>(null)

  if (period === 'week') {
    // Large cells with day labels
    return (
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((l, i) => (
          <p key={i} className="text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{l}</p>
        ))}
        {dailyData.map(d => {
          const dayNum = parseInt(d.date.split('-')[2], 10)
          return (
            <div
              key={d.date}
              className={cn('flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-all', scoreBg(d.score, target))}
            >
              <span className={cn('text-lg font-black', d.score !== null ? 'text-white' : 'text-[var(--text-muted)]')}>{dayNum}</span>
              {d.score !== null && (
                <span className="text-[10px] font-black text-white/80">{d.score}%</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (period === 'month') {
    // Medium cells in a 7-col grid
    const grid = buildHeatmapGrid(dailyData)
    const numWeeks = Math.ceil(grid.length / 7)
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map(l => (
            <p key={l} className="text-center text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">{l}</p>
          ))}
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)', gap: 6, gridAutoFlow: 'column' }}
        >
          {grid.map((d, i) => {
            if (!d) return <div key={i} />
            const dayNum = parseInt(d.date.split('-')[2], 10)
            return (
              <div
                key={d.date}
                title={d.score !== null ? `${d.date}: ${d.score}%` : d.date}
                className={cn('w-full aspect-square rounded-lg flex items-center justify-center cursor-default transition-all', scoreBg(d.score, target))}
                onMouseEnter={() => setTooltip({ date: d.date, score: d.score, done: d.done, total: d.total })}
                onMouseLeave={() => setTooltip(null)}
              >
                <span className={cn('text-[10px] font-black', d.score !== null ? 'text-white' : 'text-[var(--text-muted)]')}>{dayNum}</span>
              </div>
            )
          })}
        </div>
        {tooltip && (
          <div className="text-xs text-[var(--text-muted)] px-1 mt-1">
            <span className="font-bold text-[var(--text-primary)]">{tooltip.date}</span>
            {tooltip.score !== null ? ` — ${tooltip.score}% (${tooltip.done}/${tooltip.total} hábitos)` : ' — sem hábitos'}
          </div>
        )}
      </div>
    )
  }

  // Year view — GitHub-style compact grid
  const grid = buildHeatmapGrid(dailyData)
  const numWeeks = Math.ceil(grid.length / 7)

  // Month labels for X-axis
  const monthLabels: { weekIdx: number; label: string }[] = []
  let lastMonth = -1
  grid.forEach((d, i) => {
    if (!d) return
    const month = parseInt(d.date.split('-')[1], 10)
    const weekIdx = Math.floor(i / 7)
    if (month !== lastMonth) {
      monthLabels.push({
        weekIdx,
        label: format(parseISO(d.date), 'MMM', { locale: ptBR }),
      })
      lastMonth = month
    }
  })

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 12px)`, gap: 3 }}
        className="overflow-x-auto scrollbar-none"
      >
        {Array.from({ length: numWeeks }, (_, wi) => {
          const monthLabel = monthLabels.find(m => m.weekIdx === wi)
          return (
            <div key={wi} className="text-[8px] text-[var(--text-muted)] font-bold whitespace-nowrap">
              {monthLabel?.label ?? ''}
            </div>
          )
        })}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] shrink-0">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="h-[12px] text-[7px] text-[var(--text-muted)] leading-[12px] w-5">{i % 2 === 0 ? l : ''}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="overflow-x-auto scrollbar-none">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${numWeeks}, 12px)`,
              gridTemplateRows: 'repeat(7, 12px)',
              gap: 3,
              gridAutoFlow: 'column',
              width: numWeeks * 15,
            }}
          >
            {grid.map((d, i) => {
              if (!d) return <div key={i} className="w-3 h-3 rounded-sm" />
              return (
                <div
                  key={d.date}
                  className="w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80"
                  style={{ backgroundColor: scoreColor(d.score, target) }}
                  onMouseEnter={() => setTooltip({ date: d.date, score: d.score, done: d.done, total: d.total })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[9px] text-[var(--text-muted)]">Menos</span>
        {[null, 0, 40, 65, 100].map((v, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: scoreColor(v === null ? null : v, target) }}
            title={v === null ? 'Sem dados' : `${v}%`}
          />
        ))}
        <span className="text-[9px] text-[var(--text-muted)]">Mais</span>
        {tooltip && (
          <span className="ml-2 text-[10px] text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)]">{tooltip.date}</span>
            {tooltip.score !== null ? ` — ${tooltip.score}%` : ' — sem hábitos'}
          </span>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Trend chart
// ────────────────────────────────────────────────────────────────────────────
function TrendChart({
  dailyData,
  period,
  target,
}: {
  dailyData: ReturnType<typeof useAnalyticsData>['dailyData']
  period: AnalyticsPeriod
  target: number
}) {
  const chartData = dailyData
    .filter(d => d.score !== null)
    .map(d => ({
      date: d.date,
      score: d.score,
      target,
    }))

  if (chartData.length === 0) return (
    <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">
      Sem dados suficientes para o gráfico.
    </div>
  )

  const tickCount = period === 'week' ? 7 : period === 'month' ? 6 : 12
  const tickInterval = Math.max(0, Math.floor(chartData.length / tickCount) - 1)

  const formatTick = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (period === 'week') return format(date, 'EEE', { locale: ptBR })
    if (period === 'month') return format(date, 'd/M')
    return format(date, 'MMM', { locale: ptBR })
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          interval={tickInterval}
          tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fill: '#666', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
        />
        <ReferenceLine
          y={target}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{ value: `Meta ${target}%`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 9, fontWeight: 700 }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-card, #111)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}
          labelFormatter={(label: any) => {
            const [y, m, d] = String(label).split('-').map(Number)
            return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
          }}
          formatter={(value: any) => [`${value}%`, 'Score']}
          cursor={{ stroke: '#ffffff20' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#scoreGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Habit breakdown bars
// ────────────────────────────────────────────────────────────────────────────
function HabitBreakdown({
  habitStats,
  target,
}: {
  habitStats: ReturnType<typeof useAnalyticsData>['habitStats']
  target: number
}) {
  if (habitStats.length === 0) return (
    <p className="text-sm text-[var(--text-muted)] italic px-1">Nenhum dado de hábitos neste período.</p>
  )

  const barData = habitStats.map(h => ({
    name: h.emoji ? `${h.emoji} ${h.name}` : h.name,
    rate: h.completionRate,
    scheduled: h.scheduledDays,
    done: h.doneDays,
    streak: h.streak,
  }))

  const chartHeight = Math.max(120, barData.length * 44 + 20)

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={barData}
          margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
          barSize={16}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--text-secondary, #aaa)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <ReferenceLine x={target} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card, #111)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
            }}
            formatter={(value: any, _name: any, props: any) => [
              `${value}% (${props.payload.done}/${props.payload.scheduled} dias)`,
              'Conclusão',
            ]}
          />
          <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
            {barData.map((entry, i) => (
              <Cell key={i} fill={scoreColor(entry.rate, target)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Streak badges below chart */}
      <div className="flex flex-wrap gap-2">
        {habitStats.map(h => h.streak > 0 && (
          <div key={h.id} className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-full">
            <Flame size={11} className="text-orange-400" />
            <span className="text-[10px] font-black text-[var(--text-secondary)]">
              {h.emoji} {h.streak}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const { data: settings } = useSettings()
  const target = settings?.score_target ?? 80

  const { dailyData, habitStats, summary } = useAnalyticsData(period, target)
  const badge = summary.avgScore > 0 ? scoreBadge(summary.avgScore, target) : null

  const isLoading = dailyData.length === 0

  return (
    <div className="flex-1 min-h-screen p-4 md:p-6 lg:p-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[var(--text-primary)]">
            Retrospectiva
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Meta configurada: <span className="font-black text-amber-400">{target}%</span>
          </p>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 bg-[var(--bg-overlay)] p-1 rounded-2xl self-start">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                period === p.key
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Average score — big card */}
        <div className={cn(
          'col-span-2 md:col-span-1 p-5 rounded-2xl border flex flex-col gap-2',
          summary.avgScore >= target
            ? 'bg-green-500/10 border-green-500/20'
            : summary.avgScore >= target * 0.65
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-red-500/10 border-red-500/20'
        )}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Score médio</p>
          <p className={cn(
            'text-5xl font-black tabular-nums',
            summary.avgScore >= target ? 'text-green-400'
              : summary.avgScore >= target * 0.65 ? 'text-amber-400'
              : 'text-red-400'
          )}>
            {summary.avgScore}<span className="text-2xl">%</span>
          </p>
          {badge && (
            <span className={cn('self-start text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border', badge.cls)}>
              {badge.label}
            </span>
          )}
        </div>

        <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dias na meta</p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-3xl font-black text-green-400">{summary.daysAtTarget}</span>
            <span className="text-sm text-[var(--text-muted)] mb-0.5">/ {summary.daysTotal}</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: summary.daysTotal > 0 ? `${(summary.daysAtTarget / summary.daysTotal) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Melhor dia</p>
          <span className="text-3xl font-black text-[var(--text-primary)] mt-1">{summary.bestScore}%</span>
          <TrendingUp size={14} className="text-green-400 mt-auto" />
        </div>

        <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Concluídos</p>
          <span className="text-3xl font-black text-[var(--text-primary)] mt-1">{summary.totalDone}</span>
          <div className="flex items-center gap-1 mt-auto">
            <CheckCircle2 size={12} className="text-green-400" />
            <span className="text-[9px] text-[var(--text-muted)]">hábitos done</span>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="p-4 md:p-5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl space-y-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          📈 Evolução
        </p>
        <TrendChart dailyData={dailyData} period={period} target={target} />
      </div>

      {/* Heatmap */}
      <div className="p-4 md:p-5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            🟩 Calendário de atividade
          </p>
          <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Meta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Perto</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Abaixo</span>
          </div>
        </div>
        <Heatmap dailyData={dailyData} period={period} target={target} />
      </div>

      {/* Habit breakdown */}
      <div className="p-4 md:p-5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl space-y-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          💪 Desempenho por hábito
        </p>
        <HabitBreakdown habitStats={habitStats} target={target} />
      </div>

    </div>
  )
}
