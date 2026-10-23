'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, Check, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { useModalLayer } from '@/components/ui/useModalLayer'
import { DARK_TOKENS } from '@/components/ui/Modal'
import {
  useCategories, useAddCategory, useUpdateCategory, useDeleteCategory, useReorderCategories,
  Category, CategoryScope, categoryScopeLabel,
} from '@/lib/hooks/useCategories'
import {
  findDuplicateCategory, moveCategory, DUPLICATE_CATEGORY_MESSAGE,
} from '@/lib/utils/categories'
import { FOCUSABLE_SELECTOR, nextFocusIndex } from '@/lib/utils/modalLogic'
import { cn } from '@/lib/utils/cn'

export const CATEGORY_COLOR_NAMES: Record<string, string> = {
  '#FF453A': 'Vermelho', '#FF9F0A': 'Laranja', '#FFD60A': 'Amarelo', '#32D74B': 'Verde',
  '#0A84FF': 'Azul', '#5E5CE6': 'Roxo', '#BF5AF2': 'Lilás', '#8E8E93': 'Cinza',
}

export const CATEGORY_COLORS = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#32D74B', '#0A84FF', '#5E5CE6', '#BF5AF2', '#8E8E93',
]

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'
const INPUT = 'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]'
const BTN_GHOST = 'flex-1 min-h-[44px] rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest'
const BTN_PRIMARY = 'flex-1 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1'

function ColorChoices({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-0 flex-wrap" role="group" aria-label="Cor">
      {CATEGORY_COLORS.map(color => (
        <button
          key={color} type="button" aria-label={`Cor ${CATEGORY_COLOR_NAMES[color] || color}`} aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn('w-11 h-11 flex items-center justify-center rounded-full', FOCUS_RING)}
        >
          <span
            className={cn('w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center', value === color ? 'border-[var(--text-primary)] scale-110' : 'border-transparent opacity-70')}
            style={{ backgroundColor: color }}
          >
            {value === color && <Check size={14} className="text-white drop-shadow" aria-hidden="true" />}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Painel de gerenciamento de categorias (criar, editar, excluir, ordenar) aberto
 * pelo CategoryPicker. Vai para o `body` por portal (acima do Modal, z 10001) e
 * entra na pilha de camadas: ESC fecha só ele. A exclusão é confirmada na própria
 * UI (window.confirm não funciona no PWA). Criar é inline, sem modal dentro de modal.
 */
export function CategoryManagerSheet({ scope, onClose, onDeleted, onCreated, onUpdated, startCreating, forceDark }: {
  scope: CategoryScope
  onClose: () => void
  /** Chamado após salvar edição, com a categoria atualizada (o modal herda emoji/cor se estava selecionada). */
  onUpdated?: (cat: Category) => void
  /** Avisa o modal para soltar a categoria excluída se ela estava selecionada. */
  onDeleted?: (id: string) => void
  /** Chamado com a categoria recém-criada (o modal a seleciona). */
  onCreated?: (cat: Category) => void
  /** Abre já com o formulário de criação (atalho "+ Nova"); fecha após criar. */
  startCreating?: boolean
  forceDark?: boolean
}) {
  const { data: categories, isLoading } = useCategories(scope)
  const add = useAddCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const reorder = useReorderCategories()
  const defaultIcon = scope === 'agenda' ? '📅' : '📁'
  // Sem categorias, o formulário de criar já abre (o `creating` efetivo é derivado abaixo).
  const [creatingState, setCreating] = useState(!!startCreating)
  const creating = creatingState || (!isLoading && (categories?.length ?? 0) === 0)
  const [newCat, setNewCat] = useState({ name: '', icon: defaultIcon, color: CATEGORY_COLORS[0] })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', icon: '', color: CATEGORY_COLORS[0] })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useModalLayer(true, () => onCloseRef.current())

  // Foco: campo de nome se já abre criando (só ponteiro fino, para não abrir o teclado
  // sozinho), senão o título; devolve o foco a quem abriu ao fechar.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
    ;((startCreating && fine ? nameRef.current : null) || titleRef.current)?.focus({ preventScroll: true })
    return () => { if (prev && document.contains(prev)) prev.focus({ preventScroll: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const next = nextFocusIndex(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey)
    if (next !== null) { e.preventDefault(); items[next].focus() }
  }

  const startEdit = (c: Category) => {
    setConfirmId(null); setCreating(false); setError(null); setNameError(null)
    setEditingId(c.id)
    setDraft({ name: c.name, icon: c.icon || '📁', color: c.color || CATEGORY_COLORS[0] })
  }

  const create = () => {
    const name = newCat.name.trim()
    if (!name || add.isPending) return
    if (findDuplicateCategory(categories || [], name, scope)) { setNameError(DUPLICATE_CATEGORY_MESSAGE); return }
    setError(null)
    add.mutate({ name, icon: newCat.icon, color: newCat.color, type: scope }, {
      onSuccess: created => {
        onCreated?.(created as Category)
        if (startCreating) { onCloseRef.current(); return }
        setCreating(false)
        setNewCat({ name: '', icon: defaultIcon, color: CATEGORY_COLORS[0] })
      },
      onError: () => setError('Não foi possível criar. Tente de novo.'),
    })
  }

  const save = () => {
    const name = draft.name.trim()
    if (!editingId || !name) return
    const current = categories?.find(c => c.id === editingId)
    if (findDuplicateCategory(categories || [], name, current?.type || scope, editingId)) {
      setNameError(DUPLICATE_CATEGORY_MESSAGE)
      return
    }
    setError(null)
    update.mutate({ id: editingId, name, icon: draft.icon, color: draft.color }, {
      onSuccess: () => {
        if (current) onUpdated?.({ ...current, name, icon: draft.icon, color: draft.color })
        setEditingId(null); setError(null)
      },
      onError: () => setError('Não foi possível salvar. Tente de novo.'),
    })
  }

  const doDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => { setConfirmId(null); setError(null); onDeleted?.(id) },
      onError: () => setError('Não foi possível excluir. Tente de novo.'),
    })
  }

  const move = (id: string, dir: -1 | 1) => {
    const patches = moveCategory(categories || [], id, dir)
    if (patches.length === 0) return
    setError(null)
    reorder.mutate(patches, { onError: () => setError('Não foi possível reordenar. Tente de novo.') })
  }

  if (typeof document === 'undefined') return null

  const sheet = (
    <div className={cn('fixed inset-0 z-[10001] flex items-end sm:items-center justify-center sm:p-6', forceDark && DARK_TOKENS)}>
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={() => onCloseRef.current()} />
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="category-sheet-title"
        onKeyDown={trapTab}
        className="relative w-full sm:max-w-md max-h-[88dvh] flex flex-col bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="shrink-0 flex justify-between items-center gap-3 px-5 pt-4 pb-2">
          <h3 id="category-sheet-title" ref={titleRef} tabIndex={-1} className="text-xl font-black text-[var(--text-primary)] outline-none">
            Categorias
          </h3>
          <button type="button" onClick={() => onCloseRef.current()} aria-label="Fechar" className={cn('w-11 h-11 flex items-center justify-center rounded-2xl', FOCUS_RING)}>
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-3">
          {error && <p role="alert" className="text-sm font-bold text-red-500">{error}</p>}

          {creating ? (
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-3 space-y-3">
              <input
                ref={nameRef}
                value={newCat.name}
                onChange={e => { setNewCat({ ...newCat, name: e.target.value }); setNameError(null) }}
                onFocus={e => e.currentTarget.scrollIntoView({ block: 'center' })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
                aria-invalid={!!nameError} aria-describedby={nameError ? 'category-name-error' : undefined}
                className={cn(INPUT, nameError && 'border-red-500')} placeholder="Nome da nova categoria" aria-label="Nome da nova categoria" maxLength={40}
              />
              {nameError && <p id="category-name-error" role="alert" className="text-sm font-bold text-red-500">{nameError}</p>}
              <div className="flex gap-3 items-center">
                <EmojiPicker value={newCat.icon} onChange={icon => setNewCat({ ...newCat, icon })} />
                <ColorChoices value={newCat.color} onChange={color => setNewCat({ ...newCat, color })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { if (startCreating) onCloseRef.current(); else { setCreating(false); setError(null) } }} className={cn(BTN_GHOST, FOCUS_RING)}>
                  Cancelar
                </button>
                <button type="button" onClick={create} disabled={add.isPending || !newCat.name.trim()} className={cn(BTN_PRIMARY, FOCUS_RING)}>
                  <Plus size={14} /> {add.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setEditingId(null); setConfirmId(null); setError(null); setCreating(true) }}
              className={cn('w-full min-h-[44px] rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2', FOCUS_RING)}
            >
              <Plus size={14} /> Nova categoria
            </button>
          )}

          {isLoading && <p className="text-sm text-[var(--text-muted)]">Carregando...</p>}
          {!isLoading && categories?.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] text-center">Crie sua primeira categoria para organizar hábitos e compromissos.</p>
          )}

          <ul className="space-y-2">
            {categories?.map((c, i) => (
              <li key={c.id} className="bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-3">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <input
                      value={draft.name}
                      onChange={e => { setDraft({ ...draft, name: e.target.value }); setNameError(null) }}
                      onFocus={e => e.currentTarget.scrollIntoView({ block: 'center' })}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
                      aria-invalid={!!nameError} aria-describedby={nameError ? 'category-name-error' : undefined}
                      className={cn(INPUT, nameError && 'border-red-500')} placeholder="Nome da categoria" aria-label="Nome da categoria" maxLength={40}
                    />
                    {nameError && <p id="category-name-error" role="alert" className="text-sm font-bold text-red-500">{nameError}</p>}
                    <div className="flex gap-3 items-center">
                      <EmojiPicker value={draft.icon} onChange={icon => setDraft({ ...draft, icon })} />
                      <ColorChoices value={draft.color} onChange={color => setDraft({ ...draft, color })} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingId(null); setNameError(null) }} className={cn(BTN_GHOST, FOCUS_RING)}>Cancelar</button>
                      <button type="button" onClick={save} disabled={update.isPending || !draft.name.trim()} className={cn(BTN_PRIMARY, FOCUS_RING)}>
                        <Check size={14} /> {update.isPending ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setCreating(false); setError(null); setNameError(null); setConfirmId(c.id) }}
                      className={cn('w-full min-h-[44px] rounded-xl text-red-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2', FOCUS_RING)}
                    >
                      <Trash2 size={14} /> Excluir categoria
                    </button>
                  </div>
                ) : confirmId === c.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--text-primary)] font-bold">Excluir &quot;{c.name}&quot;? Os itens que usavam esta categoria deixam de mostrar categoria.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmId(null)} className={cn(BTN_GHOST, FOCUS_RING)}>Manter</button>
                      <button type="button" onClick={() => doDelete(c.id)} disabled={remove.isPending} className={cn(BTN_PRIMARY, FOCUS_RING)}>
                        {remove.isPending ? 'Excluindo...' : 'Sim, excluir'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col shrink-0">
                      <button type="button" onClick={() => move(c.id, -1)} disabled={i === 0 || reorder.isPending} aria-label={`Subir ${c.name}`} className={cn('w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] disabled:opacity-30', FOCUS_RING)}>
                        <ChevronUp size={20} />
                      </button>
                      <button type="button" onClick={() => move(c.id, 1)} disabled={i === (categories?.length || 0) - 1 || reorder.isPending} aria-label={`Descer ${c.name}`} className={cn('w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] disabled:opacity-30', FOCUS_RING)}>
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                      {c.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-[12px] font-bold text-[var(--text-muted)] truncate">{categoryScopeLabel(c.type)}</p>
                    </div>
                    <button type="button" onClick={() => startEdit(c)} aria-label={`Editar ${c.name}`} className={cn('w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)]', FOCUS_RING)}>
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
