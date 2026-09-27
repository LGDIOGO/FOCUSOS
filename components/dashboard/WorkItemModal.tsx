'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2, Settings2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'
import { useCreateWorkItem, useUpdateWorkItem, useDeleteWorkItem } from '@/lib/hooks/useWork'
import { WorkNotes } from '@/components/dashboard/WorkNotes'
import { useResolvedLabels, labelTextColor } from '@/lib/hooks/useWorkLabels'
import type { WorkItem, WorkKind, RecurrenceRule, TaskPriority } from '@/types'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * Nomes da primeira versão, quando o tipo era um enum de e-commerce. Itens já
 * gravados continuam com estes valores, então eles são traduzidos na exibição.
 */
const LEGACY_KIND_LABEL: Record<string, string> = {
  demand: 'Demanda', listing: 'Anúncio', campaign: 'Campanha',
  analysis: 'Análise', stock: 'Estoque', service: 'Atendimento',
  meeting: 'Reunião', task: 'Tarefa', deadline: 'Prazo', delivery: 'Entrega',
}

/** Rótulo legível de um tipo, seja ele legado ou criado pelo usuário. */
export const kindLabel = (kind?: string) => {
  const k = (kind || '').trim()
  return LEGACY_KIND_LABEL[k] || k || 'Sem tipo'
}

/** Categoria vazia — trabalho que não pertence a nenhuma. */
export const CHANNEL_INTERNAL = 'Interno'

/**
 * Item marcado como "Todos" vale para qualquer categoria, então continua
 * aparecendo ao filtrar uma específica. Quem não usa esse nome não é afetado.
 */
export const CHANNEL_ALL = 'Todos'

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:      { label: 'Baixa',   color: 'text-white/40 border-white/10' },
  medium:   { label: 'Média',   color: 'text-blue-400 border-blue-400/30' },
  high:     { label: 'Alta',    color: 'text-amber-400 border-amber-400/30' },
  critical: { label: 'Crítica', color: 'text-red-400 border-red-400/30' },
}

const FREQ_OPTIONS = [
  { id: 'none',          label: 'Não repete' },
  { id: 'daily',         label: 'Diário' },
  { id: 'weekly',        label: 'Semanal' },
  { id: 'specific_days', label: 'Dias fixos' },
  { id: 'monthly',       label: 'Mensal' },
  { id: 'yearly',        label: 'Anual' },
] as const

export function WorkItemModal({
  isOpen, onClose, itemToEdit, defaultDate, items = [], onManageLabels,
}: {
  isOpen: boolean
  onClose: () => void
  itemToEdit?: WorkItem | null
  defaultDate?: string
  /** Usado para oferecer também rótulos que só existem nos itens. */
  items?: WorkItem[]
  onManageLabels?: () => void
}) {
  const create = useCreateWorkItem()
  const update = useUpdateWorkItem()
  const remove = useDeleteWorkItem()
  const { labels: tipos } = useResolvedLabels('work_type', items)
  const { labels: categorias } = useResolvedLabels('work_category', items)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<WorkKind>('')
  const [marketplace, setMarketplace] = useState('')
  const [project, setProject] = useState('')
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined)
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Recarrega os campos sempre que o modal abre, para não herdar o item anterior.
  useEffect(() => {
    if (!isOpen) return
    if (itemToEdit) {
      setTitle(itemToEdit.title)
      setDescription(itemToEdit.description || '')
      setKind(itemToEdit.kind)
      setMarketplace(itemToEdit.marketplace || '')
      setProject(itemToEdit.project || '')
      setDate(itemToEdit.date)
      setTime(itemToEdit.time || '09:00')
      setDuration(itemToEdit.duration_min ? String(itemToEdit.duration_min) : '')
      setPriority(itemToEdit.priority || 'medium')
      setRecurrence(itemToEdit.recurrence)
      setEndDate(itemToEdit.end_date || '')
    } else {
      setTitle(''); setDescription(''); setKind(''); setMarketplace(''); setProject('')
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'))
      setTime('09:00'); setDuration(''); setPriority('medium')
      setRecurrence(undefined); setEndDate('')
    }
    setError('')
    setConfirmDelete(false)
  }, [isOpen, itemToEdit, defaultDate])

  const busy = create.isPending || update.isPending || remove.isPending

  const setFreq = (id: string) => {
    if (id === 'none') { setRecurrence(undefined); setEndDate(''); return }
    setRecurrence(prev => ({
      frequency: id as RecurrenceRule['frequency'],
      interval: prev?.interval || 1,
      days_of_week: id === 'specific_days'
        ? (prev?.days_of_week?.length ? prev.days_of_week : [1, 2, 3, 4, 5])
        : [0, 1, 2, 3, 4, 5, 6],
    }))
  }

  const toggleDay = (d: number) => {
    setRecurrence(prev => {
      const cur = prev?.days_of_week || []
      const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort()
      return { ...prev, frequency: 'specific_days', interval: prev?.interval || 1, days_of_week: next }
    })
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Dê um título ao item.'); return }
    if (recurrence?.frequency === 'specific_days' && !recurrence.days_of_week?.length) {
      setError('Escolha ao menos um dia da semana.'); return
    }
    setError('')

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      marketplace: marketplace.trim() || undefined,
      project: project.trim() || undefined,
      date,
      time: time || undefined,
      duration_min: duration ? Number(duration) : undefined,
      priority,
      recurrence,
      end_date: recurrence && endDate ? endDate : undefined,
    }

    try {
      if (itemToEdit) await update.mutateAsync({ id: itemToEdit.id, ...payload })
      else await create.mutateAsync(payload as any)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar.')
    }
  }

  // window.confirm() é suprimido quando o app roda instalado como PWA: ele
  // retornava false na hora e a exclusão nunca começava. A confirmação passa a
  // ser um estado do próprio modal.
  const handleDelete = async () => {
    if (!itemToEdit) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await remove.mutateAsync(itemToEdit.id)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir.')
      setConfirmDelete(false)
    }
  }

  const currentFreq = recurrence?.frequency || 'none'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full sm:max-w-lg bg-[#0D0D0D] border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-white">
                {itemToEdit ? 'Editar item' : 'Novo item de trabalho'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Tipo e Categoria — listas do próprio usuário */}
              {([
                { scope: 'work_type' as const, titulo: 'Tipo', valor: kind, set: setKind, vazio: false },
                { scope: 'work_category' as const, titulo: 'Categoria', valor: marketplace, set: setMarketplace, vazio: true },
              ]).map(campo => {
                const opcoes = campo.scope === 'work_type' ? tipos : categorias
                return (
                  <div key={campo.scope}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] uppercase tracking-widest font-black text-white/30">{campo.titulo}</p>
                      {onManageLabels && (
                        <button
                          onClick={onManageLabels}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/30 hover:text-white transition-colors"
                        >
                          <Settings2 size={10} /> Gerenciar
                        </button>
                      )}
                    </div>

                    {opcoes.length === 0 ? (
                      <button
                        onClick={onManageLabels}
                        className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:border-white/30 transition-all"
                      >
                        Criar {campo.titulo.toLowerCase()}s
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {campo.vazio && (
                          <button
                            onClick={() => campo.set('')}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all',
                              !campo.valor ? 'bg-white text-black border-white' : 'text-white/35 border-white/10 hover:border-white/30'
                            )}
                          >
                            Nenhuma
                          </button>
                        )}
                        {opcoes.map(l => {
                          const active = campo.valor === l.name
                          return (
                            <button
                              key={l.name}
                              onClick={() => campo.set(l.name)}
                              style={active
                                ? { backgroundColor: l.color, borderColor: l.color, color: labelTextColor(l.color) }
                                : { borderColor: `${l.color}66`, color: l.color }}
                              className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all hover:brightness-125"
                            >
                              {l.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Título</p>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Reunião de alinhamento"
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Solicitante / Área</p>
                <input
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  placeholder="Ex: Comercial, Diretoria, Marketing"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">
                    {recurrence ? 'Começa em' : 'Data'}
                  </p>
                  <CustomDateTimePicker label="Data" type="date" value={date} onChange={setDate} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Horário</p>
                  <CustomDateTimePicker label="Horário" type="time" value={time} onChange={setTime} align="right" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Duração (min)</p>
                  <input
                    value={duration}
                    onChange={e => setDuration(e.target.value.replace(/\D/g, ''))}
                    placeholder="60"
                    inputMode="numeric"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
                  />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Prioridade</p>
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(PRIORITY_META) as TaskPriority[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        title={PRIORITY_META[p].label}
                        className={cn(
                          'py-3 rounded-xl border text-[8px] font-black uppercase transition-all',
                          priority === p
                            ? `bg-white/10 ${PRIORITY_META[p].color}`
                            : 'text-white/25 border-white/8 hover:border-white/20'
                        )}
                      >
                        {PRIORITY_META[p].label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Repetição */}
              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Repetição</p>
                <div className="grid grid-cols-3 gap-2">
                  {FREQ_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFreq(f.id)}
                      className={cn(
                        'py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all',
                        currentFreq === f.id
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 text-white/40 border-white/8 hover:border-white/20'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {currentFreq === 'specific_days' && (
                  <div className="flex justify-between gap-1 mt-3">
                    {DAYS.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={cn(
                          'w-9 h-9 rounded-xl font-black text-sm transition-all',
                          recurrence?.days_of_week?.includes(i)
                            ? 'bg-white text-black'
                            : 'text-white/20 border border-white/8 hover:bg-white/5'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                {['daily', 'weekly', 'monthly'].includes(currentFreq) && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold text-white/40">A cada</span>
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setRecurrence(prev => ({ ...prev!, interval: n }))}
                        className={cn(
                          'w-9 h-8 rounded-lg text-xs font-black transition-all',
                          (recurrence?.interval || 1) === n ? 'bg-white text-black' : 'text-white/30 border border-white/10 hover:bg-white/5'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-[10px] font-bold text-white/40">
                      {currentFreq === 'daily' ? 'dia(s)' : currentFreq === 'weekly' ? 'semana(s)' : 'mês(es)'}
                    </span>
                  </div>
                )}

                {recurrence && (
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Termina em (opcional)</p>
                    <CustomDateTimePicker label="Fim" type="date" value={endDate} onChange={setEndDate} direction="up" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Anotações</p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Pauta, link da call, contexto..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all resize-none placeholder:text-white/20"
                />
              </div>

              {/* Histórico só existe depois que o item foi salvo. */}
              {itemToEdit && (
                <div className="pt-4 border-t border-white/[0.07]">
                  <WorkNotes itemId={itemToEdit.id} occurrenceDate={defaultDate} />
                </div>
              )}

              {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

              {confirmDelete ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.07] p-4">
                  <p className="text-xs font-bold text-white mb-1">Excluir &quot;{itemToEdit?.title}&quot;?</p>
                  <p className="text-[11px] text-white/50 mb-3">
                    {itemToEdit?.recurrence
                      ? 'Some a série inteira, com todas as ocorrências, registros e anotações.'
                      : 'Some o item com todos os registros e anotações.'}
                    {' '}Não dá para desfazer.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/25 text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-red-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy && <Loader2 size={12} className="animate-spin" />}
                      Excluir tudo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  {itemToEdit && (
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      aria-label="Excluir item"
                      className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={busy}
                    className="flex-1 py-3 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    {itemToEdit ? 'Salvar alterações' : 'Adicionar'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
