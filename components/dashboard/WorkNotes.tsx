'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Trash2, MessageSquare, ImagePlus, X } from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useWorkNotes, useAddWorkNote, useDeleteWorkNote,
  uploadNoteAttachment, ATTACHMENT_MAX_BYTES,
} from '@/lib/hooks/useWork'

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
  const [pending, setPending] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const picked: File[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { setError('Só imagens são aceitas.'); continue }
      if (f.size > ATTACHMENT_MAX_BYTES) { setError(`"${f.name}" passa de 10 MB.`); continue }
      picked.push(f)
    }
    if (picked.length) { setError(''); setPending(p => [...p, ...picked]) }
  }

  const submit = async () => {
    const text = body.trim()
    if ((!text && pending.length === 0) || addNote.isPending || uploading) return
    setError('')
    try {
      let urls: string[] = []
      if (pending.length) {
        setUploading(true)
        urls = await Promise.all(pending.map(f => uploadNoteAttachment(itemId, f)))
      }
      await addNote.mutateAsync({
        itemId,
        // Anotação só com print não fica sem texto nenhum na lista.
        body: text || (urls.length > 1 ? `${urls.length} imagens anexadas` : 'Imagem anexada'),
        occurrenceDate,
        attachments: urls,
      })
      setBody('')
      setPending([])
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar a anotação.')
    } finally {
      setUploading(false)
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
          onPaste={e => {
            // Print colado direto do Ctrl+V vem como item de imagem.
            const imgs = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'))
            if (imgs.length) { e.preventDefault(); addFiles(imgs) }
          }}
          onKeyDown={e => {
            // Enter envia; Shift+Enter quebra linha — mesma convenção do chat.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          rows={2}
          placeholder="Anote o que aconteceu, cole um print, número, decisão..."
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 pr-20 text-white text-sm focus:outline-none focus:border-white/30 transition-all resize-none placeholder:text-white/20"
        />
        <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => { addFiles(e.target.files); if (fileInput.current) fileInput.current.value = '' }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            aria-label="Anexar imagem"
            title="Anexar imagem (ou cole com Ctrl+V)"
            className="w-8 h-8 rounded-xl border border-white/10 text-white/40 flex items-center justify-center hover:text-white hover:border-white/30 transition-all"
          >
            <ImagePlus size={13} />
          </button>
          <button
            onClick={submit}
            disabled={(!body.trim() && pending.length === 0) || addNote.isPending || uploading}
            aria-label="Salvar anotação"
            className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {addNote.isPending || uploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>

      {/* Fila de anexos antes de enviar */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((f, i) => (
            <div key={`${f.name}_${i}`} className="relative group/att">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt={f.name}
                className="w-14 h-14 object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={() => setPending(p => p.filter((_, j) => j !== i))}
                aria-label={`Remover ${f.name}`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="w-14 h-14 rounded-lg border border-white/10 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-white/40" />
            </div>
          )}
        </div>
      )}

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
                {n.attachments && n.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {n.attachments.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir em tamanho real"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Anexo ${i + 1}`}
                          loading="lazy"
                          className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-white/40 transition-colors"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
