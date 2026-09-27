'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Pencil, Trash2, Loader2, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  useResolvedLabels, useCreateWorkLabel, useUpdateWorkLabel, useDeleteWorkLabel,
  useSeedWorkLabels, LABEL_COLORS, DEFAULT_TYPES, DEFAULT_CATEGORIES, FALLBACK_COLOR,
  labelTextColor, type LabelScope, type ResolvedLabel,
} from '@/lib/hooks/useWorkLabels'
import type { WorkItem } from '@/types'

const SCOPE_META: Record<LabelScope, { title: string; hint: string; defaults: Array<{ name: string; color: string }> }> = {
  work_type: {
    title: 'Tipos',
    hint: 'A natureza do item: tarefa, reunião, prazo... use os nomes do seu trabalho.',
    defaults: DEFAULT_TYPES,
  },
  work_category: {
    title: 'Categorias',
    hint: 'Como você agrupa: cliente, canal, projeto, área. Você decide.',
    defaults: DEFAULT_CATEGORIES,
  },
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LABEL_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
          style={{ backgroundColor: c }}
          className={cn(
            'w-6 h-6 rounded-lg transition-all',
            value === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0D0D0D]' : 'hover:scale-110'
          )}
        />
      ))}
    </div>
  )
}

function ScopeSection({ scope, items }: { scope: LabelScope; items: WorkItem[] }) {
  const meta = SCOPE_META[scope]
  const { labels, stored } = useResolvedLabels(scope, items)
  const create = useCreateWorkLabel()
  const update = useUpdateWorkLabel()
  const remove = useDeleteWorkLabel()
  const seed = useSeedWorkLabels()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ResolvedLabel | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[6])
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [error, setError] = useState('')

  const busy = create.isPending || update.isPending || remove.isPending || seed.isPending
  const implicit = labels.filter(l => l.implicit)

  const openAdd = () => { setEditing(null); setName(''); setColor(LABEL_COLORS[6]); setAdding(true); setError('') }
  const openEdit = (l: ResolvedLabel) => {
    setAdding(false); setEditing(l)
    setName(l.name); setColor(l.color === FALLBACK_COLOR ? LABEL_COLORS[6] : l.color); setError('')
  }
  const close = () => { setAdding(false); setEditing(null); setError('') }

  const save = async () => {
    setError('')
    try {
      if (editing?.id) {
        await update.mutateAsync({ id: editing.id, name, color, scope, previousName: editing.name })
      } else if (editing?.implicit) {
        // Rótulo que só existia nos itens: cadastrar dá cor e permite renomear.
        await create.mutateAsync({ name: editing.name, color, scope })
      } else {
        await create.mutateAsync({ name, color, scope })
      }
      close()
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar.')
    }
  }

  const del = async (l: ResolvedLabel) => {
    if (!l.id) return
    setError('')
    try {
      await remove.mutateAsync({ id: l.id, name: l.name, scope })
      setConfirmDel(null)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-white/50">{meta.title}</p>
          <p className="text-[11px] text-white/30 mt-0.5">{meta.hint}</p>
        </div>
        <button
          onClick={openAdd}
          disabled={busy}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 hover:border-white/30 text-[9px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all"
        >
          <Plus size={11} /> Novo
        </button>
      </div>

      {/* Atalhos quando ainda não há nada cadastrado */}
      {stored.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => seed.mutate({ scope, names: meta.defaults })}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/30 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all"
          >
            <Sparkles size={11} /> Usar conjunto padrão
          </button>
          {implicit.length > 0 && (
            <button
              onClick={() => seed.mutate({
                scope,
                names: implicit.map((l, i) => ({ name: l.name, color: LABEL_COLORS[i % LABEL_COLORS.length] })),
              })}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/30 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all"
            >
              <Check size={11} /> Cadastrar os {implicit.length} em uso
            </button>
          )}
        </div>
      )}

      {/* Formulário */}
      <AnimatePresence>
        {(adding || editing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close() }}
                placeholder={scope === 'work_type' ? 'Ex: Chamado, Visita, Estudo' : 'Ex: Cliente X, Marketing, Pessoal'}
                autoFocus
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
              />
              <ColorPicker value={color} onChange={setColor} />
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded-md text-[10px] font-black"
                  style={{ backgroundColor: color, color: labelTextColor(color) }}
                >
                  {name.trim() || 'Prévia'}
                </span>
                <div className="flex-1" />
                <button onClick={close} className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={busy || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-wider hover:bg-neutral-200 transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  {busy && <Loader2 size={11} className="animate-spin" />} Salvar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-400 text-[11px] font-bold">{error}</p>}

      {/* Lista */}
      {labels.length === 0 ? (
        <p className="text-white/20 text-[11px] font-bold">Nenhum {meta.title.toLowerCase().slice(0, -1)} ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {labels.map(l => (
            <div
              key={l.name}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2"
            >
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-black shrink-0"
                style={{ backgroundColor: l.color, color: labelTextColor(l.color) }}
              >
                {l.name}
              </span>
              {l.implicit && (
                <span className="text-[8px] font-black uppercase tracking-wider text-white/25 shrink-0">
                  em uso · sem cor
                </span>
              )}
              <div className="flex-1" />

              {confirmDel === l.name ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-white/40">Itens perdem a marcação.</span>
                  <button onClick={() => setConfirmDel(null)} className="text-[9px] font-black uppercase text-white/40 hover:text-white px-1">
                    não
                  </button>
                  <button onClick={() => del(l)} disabled={busy} className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 px-1">
                    excluir
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(l)}
                    aria-label={`Editar ${l.name}`}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                  {l.id && (
                    <button
                      onClick={() => setConfirmDel(l.name)}
                      aria-label={`Excluir ${l.name}`}
                      className="p-1.5 rounded-lg text-white/25 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WorkLabelManager({
  isOpen, onClose, items,
}: {
  isOpen: boolean
  onClose: () => void
  items: WorkItem[]
}) {
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
              <div>
                <h2 className="text-base font-black text-white">Tipos e categorias</h2>
                <p className="text-[11px] text-white/35 mt-0.5">Monte a organização do seu jeito.</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-7">
              <ScopeSection scope="work_type" items={items} />
              <div className="h-px bg-white/[0.07]" />
              <ScopeSection scope="work_category" items={items} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
