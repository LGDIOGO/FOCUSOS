import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Pencil, Trash2, Check } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import {
  useCategories, useUpdateCategory, useDeleteCategory,
  Category, CategoryScope, categoryScopeLabel,
} from '@/lib/hooks/useCategories'
import { findDuplicateCategory, DUPLICATE_CATEGORY_MESSAGE } from '@/lib/utils/categories'
import { cn } from '@/lib/utils/cn'

const COLORS = ['#FF453A', '#32D74B', '#FF9F0A', '#BF5AF2', '#0A84FF', '#8E8E93']

/**
 * Gestão de categorias dentro do modal de hábito/compromisso/meta, sem sair dele.
 * Renderize dentro de um pai `relative` (cobre o modal, como o "Nova Categoria").
 * A exclusão é confirmada na própria UI: window.confirm não funciona no PWA.
 */
export function CategoryManagerSheet({ scope, onClose, onDeleted }: {
  scope: CategoryScope
  onClose: () => void
  /** Avisa o modal para soltar a categoria excluída se ela estava selecionada. */
  onDeleted?: (id: string) => void
}) {
  const { data: categories, isLoading } = useCategories(scope)
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', icon: '', color: COLORS[0] })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = () => { setError(null); onClose() }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEdit =(c: Category) => {
    setConfirmId(null)
    setError(null)
    setEditingId(c.id)
    setDraft({ name: c.name, icon: c.icon || '📁', color: c.color || COLORS[0] })
  }

  const save = () => {
    const name = draft.name.trim()
    if (!editingId || !name) return
    const current = categories?.find(c => c.id === editingId)
    if (findDuplicateCategory(categories || [], name, current?.type || scope, editingId)) {
      setError(DUPLICATE_CATEGORY_MESSAGE)
      return
    }
    setError(null)
    update.mutate({ id: editingId, name, icon: draft.icon, color: draft.color }, {
      onSuccess: () => { setEditingId(null); setError(null) },
      onError: () => setError('Não foi possível salvar. Tente de novo.'),
    })
  }

  const doDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => { setConfirmId(null); setError(null); onDeleted?.(id) },
      onError: () => setError('Não foi possível excluir. Tente de novo.'),
    })
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Gerenciar categorias" className="absolute inset-0 z-[1000] bg-[var(--bg-primary)]/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm max-h-full flex flex-col bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Gerenciar categorias</h3>
          <button type="button" onClick={close} aria-label="Fechar" className="w-11 h-11 flex items-center justify-center">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {error && <p className="text-xs font-bold text-red-500 mb-2">{error}</p>}

        <div className="overflow-y-auto space-y-2 min-h-0">
          {isLoading && <p className="text-sm text-[var(--text-muted)]">Carregando...</p>}
          {!isLoading && categories?.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] py-6 text-center">Nenhuma categoria criada ainda.</p>
          )}
          {categories?.map(c => (
            <div key={c.id} className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-3">
              {editingId === c.id ? (
                <div className="space-y-3">
                  <input
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-red-500/50"
                    placeholder="Nome da categoria" aria-label="Nome da categoria"
                  />
                  <div className="flex gap-3 items-center">
                    <EmojiPicker value={draft.icon} onChange={icon => setDraft({ ...draft, icon })} />
                    <div className="flex gap-1 flex-wrap">
                      {COLORS.map(color => (
                        <button
                          key={color} type="button" aria-label={`Cor ${color}`}
                          onClick={() => setDraft({ ...draft, color })}
                          className="w-11 h-11 flex items-center justify-center"
                        >
                          <span
                            className={cn('w-7 h-7 rounded-full border-2 transition-all', draft.color === color ? 'border-[var(--text-primary)] scale-110' : 'border-transparent opacity-40')}
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="flex-1 min-h-[44px] rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">
                      Cancelar
                    </button>
                    <button type="button" onClick={save} disabled={update.isPending || !draft.name.trim()} className="flex-1 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1">
                      <Check size={14} /> {update.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : confirmId === c.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--text-primary)] font-bold">Excluir &quot;{c.name}&quot;? Os itens que usavam esta categoria deixam de mostrar categoria.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmId(null)} className="flex-1 min-h-[44px] rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">
                      Manter
                    </button>
                    <button type="button" onClick={() => doDelete(c.id)} disabled={remove.isPending} className="flex-1 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">
                      {remove.isPending ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                    {c.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{categoryScopeLabel(c.type)}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(c)} aria-label={`Editar ${c.name}`} className="w-11 h-11 flex items-center justify-center text-[var(--text-muted)]">
                    <Pencil size={18} />
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setError(null); setConfirmId(c.id) }} aria-label={`Excluir ${c.name}`} className="w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
