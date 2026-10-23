'use client'

import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useCategories, Category, CategoryScope } from '@/lib/hooks/useCategories'
import { selectionAfterDelete } from '@/lib/utils/categories'
import { cn } from '@/lib/utils/cn'
import { CategoryManagerSheet } from './CategoryManagerSheet'

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'
const CHIP = 'snap-start shrink-0 min-h-[44px] px-4 rounded-xl border whitespace-nowrap text-[12px] font-black uppercase tracking-widest transition-all flex items-center gap-2'

/**
 * Seletor único de categoria (Hábito, Compromisso, Meta). Chips roláveis +
 * "+ Nova" (cria inline no painel) + lápis (gerenciar: editar, excluir, ordenar).
 * Funciona nos temas claro/escuro; `forceDark` é para modais com tokens fixos.
 *
 * `onChange(null)` = sem categoria. A categoria vem junto no 2º argumento ao
 * escolher/criar, para o modal poder herdar emoji e cor dela.
 */
export function CategoryPicker({ scope, value, onChange, forceDark }: {
  scope: CategoryScope
  value: string | null | undefined
  onChange: (id: string | null, category?: Category) => void
  forceDark?: boolean
}) {
  const { data: categories } = useCategories(scope)
  const [sheet, setSheet] = useState<null | 'manage' | 'create'>(null)

  return (
    <div className="space-y-1.5">
      <label id={`catpicker-${scope}`} className="block text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Categoria</label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1 min-w-0">
          <div
            role="group" aria-labelledby={`catpicker-${scope}`}
            className="flex gap-2 overflow-x-auto snap-x pb-1 pr-8 sm:pr-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button" aria-pressed={!value} onClick={() => onChange(null)}
              className={cn(CHIP, FOCUS_RING, !value
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border-[var(--border-subtle)]')}
            >
              Nenhuma
            </button>
            {categories?.map(cat => {
              const selected = value === cat.id
              return (
                <button
                  key={cat.id} type="button" aria-pressed={selected} onClick={() => onChange(cat.id, cat)}
                  className={cn(CHIP, FOCUS_RING, selected
                    ? 'text-[var(--text-primary)] border-2'
                    : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border-[var(--border-subtle)]')}
                  style={selected ? { borderColor: cat.color, backgroundColor: `${cat.color}26` } : undefined}
                >
                  {cat.icon && <span aria-hidden="true">{cat.icon}</span>}
                  {cat.name}
                </button>
              )
            })}
            <button
              type="button" onClick={() => setSheet('create')}
              className={cn(CHIP, FOCUS_RING, 'border-dashed border-[var(--border-subtle)] text-red-500 bg-transparent')}
            >
              <Plus size={14} aria-hidden="true" /> Nova
            </button>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[var(--bg-primary)] to-transparent sm:hidden" />
        </div>
        <button
          type="button" onClick={() => setSheet('manage')} aria-label="Gerenciar categorias"
          className={cn('shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]', FOCUS_RING)}
        >
          <Pencil size={18} />
        </button>
      </div>

      {sheet && (
        <CategoryManagerSheet
          scope={scope}
          forceDark={forceDark}
          startCreating={sheet === 'create'}
          onClose={() => setSheet(null)}
          onCreated={cat => onChange(cat.id, cat)}
          onDeleted={id => { if (value === id) onChange(selectionAfterDelete(value, id)) }}
        />
      )}
    </div>
  )
}
