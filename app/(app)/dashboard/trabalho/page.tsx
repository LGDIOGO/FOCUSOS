'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Check, Minus, X, Clock, Copy,
  CalendarDays, ListTodo, BarChart3, Pencil, AlertTriangle, Briefcase,
  Sun, FileDown,
} from 'lucide-react'
import {
  format, addDays, addWeeks, startOfWeek, isSameDay, isFuture, startOfDay, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import {
  WorkItemModal, KIND_META, PRIORITY_META, SELECTABLE_KINDS,
  channelColor, channelTextColor, CHANNEL_ALL, CHANNEL_INTERNAL,
} from '@/components/dashboard/WorkItemModal'
import {
  useWorkItems, useWorkLogs, useLogWorkItem, expandOccurrences, buildReport,
  type WorkOccurrence,
} from '@/lib/hooks/useWork'
import type { WorkItem, WorkStatus } from '@/types'

type View = 'hoje' | 'semana' | 'pendencias' | 'relatorio'

const STATUS_BTN: { id: WorkStatus; label: string; icon: any; on: string }[] = [
  { id: 'done',    label: 'Concluído', icon: Check, on: 'bg-emerald-500 text-white border-emerald-400' },
  { id: 'partial', label: 'Parcial',   icon: Minus, on: 'bg-amber-400 text-black border-amber-300' },
  { id: 'failed',  label: 'Não feito', icon: X,     on: 'bg-red-500 text-white border-red-400' },
]

const fmtMin = (m: number) => {
  if (!m) return '0h'
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h${r ? ` ${r}min` : ''}` : `${r}min`
}

function FilterChip({
  active, onClick, label, color,
}: {
  active: boolean; onClick: () => void; label: string; color?: string
}) {
  const style = color
    ? (active
        ? { backgroundColor: color, borderColor: color, color: channelTextColor(color) }
        : { borderColor: `${color}55`, color })
    : undefined

  return (
    <button
      onClick={onClick}
      style={style}
      className={cn(
        'shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all',
        color
          ? 'hover:brightness-125'
          : active
            ? 'bg-white text-black border-white'
            : 'text-white/35 border-white/8 hover:border-white/25 hover:text-white/70'
      )}
    >
      {label}
    </button>
  )
}

// ─── Cartão de ocorrência ────────────────────────────────────────────────────

function OccurrenceCard({
  occ, onSetStatus, onEdit, showDate,
}: {
  occ: WorkOccurrence
  onSetStatus: (s: WorkStatus) => void
  onEdit: () => void
  showDate?: boolean
}) {
  const meta = KIND_META[occ.kind]
  const isPast = occ.occurrence_date < format(new Date(), 'yyyy-MM-dd')
  const missed = isPast && occ.status === 'none'

  return (
    <div className={cn(
      'rounded-2xl border p-3.5 transition-all',
      occ.status === 'done'    ? 'bg-emerald-500/[0.06] border-emerald-500/20'
      : occ.status === 'partial' ? 'bg-amber-400/[0.06] border-amber-400/20'
      : occ.status === 'failed'  ? 'bg-red-500/[0.06] border-red-500/20'
      : missed                   ? 'bg-white/[0.02] border-amber-500/25'
      : 'bg-white/[0.03] border-white/[0.08]'
    )}>
      <div className="flex items-start gap-3">
        <span className={cn('w-1.5 h-1.5 rounded-full mt-2 shrink-0', meta.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-sm font-bold truncate',
              occ.status === 'done' ? 'text-white/50 line-through' : 'text-white'
            )}>
              {occ.title}
            </span>
            {occ.priority && occ.priority !== 'medium' && (
              <span className={cn(
                'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                PRIORITY_META[occ.priority].color
              )}>
                {PRIORITY_META[occ.priority].label}
              </span>
            )}
            {missed && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-amber-400">
                <AlertTriangle size={9} /> sem registro
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-1 text-[10px] font-bold text-white/35">
            <span className={cn('px-1.5 py-0.5 rounded-md', meta.color)}>{meta.label}</span>
            {occ.marketplace && (
              <span
                className="px-1.5 py-0.5 rounded-md font-black"
                style={{ backgroundColor: channelColor(occ.marketplace), color: channelTextColor(channelColor(occ.marketplace)) }}
              >
                {occ.marketplace}
              </span>
            )}
            {showDate && (
              <span className="capitalize">
                {format(parseISO(`${occ.occurrence_date}T12:00:00`), "EEE, dd/MM", { locale: ptBR })}
              </span>
            )}
            {occ.time && <span className="flex items-center gap-1"><Clock size={9} />{occ.time}</span>}
            {occ.duration_min ? <span>{fmtMin(occ.duration_min)}</span> : null}
            {occ.project && <span className="text-white/50">· {occ.project}</span>}
          </div>

          {occ.description && (
            <p className="text-[11px] text-white/30 mt-1.5 line-clamp-2">{occ.description}</p>
          )}
        </div>

        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-all shrink-0"
          aria-label="Editar"
        >
          <Pencil size={13} />
        </button>
      </div>

      <div className="flex gap-1.5 mt-3">
        {STATUS_BTN.map(b => (
          <button
            key={b.id}
            onClick={() => onSetStatus(occ.status === b.id ? 'none' : b.id)}
            className={cn(
              'flex-1 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all',
              occ.status === b.id ? b.on : 'border-white/8 text-white/30 hover:border-white/25 hover:text-white/70'
            )}
          >
            <b.icon size={11} strokeWidth={3} />
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function TrabalhoPage() {
  const [view, setView] = useState<View>('hoje')
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)  // navegação da aba Hoje
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkItem | null>(null)
  const [modalDate, setModalDate] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [kindFilter, setKindFilter] = useState<string>('')

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), // semana comercial: segunda
    [weekOffset]
  )
  const range = useMemo(() => ({
    start: format(weekStart, 'yyyy-MM-dd'),
    end: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
  }), [weekStart])

  // A aba Hoje navega por dia, independente da semana que as outras mostram.
  const selectedDay = useMemo(() => addDays(new Date(), dayOffset), [dayOffset])
  const selectedDayStr = useMemo(() => format(selectedDay, 'yyyy-MM-dd'), [selectedDay])

  const { data: items = [], isLoading } = useWorkItems()
  const { data: logs = [] } = useWorkLogs(range.start, range.end)
  const { data: dayLogs = [] } = useWorkLogs(selectedDayStr, selectedDayStr)
  const logItem = useLogWorkItem()

  const allOccurrences = useMemo(
    () => expandOccurrences(items, logs, range.start, range.end),
    [items, logs, range.start, range.end]
  )

  // Canais que o usuário realmente usa — a barra de filtro não lista os 10
  // marketplaces do catálogo, só os que aparecem nos itens dele.
  const usedChannels = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => set.add(i.marketplace?.trim() || CHANNEL_INTERNAL))
    return Array.from(set).sort()
  }, [items])

  const usedKinds = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => set.add(i.kind))
    return SELECTABLE_KINDS.filter(k => set.has(k))
  }, [items])

  const occurrences = useMemo(() => allOccurrences.filter(o => {
    if (channelFilter) {
      const ch = o.marketplace?.trim() || CHANNEL_INTERNAL
      // Item marcado como "Todos" vale para qualquer marketplace, então entra
      // junto ao filtrar um canal específico — mas não quando o filtro é
      // "Interno", que é justamente o que não pertence a marketplace nenhum.
      const matches = ch === channelFilter
        || (ch === CHANNEL_ALL && channelFilter !== CHANNEL_INTERNAL && channelFilter !== CHANNEL_ALL)
      if (!matches) return false
    }
    if (kindFilter && o.kind !== kindFilter) return false
    return true
  }), [allOccurrences, channelFilter, kindFilter])

  const report = useMemo(() => buildReport(occurrences, todayStr), [occurrences, todayStr])

  const matchesFilters = (o: WorkOccurrence) => {
    if (channelFilter) {
      const ch = o.marketplace?.trim() || CHANNEL_INTERNAL
      const ok = ch === channelFilter
        || (ch === CHANNEL_ALL && channelFilter !== CHANNEL_INTERNAL && channelFilter !== CHANNEL_ALL)
      if (!ok) return false
    }
    if (kindFilter && o.kind !== kindFilter) return false
    return true
  }

  const dayOccurrences = useMemo(
    () => expandOccurrences(items, dayLogs, selectedDayStr, selectedDayStr).filter(matchesFilters),
    [items, dayLogs, selectedDayStr, channelFilter, kindFilter] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const dayStats = useMemo(() => {
    const done = dayOccurrences.filter(o => o.status === 'done').length
    const partial = dayOccurrences.filter(o => o.status === 'partial').length
    const open = dayOccurrences.filter(o => o.status === 'none').length
    const total = dayOccurrences.length
    const rate = total > 0 ? Math.round(((done + partial * 0.5) / total) * 100) : null
    return { done, partial, open, total, rate }
  }, [dayOccurrences])

  const byDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      const iso = format(d, 'yyyy-MM-dd')
      return { date: d, iso, items: occurrences.filter(o => o.occurrence_date === iso) }
    })
    return days
  }, [weekStart, occurrences])

  // Pendências: tudo que já passou e não foi resolvido, mais o que ainda vem.
  const pendencias = useMemo(() => ({
    atrasadas: occurrences.filter(o => o.occurrence_date < todayStr && o.status === 'none'),
    hoje: occurrences.filter(o => o.occurrence_date === todayStr && o.status === 'none'),
    proximas: occurrences.filter(o => o.occurrence_date > todayStr),
  }), [occurrences, todayStr])

  const setStatus = (occ: WorkOccurrence, status: WorkStatus) =>
    logItem.mutate({ itemId: occ.id, status, logDate: occ.occurrence_date })

  const openNew = (date?: string) => { setEditing(null); setModalDate(date); setModalOpen(true) }
  const openEdit = (occ: WorkOccurrence) => {
    const full = items.find(i => i.id === occ.id)
    if (full) { setEditing(full); setModalDate(undefined); setModalOpen(true) }
  }

  const weekLabel = `${format(weekStart, "d MMM", { locale: ptBR })} — ${format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}`

  const copyReport = async () => {
    const tag = (o: WorkOccurrence) => {
      const parts = [o.marketplace, o.project].filter(Boolean)
      return parts.length ? ` (${parts.join(' · ')})` : ''
    }
    const filtro = [
      channelFilter && `canal: ${channelFilter}`,
      kindFilter && `tipo: ${KIND_META[kindFilter as keyof typeof KIND_META]?.label}`,
    ].filter(Boolean).join(' | ')

    const lines = [
      `RELATÓRIO DE TRABALHO — ${weekLabel}`,
      filtro ? `Filtro aplicado: ${filtro}` : '',
      ``,
      `Aproveitamento: ${report.completionRate}%  (${report.done} concluídos, ${report.partial} parciais, ${report.failed} não feitos, ${report.pending} sem registro)`,
      report.plannedMinutes ? `Horas previstas: ${fmtMin(report.plannedMinutes)}` : '',
      ``,
      `CONCLUÍDO (${report.concluded.length})`,
      ...report.concluded.map(o => `  - [${format(parseISO(`${o.occurrence_date}T12:00:00`), 'dd/MM')}] ${o.title}${tag(o)}${o.status === 'partial' ? ' — parcial' : ''}`),
      ``,
      `PENDENTE / NÃO FEITO (${report.unresolved.length})`,
      ...report.unresolved.map(o => `  - [${format(parseISO(`${o.occurrence_date}T12:00:00`), 'dd/MM')}] ${o.title}${tag(o)}`),
      ``,
      `POR CANAL`,
      ...report.byMarketplace.map(m => `  - ${m.marketplace}: ${m.done}/${m.total} (${m.rate}%)`),
      ``,
      `POR SOLICITANTE`,
      ...report.byProject.map(p => `  - ${p.project}: ${p.done}/${p.total} (${p.rate}%)`),
    ].filter(l => l !== '')
    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // navigator.clipboard exige HTTPS e permissão; em PWA/iOS pode falhar.
      // O fallback antigo era silencioso — o botão parecia não fazer nada.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      let ok = false
      try { ok = document.execCommand('copy') } catch { /* sem suporte */ }
      document.body.removeChild(ta)
      if (ok) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setCopyError(true)
        setTimeout(() => setCopyError(false), 4000)
      }
    }
  }

  /**
   * Sem biblioteca de PDF: monta um documento próprio numa janela e chama a
   * impressão do navegador, onde "Salvar como PDF" já existe. Evita ~500kB de
   * bundle e sai com texto selecionável.
   */
  const exportPdf = () => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    const linha = (o: WorkOccurrence) => `
      <tr>
        <td class="d">${format(parseISO(`${o.occurrence_date}T12:00:00`), 'dd/MM')}</td>
        <td>${esc(o.title)}</td>
        <td class="m">${esc(o.marketplace || CHANNEL_INTERNAL)}</td>
        <td class="m">${esc(o.project || '—')}</td>
        <td class="s ${o.status}">${
          o.status === 'done' ? 'Concluído'
          : o.status === 'partial' ? 'Parcial'
          : o.status === 'failed' ? 'Não feito' : 'Sem registro'
        }</td>
      </tr>`

    const filtro = [
      channelFilter && `Canal: ${channelFilter}`,
      kindFilter && `Tipo: ${KIND_META[kindFilter as keyof typeof KIND_META]?.label}`,
    ].filter(Boolean).join(' · ')

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório de trabalho — ${esc(weekLabel)}</title>
<style>
  *{box-sizing:border-box}
  body{font:13px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:32px;}
  h1{font-size:19px;margin:0 0 2px}
  .sub{color:#666;font-size:12px;margin-bottom:18px}
  .kpis{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap}
  .kpi{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:104px}
  .kpi b{display:block;font-size:21px;line-height:1}
  .kpi span{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#777}
  h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:22px 0 8px;border-bottom:1px solid #e5e5e5;padding-bottom:5px}
  table{width:100%;border-collapse:collapse}
  td,th{padding:5px 6px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
  th{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#888}
  td.d{white-space:nowrap;color:#888;width:46px}
  td.m{color:#666;font-size:11px;white-space:nowrap}
  td.s{white-space:nowrap;font-weight:600;font-size:11px;width:88px}
  td.s.done{color:#06843c}td.s.partial{color:#9a6a00}
  td.s.failed{color:#c62828}td.s.none{color:#888}
  .bars td{border:none;padding:3px 6px 3px 0}
  .bar{height:7px;background:#eee;border-radius:4px;overflow:hidden;width:150px}
  .bar>i{display:block;height:100%;background:#333}
  .foot{margin-top:26px;color:#999;font-size:10px;border-top:1px solid #eee;padding-top:8px}
  @media print{body{margin:14mm}.noprint{display:none}}
</style></head><body>
<h1>Relatório de trabalho</h1>
<div class="sub">${esc(weekLabel)}${filtro ? ` · ${esc(filtro)}` : ''}</div>

<div class="kpis">
  <div class="kpi"><b>${report.completionRate}%</b><span>Aproveitamento</span></div>
  <div class="kpi"><b>${report.done}</b><span>Concluídos</span></div>
  <div class="kpi"><b>${report.partial}</b><span>Parciais</span></div>
  <div class="kpi"><b>${report.failed}</b><span>Não feitos</span></div>
  <div class="kpi"><b>${report.pending}</b><span>Sem registro</span></div>
  ${report.plannedMinutes ? `<div class="kpi"><b>${esc(fmtMin(report.plannedMinutes))}</b><span>Previsto</span></div>` : ''}
</div>

${report.concluded.length ? `<h2>Concluído (${report.concluded.length})</h2>
<table><tr><th>Data</th><th>Item</th><th>Canal</th><th>Solicitante</th><th>Status</th></tr>
${report.concluded.map(linha).join('')}</table>` : ''}

${report.unresolved.length ? `<h2>Ficou para trás (${report.unresolved.length})</h2>
<table><tr><th>Data</th><th>Item</th><th>Canal</th><th>Solicitante</th><th>Status</th></tr>
${report.unresolved.map(linha).join('')}</table>` : ''}

${report.byMarketplace.length ? `<h2>Por canal</h2><table class="bars">
${report.byMarketplace.map(m => `<tr><td style="width:150px">${esc(m.marketplace)}</td>
<td><div class="bar"><i style="width:${m.rate}%"></i></div></td>
<td style="width:70px;text-align:right;color:#666">${m.done}/${m.total} · ${m.rate}%</td></tr>`).join('')}
</table>` : ''}

${report.byProject.length ? `<h2>Por solicitante</h2><table class="bars">
${report.byProject.map(p => `<tr><td style="width:150px">${esc(p.project)}</td>
<td><div class="bar"><i style="width:${p.rate}%"></i></div></td>
<td style="width:70px;text-align:right;color:#666">${p.done}/${p.total} · ${p.rate}%</td></tr>`).join('')}
</table>` : ''}

<div class="foot">FocusOS · gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`

    const win = window.open('', '_blank')
    if (!win) { setPdfError(true); setTimeout(() => setPdfError(false), 5000); return }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 lg:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Trabalho</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
            Demandas por canal
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
        >
          <Plus size={15} /> Novo
        </button>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.07] w-fit mb-5">
        {([
          { id: 'hoje', label: 'Hoje', icon: Sun },
          { id: 'semana', label: 'Semana', icon: CalendarDays },
          { id: 'pendencias', label: 'Pendências', icon: ListTodo },
          { id: 'relatorio', label: 'Relatório', icon: BarChart3 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              view === t.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            )}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Navegação de dia — só na aba Hoje */}
      {view === 'hoje' && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            onClick={() => setDayOffset(d => d - 1)}
            aria-label="Dia anterior"
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <div className="text-sm font-black text-white capitalize">
              {dayOffset === 0 ? 'Hoje' : dayOffset === -1 ? 'Ontem' : dayOffset === 1 ? 'Amanhã'
                : format(selectedDay, "EEEE", { locale: ptBR })}
            </div>
            <button
              onClick={() => setDayOffset(0)}
              className={cn(
                'text-[9px] font-black uppercase tracking-widest transition-colors mt-0.5',
                dayOffset === 0 ? 'text-white/30 pointer-events-none' : 'text-white/40 hover:text-white'
              )}
            >
              {dayOffset === 0
                ? format(selectedDay, "d 'de' MMMM", { locale: ptBR })
                : `${format(selectedDay, 'dd/MM')} · voltar para hoje`}
            </button>
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            aria-label="Próximo dia"
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navegação de semana — nas demais abas */}
      {view !== 'hoje' && (
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          aria-label="Semana anterior"
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-sm font-black text-white">
            {weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana passada' : weekLabel}
          </div>
          <button
            onClick={() => setWeekOffset(0)}
            className={cn(
              'text-[9px] font-black uppercase tracking-widest transition-colors mt-0.5',
              weekOffset === 0 ? 'text-white/30 pointer-events-none' : 'text-white/40 hover:text-white'
            )}
          >
            {weekOffset === 0 ? weekLabel : 'Voltar para hoje'}
          </button>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          aria-label="Próxima semana"
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      )}

      {/* Filtros — só aparecem quando há mais de um valor para escolher */}
      {items.length > 0 && (usedChannels.length > 1 || usedKinds.length > 1) && (
        <div className="space-y-2 mb-5">
          {usedChannels.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/25 shrink-0 pr-1">Canal</span>
              <FilterChip active={!channelFilter} onClick={() => setChannelFilter('')} label="Todos" />
              {usedChannels.map(c => (
                <FilterChip
                  key={c}
                  active={channelFilter === c}
                  onClick={() => setChannelFilter(c)}
                  label={c}
                  color={channelColor(c)}
                />
              ))}
            </div>
          )}
          {usedKinds.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/25 shrink-0 pr-1">Tipo</span>
              <FilterChip active={!kindFilter} onClick={() => setKindFilter('')} label="Todos" />
              {usedKinds.map(k => (
                <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)} label={KIND_META[k].label} />
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-white/30 text-sm font-medium py-10 text-center">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <Briefcase size={22} className="text-white/25" />
          </div>
          <p className="text-white font-bold mb-1">Nada por aqui ainda</p>
          <p className="text-white/35 text-sm mb-5 max-w-sm mx-auto">
            Registre demandas, anúncios, campanhas e análises — marcando o canal
            de cada uma para filtrar depois. O que se repete entra uma vez só.
          </p>
          <button
            onClick={() => openNew()}
            className="px-5 py-2.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
          >
            Adicionar o primeiro
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* ── HOJE ── */}
          {view === 'hoje' && (
            <motion.div key="hoje" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {dayOccurrences.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center">
                  <p className="text-white/40 text-sm font-bold">
                    {dayOffset === 0 ? 'Nada marcado para hoje.' : 'Nada marcado para este dia.'}
                  </p>
                  <button
                    onClick={() => openNew(selectedDayStr)}
                    className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/25 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all"
                  >
                    Adicionar neste dia
                  </button>
                </div>
              ) : (
                <>
                  {/* Placar do dia */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <p className={cn(
                        'text-3xl font-black tabular-nums leading-none',
                        dayStats.rate === null ? 'text-white/30'
                          : dayStats.rate >= 80 ? 'text-emerald-400'
                          : dayStats.rate >= 50 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {dayStats.rate === null ? '—' : `${dayStats.rate}%`}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mt-1">do dia</p>
                    </div>
                    <div className="h-10 w-px bg-white/[0.08]" />
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Concluídos', v: dayStats.done, c: 'text-emerald-400' },
                        { label: 'Parciais', v: dayStats.partial, c: 'text-amber-400' },
                        { label: 'Em aberto', v: dayStats.open, c: 'text-white/50' },
                      ].map(s => (
                        <div key={s.label}>
                          <p className={cn('text-lg font-black tabular-nums leading-none', s.c)}>{s.v}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Em aberto primeiro — é o que precisa de ação hoje. */}
                  {([
                    { label: 'Em aberto', list: dayOccurrences.filter(o => o.status === 'none'), tone: 'text-white' },
                    { label: 'Já respondidos', list: dayOccurrences.filter(o => o.status !== 'none'), tone: 'text-white/35' },
                  ] as const).map(sec => sec.list.length > 0 && (
                    <div key={sec.label}>
                      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2', sec.tone)}>
                        {sec.label} · {sec.list.length}
                      </p>
                      <div className="space-y-2">
                        {sec.list.map(occ => (
                          <OccurrenceCard
                            key={`${occ.id}_${occ.occurrence_date}`}
                            occ={occ}
                            onSetStatus={s => setStatus(occ, s)}
                            onEdit={() => openEdit(occ)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => openNew(selectedDayStr)}
                    className="w-full py-3 rounded-2xl border border-dashed border-white/[0.1] text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:border-white/30 transition-all"
                  >
                    + Adicionar neste dia
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ── SEMANA ── */}
          {view === 'semana' && (
            <motion.div key="semana" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              {byDay.map(({ date, iso, items: dayItems }) => {
                const isToday = isSameDay(date, new Date())
                const future = isFuture(startOfDay(date)) && !isToday
                return (
                  <div key={iso}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[11px] font-black uppercase tracking-widest capitalize',
                          isToday ? 'text-white' : 'text-white/35'
                        )}>
                          {format(date, 'EEEE', { locale: ptBR })}
                        </span>
                        <span className={cn(
                          'text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md',
                          isToday ? 'bg-white text-black' : 'text-white/25'
                        )}>
                          {format(date, 'dd/MM')}
                        </span>
                      </div>
                      <button
                        onClick={() => openNew(iso)}
                        className="text-white/20 hover:text-white transition-colors p-1"
                        aria-label={`Adicionar em ${format(date, 'dd/MM')}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {dayItems.length === 0 ? (
                      <div className={cn(
                        'rounded-2xl border border-dashed border-white/[0.06] py-3 text-center text-[11px] font-bold',
                        future ? 'text-white/15' : 'text-white/20'
                      )}>
                        {future ? 'Livre' : 'Nada registrado'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayItems.map(occ => (
                          <OccurrenceCard
                            key={`${occ.id}_${occ.occurrence_date}`}
                            occ={occ}
                            onSetStatus={s => setStatus(occ, s)}
                            onEdit={() => openEdit(occ)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ── PENDÊNCIAS ── */}
          {view === 'pendencias' && (
            <motion.div key="pend" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {([
                { key: 'atrasadas', label: 'Sem registro (já passou)', list: pendencias.atrasadas, tone: 'text-amber-400' },
                { key: 'hoje',      label: 'Hoje',                     list: pendencias.hoje,      tone: 'text-white' },
                { key: 'proximas',  label: 'Próximos dias',            list: pendencias.proximas,  tone: 'text-white/40' },
              ] as const).map(sec => (
                <div key={sec.key}>
                  <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2', sec.tone)}>
                    {sec.label} · {sec.list.length}
                  </p>
                  {sec.list.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.06] py-3 text-center text-[11px] font-bold text-white/20">
                      Nada aqui
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sec.list.map(occ => (
                        <OccurrenceCard
                          key={`${occ.id}_${occ.occurrence_date}`}
                          occ={occ}
                          showDate
                          onSetStatus={s => setStatus(occ, s)}
                          onEdit={() => openEdit(occ)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ── RELATÓRIO ── */}
          {view === 'relatorio' && (
            <motion.div key="rel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              {report.total === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] py-10 text-center">
                  <p className="text-white/40 text-sm font-bold">Nada a relatar nesta semana ainda.</p>
                  <p className="text-white/20 text-xs mt-1">O relatório conta apenas dias que já passaram.</p>
                </div>
              ) : (
                <>
                  {/* Destaque */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Aproveitamento</p>
                        <p className={cn(
                          'text-4xl font-black tabular-nums leading-none mt-1',
                          report.completionRate >= 80 ? 'text-emerald-400'
                            : report.completionRate >= 50 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {report.completionRate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={copyReport}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/25 text-[9px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all"
                        >
                          <Copy size={11} /> {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          onClick={exportPdf}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/25 text-[9px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all"
                        >
                          <FileDown size={11} /> PDF
                        </button>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                      {[
                        { n: report.done, cls: 'bg-emerald-500' },
                        { n: report.partial, cls: 'bg-amber-400' },
                        { n: report.failed, cls: 'bg-red-500' },
                        { n: report.pending, cls: 'bg-white/15' },
                      ].map((s, i) => s.n > 0 && (
                        <div key={i} className={s.cls} style={{ width: `${(s.n / report.total) * 100}%` }} />
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                        { label: 'Concluídos', v: report.done, c: 'text-emerald-400' },
                        { label: 'Parciais', v: report.partial, c: 'text-amber-400' },
                        { label: 'Não feitos', v: report.failed, c: 'text-red-400' },
                        { label: 'Sem registro', v: report.pending, c: 'text-white/40' },
                      ].map(s => (
                        <div key={s.label}>
                          <p className={cn('text-lg font-black tabular-nums leading-none', s.c)}>{s.v}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {report.plannedMinutes > 0 && (
                      <p className="text-[10px] font-bold text-white/30 mt-4 pt-3 border-t border-white/[0.06]">
                        Tempo previsto na semana: <span className="text-white/60">{fmtMin(report.plannedMinutes)}</span>
                      </p>
                    )}
                    {copyError && (
                      <p className="text-[10px] font-bold text-amber-400 mt-2">
                        O navegador bloqueou a cópia. Use o PDF ou copie da tela.
                      </p>
                    )}
                    {pdfError && (
                      <p className="text-[10px] font-bold text-amber-400 mt-2">
                        O navegador bloqueou a nova janela. Libere pop-ups para este site e tente de novo.
                      </p>
                    )}
                  </div>

                  {/* Por dia */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Por dia</p>
                    <div className="space-y-2">
                      {report.byDay.map(d => (
                        <div key={d.date} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-white/40 w-16 capitalize shrink-0">
                            {format(parseISO(`${d.date}T12:00:00`), 'EEE dd', { locale: ptBR })}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                (d.rate ?? 0) >= 80 ? 'bg-emerald-500' : (d.rate ?? 0) >= 50 ? 'bg-amber-400' : 'bg-red-500'
                              )}
                              style={{ width: `${d.rate ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black tabular-nums text-white/40 w-14 text-right shrink-0">
                            {d.done}/{d.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Por canal e por solicitante */}
                  {([
                    { label: 'Por canal', rows: report.byMarketplace.map(m => ({ k: m.marketplace, ...m })), colored: true },
                    { label: 'Por solicitante', rows: report.byProject.map(p => ({ k: p.project, ...p })), colored: false },
                  ] as const).map(sec => sec.rows.length > 0 && (
                    <div key={sec.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">{sec.label}</p>
                      <div className="space-y-2.5">
                        {sec.rows.map(r => (
                          <div key={r.k} className="flex items-center gap-3">
                            {sec.colored && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: channelColor(r.k) }}
                              />
                            )}
                            <span className="text-xs font-bold text-white/70 flex-1 truncate">{r.k}</span>
                            <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${r.rate}%`,
                                  backgroundColor: sec.colored ? channelColor(r.k) : '#60A5FA',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-black tabular-nums text-white/40 w-14 text-right shrink-0">
                              {r.done}/{r.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Por tipo de item */}
                  {report.byKind.length > 1 && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Por tipo</p>
                      <div className="flex flex-wrap gap-2">
                        {report.byKind.map(k => (
                          <div key={k.kind} className={cn(
                            'px-2.5 py-1.5 rounded-xl border text-[10px] font-black',
                            KIND_META[k.kind as keyof typeof KIND_META]?.color || 'text-white/50 border-white/10'
                          )}>
                            {KIND_META[k.kind as keyof typeof KIND_META]?.label || k.kind} · {k.done}/{k.total}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Listas */}
                  {([
                    { label: `Concluído nesta semana`, list: report.concluded, tone: 'text-emerald-400' },
                    { label: `Ficou para trás`, list: report.unresolved, tone: 'text-amber-400' },
                  ] as const).map(sec => sec.list.length > 0 && (
                    <div key={sec.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-3', sec.tone)}>
                        {sec.label} · {sec.list.length}
                      </p>
                      <div className="space-y-1.5">
                        {sec.list.map(o => (
                          <div key={`${o.id}_${o.occurrence_date}`} className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] font-black tabular-nums text-white/25 w-11 shrink-0">
                              {format(parseISO(`${o.occurrence_date}T12:00:00`), 'dd/MM')}
                            </span>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', KIND_META[o.kind].dot)} />
                            <span className="font-bold text-white/75 truncate flex-1">{o.title}</span>
                            {o.status === 'partial' && (
                              <span className="text-[8px] font-black uppercase text-amber-400 shrink-0">parcial</span>
                            )}
                            {o.project && (
                              <span className="text-[9px] font-bold text-white/25 truncate max-w-[90px] shrink-0">{o.project}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <WorkItemModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setModalDate(undefined) }}
        itemToEdit={editing}
        defaultDate={modalDate}
      />
    </div>
  )
}
