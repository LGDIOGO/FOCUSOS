'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Trash2, MessageSquare } from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useWorkNotes, useAddWorkNote, useDeleteWorkNote } from '@/lib/hooks/useWork'

/** "Hoje 14:32", "Ontem 09:10" ou "12 set 2026 · 16:45". */
function stamp(isoDateTime: string): string {
  try {
    const d = parseISO(isoDateTime)
    const hora = format(d, 'HH:mm')
    if (isToday(d)) return `Hoje ${hora}`
    if (isYesterday(d)) return `Ontem ${hora}`
    return `${format(d, "d MMM yyyy", { locale: ptBR })} · ${hora}`
  } catch {
    return isoDateTime
  }
}

export function WorkNotes({
  itemId, occurrenceDate,
}: {
  itemId: string
  occurrenceDate?: string
}) {
  const { data: notes = [], isLoading } = useWorkNotes(itemId)
  const addNote = useAddWorkNote()
  const delNote = useDeleteWorkNote()

  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const submit = async () => {
    const text = body.trim()
    if (!text || addNote.isPending) return
    setError('')
    try {
      await addNote.mutateAsync({ itemId, body: text, occurrenceDate })
      setBody('')
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar a anotação.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={12} className="text-white/30" />
        <p className="text-[9px] uppercase tracking-widest font-black text-white/30">
          Histórico e observações {notes.length > 0 && `· ${notes.length}`}
        </p>
      </div>

      <div className="relative">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            // Enter envia; Shift+Enter quebra linha — mesma convenção do chat.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          rows={2}
          placeholder="Anote o que aconteceu, link do print, número, decisão..."
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-white/30 transition-all resize-none placeholder:text-white/20"
        />
        <button
          onClick={submit}
          disabled={!body.trim() || addNote.isPending}
          aria-label="Salvar anotação"
          className="absolute right-2 bottom-2.5 w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          {addNote.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>

      {error && <p className="text-red-400 text-[11px] font-bold">{error}</p>}

      {isLoading ? (
        <p className="text-white/25 text-[11px] font-bold">Carregando histórico...</p>
      ) : notes.length === 0 ? (
        <p className="text-white/20 text-[11px] font-bold">
          Nada registrado ainda. O que você escrever aqui fica guardado com data e hora.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {notes.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="group rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                    {stamp(n.created_at)}
                    {n.occurrence_date && (
                      <span className="text-white/20"> · ref. {format(parseISO(`${n.occurrence_date}T12:00:00`), 'dd/MM')}</span>
                    )}
                  </span>
                  {pendingDelete === n.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="text-[8px] font-black uppercase text-white/40 hover:text-white px-1"
                      >
                        não
                      </button>
                      <button
                        onClick={() => { delNote.mutate(n.id); setPendingDelete(null) }}
                        className="text-[8px] font-black uppercase text-red-400 hover:text-red-300 px-1"
                      >
                        excluir
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDelete(n.id)}
                      aria-label="Excluir anotação"
                      className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-white/80 mt-1 whitespace-pre-wrap break-words">{n.body}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
