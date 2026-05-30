'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Pencil, Trash2, ExternalLink, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBooks, useAddBook, useUpdateBook, useDeleteBook, useReorderBooks } from '@/lib/hooks/useBooks'
import { Book } from '@/types'
import { cn } from '@/lib/utils/cn'

type BookStatus = 'want_to_read' | 'reading' | 'read'

interface BookForm {
  title: string
  author: string
  status: BookStatus
  rating: number
  purchase_link: string
  notes: string
}

const EMPTY_FORM: BookForm = {
  title: '',
  author: '',
  status: 'want_to_read',
  rating: 0,
  purchase_link: '',
  notes: '',
}

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: 'Quero Ler',
  reading: 'Lendo',
  read: 'Lido',
}

// ────────────────────────────────────────────────────────────────────────────
// BookCard
// ────────────────────────────────────────────────────────────────────────────
function BookCard({
  book,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging,
}: {
  book: Book
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
  dragHandleProps?: Record<string, any>
  isDragging?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      layout
      className={cn(
        "p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl flex items-start justify-between gap-3 group transition-shadow",
        isDragging && "opacity-50 shadow-2xl ring-1 ring-[var(--text-primary)]/20"
      )}
    >
      {/* Drag handle — only rendered when sortable */}
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="touch-none p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing shrink-0 self-center transition-colors"
          aria-label="Reordenar"
        >
          <GripVertical size={16} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[var(--text-primary)] leading-snug">{book.title}</p>
        {book.author && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{book.author}</p>
        )}
        {book.status === 'read' && book.rating && book.rating > 0 && (
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={s <= book.rating! ? 'text-amber-400 text-xs' : 'text-white/20 text-xs'}>
                ★
              </span>
            ))}
          </div>
        )}
        {book.purchase_link && (
          <a
            href={book.purchase_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink size={10} />
            Comprar
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(book)}
          className="action-btn"
          aria-label="Editar"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(book.id)}
          className="action-btn text-red-400 hover:text-red-300"
          aria-label="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SortableBookCard — wraps BookCard with dnd-kit sortable
// ────────────────────────────────────────────────────────────────────────────
function SortableBookCard({
  book,
  onEdit,
  onDelete,
}: {
  book: Book
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <BookCard
        book={book}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// BookSection — regular (non-sortable)
// ────────────────────────────────────────────────────────────────────────────
function BookSection({
  title,
  emoji,
  books,
  onEdit,
  onDelete,
}: {
  title: string
  emoji: string
  books: Book[]
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {emoji} {title} ({books.length})
      </h2>
      {books.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic px-1">Nenhum livro aqui ainda.</p>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {books.map(book => (
              <BookCard key={book.id} book={book} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SortableBookSection — "Quero Ler" with drag-and-drop
// ────────────────────────────────────────────────────────────────────────────
function SortableBookSection({
  books,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  books: Book[]
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
  onDragEnd: (event: DragEndEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <div className="space-y-4">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        🛒 Quero Ler ({books.length})
        {books.length > 1 && (
          <span className="ml-2 text-[9px] font-medium normal-case tracking-normal text-[var(--text-muted)]/60">
            segure o ícone para reordenar
          </span>
        )}
      </h2>
      {books.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic px-1">Nenhum livro aqui ainda.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={books.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {books.map(book => (
                <SortableBookCard
                  key={book.id}
                  book={book}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const { data: books = [], isLoading } = useBooks()
  const addBook = useAddBook()
  const updateBook = useUpdateBook()
  const deleteBook = useDeleteBook()
  const reorderBooks = useReorderBooks()

  const [showModal, setShowModal] = useState(false)
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null)
  const [form, setForm] = useState<BookForm>(EMPTY_FORM)

  // Local ordered IDs for want_to_read — synced from DB, mutated optimistically on drag
  const [wantToReadIds, setWantToReadIds] = useState<string[]>([])

  useEffect(() => {
    const sorted = books
      .filter(b => b.status === 'want_to_read')
      .sort((a, b) => {
        const ao = a.sort_order ?? Infinity
        const bo = b.sort_order ?? Infinity
        if (ao !== bo) return ao - bo
        return a.created_at < b.created_at ? -1 : 1
      })
    setWantToReadIds(sorted.map(b => b.id))
  }, [books])

  const reading = books.filter(b => b.status === 'reading')
  const wantToRead = wantToReadIds
    .map(id => books.find(b => b.id === id))
    .filter(Boolean) as Book[]
  const read = books.filter(b => b.status === 'read')

  const openAdd = () => {
    setBookToEdit(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (book: Book) => {
    setBookToEdit(book)
    setForm({
      title: book.title,
      author: book.author ?? '',
      status: book.status,
      rating: book.rating ?? 0,
      purchase_link: book.purchase_link ?? '',
      notes: book.notes ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setBookToEdit(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isNewWantToRead = form.status === 'want_to_read' &&
      (!bookToEdit || bookToEdit.sort_order === undefined || bookToEdit.sort_order === null)

    const payload = {
      title: form.title,
      author: form.author || undefined,
      status: form.status,
      rating: form.status === 'read' && form.rating > 0 ? form.rating : undefined,
      purchase_link: form.purchase_link || undefined,
      notes: form.notes || undefined,
      finished_at: form.status === 'read' && !bookToEdit?.finished_at
        ? new Date().toISOString()
        : bookToEdit?.finished_at,
      // Assign sort_order so new want_to_read books go to the end of the list
      ...(isNewWantToRead ? { sort_order: wantToRead.length } : {}),
    }

    if (bookToEdit) {
      updateBook.mutate({ id: bookToEdit.id, ...payload }, { onSuccess: closeModal })
    } else {
      addBook.mutate(payload as any, { onSuccess: closeModal })
    }
  }

  const handleDelete = (id: string) => {
    deleteBook.mutate(id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = wantToReadIds.indexOf(active.id as string)
    const newIdx = wantToReadIds.indexOf(over.id as string)
    if (oldIdx < 0 || newIdx < 0) return

    const newIds = arrayMove(wantToReadIds, oldIdx, newIdx)
    setWantToReadIds(newIds)
    reorderBooks.mutate(newIds)
  }

  return (
    <div className="flex-1 min-h-screen p-4 md:p-6 lg:p-8 pb-24 lg:pb-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[var(--text-primary)]">
            Minha Biblioteca
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {books.length} livro{books.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] font-black text-sm px-4 py-2.5 rounded-2xl hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--text-muted)] border-t-[var(--text-primary)] rounded-full animate-spin" />
        </div>
      )}

      {/* Sections */}
      {!isLoading && (
        <div className="space-y-10">
          <BookSection
            title="Lendo"
            emoji="📖"
            books={reading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
          <SortableBookSection
            books={wantToRead}
            onEdit={openEdit}
            onDelete={handleDelete}
            onDragEnd={handleDragEnd}
          />
          <BookSection
            title="Lidos"
            emoji="✅"
            books={read}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[10000] flex items-end pb-safe md:pb-0 md:items-center md:justify-center md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-xl"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="relative w-full md:max-w-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-t-[32px] md:rounded-[48px] p-5 md:p-7 overflow-y-auto max-h-[85svh] md:max-h-[90vh] shadow-2xl z-[10001]"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-4 md:hidden" />

              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tightest text-[var(--text-primary)]">
                  {bookToEdit ? 'Editar Livro' : 'Novo Livro'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2.5 hover:bg-[var(--bg-overlay)] rounded-2xl transition-all"
                >
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    Título *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-bold text-base"
                    placeholder="Nome do livro..."
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    Autor
                  </label>
                  <input
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-medium text-base"
                    placeholder="Nome do autor..."
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['reading', 'want_to_read', 'read'] as BookStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, status: s, rating: s !== 'read' ? 0 : form.rating })}
                        className={cn(
                          'py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all',
                          form.status === s
                            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                            : 'bg-[var(--bg-overlay)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                        )}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating — only when status=read */}
                <AnimatePresence>
                  {form.status === 'read' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                        Avaliação
                      </label>
                      <div className="flex gap-2 px-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm({ ...form, rating: form.rating === s ? 0 : s })}
                            className={cn(
                              'text-2xl transition-all active:scale-110',
                              s <= form.rating ? 'text-amber-400' : 'text-white/20'
                            )}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Purchase Link */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    Link de Compra
                  </label>
                  <input
                    type="url"
                    value={form.purchase_link}
                    onChange={e => setForm({ ...form, purchase_link: e.target.value })}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-medium text-base"
                    placeholder="https://..."
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    Notas
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-medium text-base min-h-[80px] max-h-[140px] resize-none"
                    placeholder="Pensamentos, citações, resumo..."
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addBook.isPending || updateBook.isPending}
                    className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-4 rounded-[24px] hover:opacity-90 transition-all active:scale-95 text-lg"
                  >
                    {addBook.isPending || updateBook.isPending
                      ? 'Salvando...'
                      : bookToEdit
                      ? 'Salvar Alterações'
                      : 'Adicionar Livro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
