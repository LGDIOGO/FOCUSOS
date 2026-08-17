'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, Plus, Check, Loader2, Pencil, Trash2,
  ArrowLeft, RefreshCw, Zap, ChevronRight, RotateCcw, Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { auth, db } from '@/lib/firebase/config'
import { useQueryClient } from '@tanstack/react-query'
import { collection, addDoc, deleteDoc, doc, updateDoc, deleteField } from 'firebase/firestore'
import { format } from 'date-fns'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'
import { useHabits } from '@/lib/hooks/useHabits'
import { useGoals } from '@/lib/hooks/useGoals'
import { useTasks } from '@/lib/hooks/useTasks'
import { useEvents } from '@/lib/hooks/useEvents'

const STORAGE_KEY = 'focusos_ia_v1'
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const QUICK_PROMPTS = [
  { label: 'Como está minha semana?', emoji: '📊' },
  { label: 'Crie uma rotina matinal para mim', emoji: '🌅' },
  { label: 'Sugira 5 hábitos de saúde', emoji: '💪' },
  { label: 'Quais hábitos devo melhorar?', emoji: '🎯' },
  { label: 'Me ajude a criar metas anuais', emoji: '🏆' },
  { label: 'Organize minha agenda dessa semana', emoji: '📅' },
]

interface Message {
  role: 'user' | 'ai'
  content: string
  suggestions?: { habits: any[]; events: any[]; goals?: any[] }
  actions?: {
    modify?: Array<{ id: string; collection: string; updates: any }>
    delete?: Array<{ id: string; collection: string }>
  }
  applied?: string[]
  actionsApplied?: boolean
  timestamp?: number
}

function parseSuggestions(text: string) {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)
  if (match) {
    try { return JSON.parse(match[1]) } catch {}
  }
  return null
}

function parseActions(text: string) {
  const match = text.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/)
  if (match) {
    try { return JSON.parse(match[1]) } catch {}
  }
  return null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Aceita só YYYY-MM-DD válido; qualquer outra coisa vira hoje. */
function normalizeDate(value: unknown): string {
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const d = new Date(`${value}T12:00:00`)
    if (!isNaN(d.getTime())) return value
  }
  return format(new Date(), 'yyyy-MM-dd')
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * A IA às vezes devolve `weekly` + `days_of_week` (ex.: toda terça). Mas em
 * `useEvents.occursOnDate` a frequência `weekly` ignora `days_of_week` e segue
 * o dia da semana da data inicial — o que silenciosamente erra quando os dois
 * discordam. `specific_days` respeita a lista, então convertemos.
 */
function normalizeRecurrence(rec: any) {
  if (!rec?.frequency) return undefined
  const days = Array.isArray(rec.days_of_week) ? rec.days_of_week.filter((d: any) => Number.isInteger(d) && d >= 0 && d <= 6) : []
  if (rec.frequency === 'weekly' && days.length > 0 && days.length < 7) {
    return { ...rec, frequency: 'specific_days', days_of_week: days, interval: rec.interval || 1 }
  }
  if (rec.frequency === 'specific_days' && days.length === 0) {
    return { ...rec, frequency: 'weekly', interval: rec.interval || 1 } // sem dias: cai p/ semanal
  }
  return { ...rec, interval: rec.interval || 1 }
}

/** Texto curto de recorrência para o card ("Ter, Qui", "a cada 2 dias"...). */
function recurrenceLabel(raw: any): string | null {
  const rec = normalizeRecurrence(raw)
  if (!rec?.frequency) return null
  const n = rec.interval && rec.interval > 1 ? rec.interval : 1
  switch (rec.frequency) {
    case 'specific_days': {
      const days = (rec.days_of_week || []).slice().sort((a: number, b: number) => a - b)
      if (!days.length) return 'Semanal'
      if (days.length === 7) return 'Todo dia'
      if (days.join() === '1,2,3,4,5') return 'Seg a Sex'
      return days.map((d: number) => DAY_NAMES[d]).join(', ')
    }
    case 'daily':   return n > 1 ? `A cada ${n} dias` : 'Todo dia'
    case 'weekly':  return n > 1 ? `A cada ${n} semanas` : 'Toda semana'
    case 'monthly': return n > 1 ? `A cada ${n} meses` : 'Todo mês'
    case 'yearly':  return 'Todo ano'
    default:        return null
  }
}

/** "16 ago" ou "Hoje" / "Amanhã". */
function dateLabel(value: unknown): string {
  const iso = normalizeDate(value)
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(new Date(Date.now() + 864e5), 'yyyy-MM-dd')
  if (iso === today) return 'Hoje'
  if (iso === tomorrow) return 'Amanhã'
  try { return format(new Date(`${iso}T12:00:00`), "d MMM") } catch { return iso }
}

function cleanText(text: string) {
  return text
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '')
    .replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, '')
    .trim()
}

function formatContent(content: string) {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    const t = line.trim()
    if (!t) return <div key={i} className="h-2" />
    const bold = (s: string) =>
      s.split(/\*\*(.*?)\*\*/).map((p, j) =>
        j % 2 === 1 ? <strong key={j} className="text-white font-black">{p}</strong> : p
      )
    if (t.startsWith('### ')) return <h3 key={i} className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-5 mb-2">{bold(t.slice(4))}</h3>
    if (t.startsWith('## ')) return <h2 key={i} className="text-xs font-black text-white/60 uppercase tracking-widest mt-5 mb-2">{bold(t.slice(3))}</h2>
    if (t.startsWith('# ')) return <h1 key={i} className="text-sm font-black text-white mt-5 mb-2">{bold(t.slice(2))}</h1>
    if (t.startsWith('* ') || t.startsWith('- '))
      return (
        <div key={i} className="flex gap-2 mb-1.5 pl-1">
          <span className="text-white/30 mt-1.5 text-xs">•</span>
          <p className="flex-1 opacity-80 leading-relaxed text-sm">{bold(t.slice(2))}</p>
        </div>
      )
    return <p key={i} className="mb-2 opacity-80 leading-relaxed text-sm last:mb-0">{bold(line)}</p>
  })
}

/** Cabeçalho de uma seção de sugestões, com atalho para aplicar todas. */
function SectionHeader({
  label, pending, busy, onApplyAll,
}: {
  label: string; pending: number; busy: boolean; onApplyAll: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 mt-4 mb-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
      {pending > 1 && (
        <button
          onClick={onApplyAll}
          disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 hover:border-white/25 hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-wider text-white/50 hover:text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          Adicionar todos ({pending})
        </button>
      )}
    </div>
  )
}

export default function IAPage() {
  const qc = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<{
    msgIndex: number; itemIndex: number; type: 'habit' | 'event'; data: any
  } | null>(null)
  const [removedSuggestions, setRemovedSuggestions] = useState<string[]>([])
  const [bulkApplying, setBulkApplying] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: habitsData } = useHabits()
  const { data: goalsData } = useGoals()
  const { data: tasksData } = useTasks()
  const { data: eventsData } = useEvents()

  const userData = useMemo(() => ({
    habits: habitsData || [],
    goals: goalsData || [],
    tasks: tasksData || [],
    events: eventsData || [],
  }), [habitsData, goalsData, tasksData, eventsData])

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setMessages(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages, loaded])

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const resp = await fetch('/api/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userData,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erro no servidor')

      const raw = data.message || ''
      const suggestions = parseSuggestions(raw)
      const actions = parseActions(raw)
      const clean = cleanText(raw)

      setMessages(prev => [...prev, {
        role: 'ai',
        content: clean || 'Desculpe, não entendi. Pode repetir?',
        suggestions: suggestions || undefined,
        actions: actions || undefined,
        timestamp: Date.now(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Erro técnico: ${err.message}. Tente novamente.`,
        timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestion = async (
    type: 'habit' | 'event' | 'goal', item: any, msgIndex: number, itemIndex: number
  ) => {
    const user = auth.currentUser
    if (!user) return alert('Faça login para salvar.')

    const sid = `${type}-${itemIndex}`
    try {
      const msg = messages[msgIndex]
      const existing = msg.applied?.find(a => a.startsWith(sid))
      const existingId = existing?.split(':')[1]

      if (existingId) {
        const coll = type === 'habit' ? 'habits' : type === 'event' ? 'events' : 'goals'
        // Firestore rejeita `undefined` — ex.: remover a repetição de um evento
        // deixa `recurrence: undefined`. Vira deleteField() para apagar de fato.
        const patch: Record<string, any> = { updated_at: new Date().toISOString() }
        for (const [k, v] of Object.entries(item)) {
          patch[k] = v === undefined ? deleteField() : v
        }
        if (type === 'event') patch.date = normalizeDate(item.date)
        await updateDoc(doc(db, coll, existingId), patch)
      } else {
        let docRef
        if (type === 'habit') {
          docRef = await addDoc(collection(db, 'habits'), {
            name: item.name || 'Novo Hábito',
            type: item.type || 'positive',
            emoji: item.emoji || '✨',
            description: item.description || '',
            time: item.time || '08:00',
            recurrence: normalizeRecurrence(item.recurrence) || { frequency: 'daily', interval: 1, days_of_week: [0,1,2,3,4,5,6] },
            user_id: user.uid,
            start_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'none',
            streak: 0,
            is_archived: false,
            created_at: new Date().toISOString(),
          })
        } else if (type === 'event') {
          // A data vem da IA (já resolvida para ISO). Só cai para hoje se
          // vier vazia/inválida — antes isto era fixo em hoje e jogava fora
          // qualquer prazo ou agendamento futuro sugerido.
          docRef = await addDoc(collection(db, 'events'), {
            title: item.title || 'Novo Evento',
            time: item.time || '08:00',
            type: item.type || 'task',
            emoji: item.emoji || '📅',
            description: item.description || '',
            user_id: user.uid,
            date: normalizeDate(item.date),
            status: 'none',
            ...(normalizeRecurrence(item.recurrence) ? { recurrence: normalizeRecurrence(item.recurrence) } : {}),
            ...(item.end_date ? { end_date: item.end_date } : {}),
            created_at: new Date().toISOString(),
          })
        } else {
          docRef = await addDoc(collection(db, 'goals'), {
            title: item.title || 'Nova Meta',
            user_id: user.uid,
            emoji: item.emoji || '🎯',
            description: item.description || '',
            color: item.color || '#FF453A',
            priority: item.priority || 'medium',
            status: 'active',
            current_value: 0,
            target_value: item.target_value || 100,
            initial_value: 0,
            progress_pct: 0,
            unit: item.unit || 'vezes',
            term: item.term || 'annual',
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: item.end_date || '2026-12-31',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
        if (docRef) {
          setMessages(prev => prev.map((m, i) =>
            i === msgIndex
              ? { ...m, applied: [...(m.applied || []), `${sid}:${docRef.id}`] }
              : m
          ))
        }
      }
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['goals'] })
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`)
    }
  }

  /** Aplica de uma vez todas as sugestões ainda não aplicadas de um tipo. */
  const handleApplyAll = async (
    type: 'habit' | 'event' | 'goal', items: any[], msgIndex: number
  ) => {
    if (!auth.currentUser) return alert('Faça login para salvar.')
    setBulkApplying(`${msgIndex}-${type}`)
    try {
      for (let idx = 0; idx < items.length; idx++) {
        if (removedSuggestions.includes(`${msgIndex}-${type}-${idx}`)) continue
        if (isApplied(msgIndex, type, idx)) continue
        await handleApplySuggestion(type, items[idx], msgIndex, idx)
      }
    } finally {
      setBulkApplying(null)
    }
  }

  const handleUnapplySuggestion = async (
    type: 'habit' | 'event' | 'goal', msgIndex: number, itemIndex: number
  ) => {
    const user = auth.currentUser
    if (!user) return
    const sid = `${type}-${itemIndex}`
    const pid = messages[msgIndex].applied?.find(a => a.startsWith(sid))
    if (pid) {
      const coll = type === 'habit' ? 'habits' : type === 'event' ? 'events' : 'goals'
      try { await deleteDoc(doc(db, coll, pid.split(':')[1])) } catch {}
    }
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, applied: (m.applied || []).filter(a => !a.startsWith(sid)) } : m
    ))
    qc.invalidateQueries({ queryKey: ['habits'] })
    qc.invalidateQueries({ queryKey: ['events'] })
    qc.invalidateQueries({ queryKey: ['goals'] })
  }

  const handleApplyActions = async (actions: Message['actions'], msgIndex: number) => {
    const user = auth.currentUser
    if (!user || !actions) return
    try {
      for (const item of (actions.modify || [])) {
        await updateDoc(doc(db, item.collection, item.id), {
          ...item.updates,
          updated_at: new Date().toISOString(),
        })
      }
      for (const item of (actions.delete || [])) {
        await deleteDoc(doc(db, item.collection, item.id))
      }
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, actionsApplied: true } : m))
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    } catch (err: any) {
      alert(`Erro ao aplicar ações: ${err.message}`)
    }
  }

  const handleUpdateEditItem = (field: string, value: any) => {
    if (!editingItem) return
    setEditingItem({ ...editingItem, data: { ...editingItem.data, [field]: value } })
  }

  const toggleDay = (day: number) => {
    if (!editingItem) return
    const cur = editingItem.data.recurrence?.days_of_week || []
    const next = cur.includes(day) ? cur.filter((d: number) => d !== day) : [...cur, day].sort()
    setEditingItem({
      ...editingItem,
      data: { ...editingItem.data, recurrence: { ...editingItem.data.recurrence, frequency: 'specific_days', days_of_week: next } },
    })
  }

  const saveEdit = async () => {
    if (!editingItem) return
    await handleApplySuggestion(editingItem.type, editingItem.data, editingItem.msgIndex, editingItem.itemIndex)
    // Reflete a edição no array certo. (Antes faltava o bloco no `if`, então
    // editar um evento sobrescrevia uma posição do array de hábitos.)
    setMessages(prev => prev.map((m, i) => {
      if (i !== editingItem.msgIndex || !m.suggestions) return m
      const key = editingItem.type === 'habit' ? 'habits' : 'events'
      const list = m.suggestions[key]
      if (!Array.isArray(list)) return m
      const next = [...list]
      next[editingItem.itemIndex] = editingItem.data
      return { ...m, suggestions: { ...m.suggestions, [key]: next } }
    }))
    setEditingItem(null)
  }

  const isApplied = (msgIndex: number, type: string, itemIndex: number) =>
    messages[msgIndex]?.applied?.some(a => a.startsWith(`${type}-${itemIndex}`)) ?? false

  /** Quantas sugestões de um tipo ainda faltam aplicar (ignora as removidas). */
  const countPending = (msgIndex: number, type: string, items: any[] = []) =>
    items.filter((_, idx) =>
      !isApplied(msgIndex, type, idx) &&
      !removedSuggestions.includes(`${msgIndex}-${type}-${idx}`)
    ).length

  const showWelcome = loaded && messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen bg-[#050505] text-white relative">

      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 lg:px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
            <Sparkles size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">FocusOS IA</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Assistente Pessoal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Context stats */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-wider">
            <span>{userData.habits.length} hábitos</span>
            <span className="text-white/10">•</span>
            <span>{userData.goals.length} metas</span>
            <span className="text-white/10">•</span>
            <span>{userData.tasks.length} tarefas</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([])
                setRemovedSuggestions([])
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <RotateCcw size={12} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Messages / Welcome */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.15)]">
                <Sparkles size={32} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">FocusOS IA</h2>
                <p className="text-white/40 text-sm mt-1 font-medium">
                  Seu assistente de produtividade pessoal
                </p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-4 text-center"
            >
              {[
                { value: userData.habits.length, label: 'Hábitos' },
                { value: userData.goals.length, label: 'Metas' },
                { value: userData.tasks.length, label: 'Tarefas' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-3">
                  <p className="text-xl font-black">{s.value}</p>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Quick prompts */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg"
            >
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.label)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.06] transition-all text-left group"
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-xs font-bold text-white/60 group-hover:text-white/90 transition-colors flex-1">{p.label}</span>
                  <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex flex-col gap-3', msg.role === 'user' ? 'items-end' : 'items-start')}
                >
                  {/* Bubble */}
                  <div className={cn(
                    'max-w-[85%] px-5 py-4 rounded-[22px] text-sm font-medium',
                    msg.role === 'user'
                      ? 'bg-white text-black rounded-br-md'
                      : 'bg-white/[0.05] text-white/90 border border-white/[0.08] rounded-bl-md'
                  )}>
                    {formatContent(msg.content)}
                  </div>

                  {/* Actions card */}
                  {msg.actions && ((msg.actions.modify?.length ?? 0) + (msg.actions.delete?.length ?? 0)) > 0 && (
                    <div className="w-full max-w-[85%] bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">
                        Ações Propostas pela IA
                      </p>
                      {(msg.actions.modify || []).map((a, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs text-white/60">
                          <span className="text-amber-400">✏️</span>
                          <span>Modificar <span className="text-white font-bold">{a.collection}</span> [{a.id.slice(0, 8)}...]</span>
                        </div>
                      ))}
                      {(msg.actions.delete || []).map((a, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs text-white/60">
                          <span className="text-red-400">🗑️</span>
                          <span>Excluir <span className="text-white font-bold">{a.collection}</span> [{a.id.slice(0, 8)}...]</span>
                        </div>
                      ))}
                      {!msg.actionsApplied ? (
                        <button
                          onClick={() => handleApplyActions(msg.actions, i)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                        >
                          Aplicar Ações
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-black text-green-400 uppercase tracking-wider">
                          <Check size={14} /> Ações Aplicadas
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && (
                    <div className="w-full space-y-3">
                      {(msg.suggestions.habits || []).length > 0 && (
                        <>
                          <SectionHeader
                            label="Hábitos Sugeridos"
                            pending={countPending(i, 'habit', msg.suggestions.habits)}
                            busy={bulkApplying === `${i}-habit`}
                            onApplyAll={() => handleApplyAll('habit', msg.suggestions!.habits, i)}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.suggestions.habits.map((h, idx) => {
                              const key = `${i}-habit-${idx}`
                              if (removedSuggestions.includes(key)) return null
                              const applied = isApplied(i, 'habit', idx)
                              return (
                                <div key={key} className={cn(
                                  'bg-white/[0.03] border p-4 rounded-2xl flex flex-col gap-2 transition-all',
                                  h.type === 'negative' ? 'border-red-500/15 hover:border-red-500/30' : 'border-white/[0.07] hover:border-white/15',
                                  applied && 'border-green-500/20 bg-green-500/[0.03]'
                                )}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-xl shrink-0">{h.emoji}</span>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="font-bold text-sm text-white truncate">{h.name}</p>
                                          {h.type === 'negative' && (
                                            <span className="text-[8px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full uppercase shrink-0">Evitar</span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-white/30 truncate">{h.time} · {h.description}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                      {!applied && (
                                        <>
                                          <button onClick={() => setEditingItem({ msgIndex: i, itemIndex: idx, type: 'habit', data: h })} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white">
                                            <Pencil size={13} />
                                          </button>
                                          <button onClick={() => setRemovedSuggestions(p => [...p, key])} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-white/30 hover:text-red-400">
                                            <Trash2 size={13} />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => applied ? handleUnapplySuggestion('habit', i, idx) : handleApplySuggestion('habit', h, i, idx)}
                                        className={cn(
                                          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                                          applied ? 'bg-green-500 text-white hover:bg-red-500' : 'bg-white text-black hover:scale-110'
                                        )}
                                      >
                                        {applied ? <Check size={15} /> : <Plus size={15} />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {(msg.suggestions.events || []).length > 0 && (
                        <>
                          <SectionHeader
                            label="Compromissos"
                            pending={countPending(i, 'event', msg.suggestions.events)}
                            busy={bulkApplying === `${i}-event`}
                            onApplyAll={() => handleApplyAll('event', msg.suggestions!.events, i)}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.suggestions.events.map((e, idx) => {
                              const key = `${i}-event-${idx}`
                              if (removedSuggestions.includes(key)) return null
                              const applied = isApplied(i, 'event', idx)
                              return (
                                <div key={key} className={cn(
                                  'bg-white/[0.03] border border-white/[0.07] p-4 rounded-2xl flex items-center justify-between transition-all hover:border-white/15',
                                  applied && 'border-green-500/20 bg-green-500/[0.03]'
                                )}>
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-xl shrink-0">{e.emoji}</span>
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-white truncate">{e.title}</p>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-white/50 bg-white/[0.07] px-1.5 py-0.5 rounded-md shrink-0">
                                          {dateLabel(e.date)}{e.time ? ` · ${e.time}` : ''}
                                        </span>
                                        {recurrenceLabel(e.recurrence) && (
                                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded-md shrink-0">
                                            <Repeat size={8} />{recurrenceLabel(e.recurrence)}
                                          </span>
                                        )}
                                        {e.end_date && (
                                          <span className="text-[9px] font-bold text-white/30 shrink-0">até {dateLabel(e.end_date)}</span>
                                        )}
                                      </div>
                                      {e.description && (
                                        <p className="text-[10px] text-white/30 truncate mt-0.5">{e.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {!applied && (
                                      <>
                                        <button onClick={() => setEditingItem({ msgIndex: i, itemIndex: idx, type: 'event', data: e })} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white">
                                          <Pencil size={13} />
                                        </button>
                                        <button onClick={() => setRemovedSuggestions(p => [...p, key])} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-white/30 hover:text-red-400">
                                          <Trash2 size={13} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => applied ? handleUnapplySuggestion('event', i, idx) : handleApplySuggestion('event', e, i, idx)}
                                      className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                                        applied ? 'bg-green-500 text-white hover:bg-red-500' : 'bg-white text-black hover:scale-110'
                                      )}
                                    >
                                      {applied ? <Check size={15} /> : <Plus size={15} />}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {(msg.suggestions.goals || []).length > 0 && (
                        <>
                          <SectionHeader
                            label="Metas Estratégicas"
                            pending={countPending(i, 'goal', msg.suggestions.goals || [])}
                            busy={bulkApplying === `${i}-goal`}
                            onApplyAll={() => handleApplyAll('goal', msg.suggestions!.goals!, i)}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(msg.suggestions.goals || []).map((g, idx) => {
                              const key = `${i}-goal-${idx}`
                              if (removedSuggestions.includes(key)) return null
                              const applied = isApplied(i, 'goal', idx)
                              return (
                                <div key={key} className={cn(
                                  'bg-white/[0.03] border border-dashed border-white/[0.07] p-4 rounded-2xl flex items-center justify-between transition-all hover:border-white/15',
                                  applied && 'border-green-500/20 bg-green-500/[0.03]'
                                )}>
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-xl shrink-0">{g.emoji}</span>
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-white truncate">{g.title}</p>
                                      <p className="text-[10px] text-white/30 truncate">Meta: {g.target_value} {g.unit} · {g.description}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => applied ? handleUnapplySuggestion('goal', i, idx) : handleApplySuggestion('goal', g, i, idx)}
                                    className={cn(
                                      'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-2',
                                      applied ? 'bg-green-500 text-white hover:bg-red-500' : 'bg-white text-black hover:scale-110'
                                    )}
                                  >
                                    {applied ? <Check size={15} /> : <Plus size={15} />}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-white/30 text-xs px-1">
                <Loader2 className="animate-spin w-3.5 h-3.5" />
                <span>FocusOS IA está pensando...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Quick chips when chat has messages */}
      {messages.length > 0 && (
        <div className="flex-none px-4 lg:px-6 pb-2 overflow-x-auto">
          <div className="flex gap-2 max-w-3xl mx-auto">
            {QUICK_PROMPTS.slice(0, 4).map(p => (
              <button
                key={p.label}
                onClick={() => sendMessage(p.label)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07] transition-all text-xs font-bold text-white/40 hover:text-white/80 disabled:opacity-40"
              >
                <span>{p.emoji}</span>
                <span className="hidden sm:block">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-none px-4 lg:px-6 pb-4 pt-2 border-t border-white/[0.05] bg-[#030303]">
        <div className="relative max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            placeholder="Pergunte algo ou peça para criar hábitos, metas..."
            rows={1}
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-white/25 transition-all pr-14 resize-none placeholder:text-white/25 font-medium leading-relaxed"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-center text-[9px] text-white/15 mt-2 font-bold uppercase tracking-wider max-w-3xl mx-auto">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>

      {/* Edit drawer */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 bg-[#0D0D0D] border-t border-white/10 rounded-t-[32px] p-6 z-50 shadow-[0_-30px_80px_rgba(0,0,0,0.8)] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingItem(null)} className="p-1.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                  <ArrowLeft size={18} />
                </button>
                <h3 className="font-black text-base">Personalizar Sugestão</h3>
              </div>
              <button
                onClick={saveEdit}
                className="bg-white text-black px-5 py-2 rounded-full text-xs font-black hover:bg-neutral-200 transition-all uppercase tracking-wide"
              >
                Confirmar
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Nome</p>
                <input
                  value={editingItem.type === 'habit' ? editingItem.data.name : editingItem.data.title}
                  onChange={e => handleUpdateEditItem(editingItem.type === 'habit' ? 'name' : 'title', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-white/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Emoji</p>
                  <EmojiPicker value={editingItem.data.emoji || ''} onChange={e => handleUpdateEditItem('emoji', e)} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Horário</p>
                  <CustomDateTimePicker
                    label="Horário"
                    type="time"
                    value={editingItem.data.time || '08:00'}
                    onChange={v => handleUpdateEditItem('time', v)}
                    align="right"
                  />
                </div>
              </div>

              {editingItem.type === 'event' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">
                      {editingItem.data.recurrence?.frequency ? 'Começa em' : 'Data'}
                    </p>
                    <CustomDateTimePicker
                      label="Data"
                      type="date"
                      value={normalizeDate(editingItem.data.date)}
                      onChange={v => handleUpdateEditItem('date', v)}
                      direction="up"
                    />
                  </div>
                  {editingItem.data.recurrence?.frequency && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Termina em</p>
                      <CustomDateTimePicker
                        label="Fim"
                        type="date"
                        value={editingItem.data.end_date || ''}
                        onChange={v => handleUpdateEditItem('end_date', v)}
                        align="right"
                        direction="up"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Repetição</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ...(editingItem.type === 'event' ? [{ id: 'none', label: 'Não repete' }] : []),
                    { id: 'daily', label: 'Diário' },
                    { id: 'weekly', label: 'Semanal' },
                    { id: 'specific_days', label: 'Dias fixos' },
                    { id: 'monthly', label: 'Mensal' },
                    { id: 'yearly', label: 'Anual' },
                  ].map(f => {
                    const current = editingItem.data.recurrence?.frequency || (editingItem.type === 'event' ? 'none' : undefined)
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleUpdateEditItem(
                          'recurrence',
                          f.id === 'none' ? undefined : {
                            ...editingItem.data.recurrence,
                            frequency: f.id,
                            interval: editingItem.data.recurrence?.interval || 1,
                            days_of_week: f.id === 'specific_days'
                              ? (editingItem.data.recurrence?.days_of_week?.length ? editingItem.data.recurrence.days_of_week : [1, 2, 3, 4, 5])
                              : [0, 1, 2, 3, 4, 5, 6],
                          }
                        )}
                        className={cn(
                          'py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all',
                          current === f.id ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                        )}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>

                {editingItem.data.recurrence?.frequency === 'specific_days' && (
                  <div className="flex justify-between gap-1 mt-3">
                    {DAYS.map((d, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          'w-9 h-9 rounded-xl font-black text-sm transition-all',
                          editingItem.data.recurrence?.days_of_week?.includes(idx) ? 'bg-white text-black' : 'text-white/20 border border-white/5 hover:bg-white/5'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                {/* A cada N: "dia sim dia não", "quinzenal", etc. */}
                {['daily', 'weekly', 'monthly'].includes(editingItem.data.recurrence?.frequency) && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold text-white/40">A cada</span>
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => handleUpdateEditItem('recurrence', { ...editingItem.data.recurrence, interval: n })}
                        className={cn(
                          'w-9 h-8 rounded-lg text-xs font-black transition-all',
                          (editingItem.data.recurrence?.interval || 1) === n ? 'bg-white text-black' : 'text-white/30 border border-white/10 hover:bg-white/5'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-[10px] font-bold text-white/40">
                      {editingItem.data.recurrence?.frequency === 'daily' ? 'dia(s)'
                        : editingItem.data.recurrence?.frequency === 'weekly' ? 'semana(s)' : 'mês(es)'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-2">Descrição</p>
                <textarea
                  value={editingItem.data.description || ''}
                  onChange={e => handleUpdateEditItem('description', e.target.value)}
                  rows={3}
                  placeholder="Adicionar detalhes..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all resize-none font-medium"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
