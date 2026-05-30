'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, X, Flame, Play,
  CheckCheck, Clock, Loader2, GraduationCap, Plus,
} from 'lucide-react'
import { useStudyEntries, useUpsertStudyEntry } from '@/lib/hooks/useStudy'
import {
  usePomodoroStore,
  phaseDurationSeconds,
  PHASE_COLORS,
  PHASE_LABELS,
} from '@/lib/stores/pomodoroStore'
import { cn } from '@/lib/utils/cn'

// ────────────────────────────────────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────────────────────────────────────
function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatFull(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const WEEK_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ────────────────────────────────────────────────────────────────────────────
// Compact Pomodoro widget — links to existing PomodoroSidebar
// ────────────────────────────────────────────────────────────────────────────
function PomodoroWidget() {
  const { isRunning, phase, secondsLeft, settings, cycleCount, open } = usePomodoroStore()
  const totalSeconds = phaseDurationSeconds(phase, settings)
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const phaseColor = PHASE_COLORS[phase]

  const RADIUS = 18
  const CIRC = 2 * Math.PI * RADIUS
  const offset = CIRC * (1 - progress)

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const secs = (secondsLeft % 60).toString().padStart(2, '0')

  const cyclesInCurrent = settings.cyclesBeforeLong
  const filledDots = cycleCount % cyclesInCurrent

  const estimatedMinutes = cycleCount * settings.focusDuration
  const hrs = Math.floor(estimatedMinutes / 60)
  const minsRem = estimatedMinutes % 60

  return (
    <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          🍅 Modo Foco
        </p>
        {isRunning && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
      </div>

      <button
        onClick={open}
        className="w-full flex items-center gap-4 group"
      >
        {/* Mini ring */}
        <div className="relative shrink-0">
          <svg viewBox="0 0 44 44" className="w-14 h-14">
            <circle cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="3.5"
              style={{ stroke: 'var(--border-subtle)' }} />
            <circle
              cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 22 22)"
              style={{ stroke: phaseColor, transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isRunning ? (
              <span className="text-[9px] font-black tabular-nums text-[var(--text-primary)]">
                {mins}:{secs}
              </span>
            ) : (
              <Play size={12} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors ml-0.5" />
            )}
          </div>
        </div>

        <div className="flex-1 text-left">
          <p className="text-base font-black text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
            {isRunning ? `${mins}:${secs}` : 'Iniciar Foco'}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: phaseColor }}>
            {PHASE_LABELS[phase]}
          </p>
          {cycleCount > 0 && (
            <p className="text-[9px] text-[var(--text-muted)] mt-1">
              {cycleCount} sessão{cycleCount !== 1 ? 'ões' : ''} · {hrs > 0 ? `${hrs}h ` : ''}{minsRem}min
            </p>
          )}
        </div>
      </button>

      {/* Cycle dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: cyclesInCurrent }, (_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-500',
              i < filledDots
                ? 'w-2 h-2 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                : 'w-1.5 h-1.5 bg-[var(--border-subtle)]'
            )}
          />
        ))}
        <span className="ml-1 text-[9px] text-[var(--text-muted)]">
          {cyclesInCurrent - filledDots} para descanso longo
        </span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Streak card
// ────────────────────────────────────────────────────────────────────────────
function StreakCard({ streak, totalEntries }: { streak: number; totalEntries: number }) {
  return (
    <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl">
      <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
        📊 Estatísticas
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Flame size={16} className={streak > 0 ? 'text-orange-400' : 'text-[var(--text-muted)]'} />
            <span className="text-2xl font-black text-[var(--text-primary)]">{streak}</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Sequência
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <GraduationCap size={16} className="text-blue-400" />
            <span className="text-2xl font-black text-[var(--text-primary)]">{totalEntries}</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Dias estudados
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// History calendar — 14-day dots
// ────────────────────────────────────────────────────────────────────────────
function HistoryCalendar({
  entriesWithContent,
  selectedDate,
  today,
  onSelect,
}: {
  entriesWithContent: Set<string>
  selectedDate: string
  today: string
  onSelect: (date: string) => void
}) {
  const last14 = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => shiftDate(today, -(13 - i)))
  }, [today])

  return (
    <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl">
      <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
        📅 Últimos 14 dias
      </p>
      <div className="grid grid-cols-7 gap-1">
        {last14.map(date => {
          const hasEntry = entriesWithContent.has(date)
          const isSelected = date === selectedDate
          const isToday = date === today
          const dayNum = parseInt(date.split('-')[2], 10)
          const dayLetter = WEEK_LETTERS[new Date(date + 'T00:00:00').getDay()]

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-xl transition-all',
                isSelected
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : hasEntry
                  ? 'hover:bg-[var(--bg-primary)]'
                  : 'hover:bg-[var(--bg-primary)] opacity-50',
              )}
            >
              <span className={cn(
                'text-[8px] font-black uppercase',
                isSelected ? 'text-[var(--bg-primary)]/60' : 'text-[var(--text-muted)]'
              )}>
                {dayLetter}
              </span>
              <span className={cn(
                'text-[11px] font-black',
                isSelected ? 'text-[var(--bg-primary)]' : isToday ? 'text-red-400' : 'text-[var(--text-primary)]'
              )}>
                {dayNum}
              </span>
              <div className={cn(
                'w-1 h-1 rounded-full transition-all',
                isSelected ? 'bg-[var(--bg-primary)]/50' : hasEntry ? 'bg-red-500' : 'bg-transparent'
              )} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Subject tags input
// ────────────────────────────────────────────────────────────────────────────
function SubjectTags({
  subjects,
  onChange,
}: {
  subjects: string[]
  onChange: (subjects: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed || subjects.includes(trimmed)) {
      setInputVal('')
      return
    }
    onChange([...subjects, trimmed])
    setInputVal('')
  }

  const remove = (tag: string) => onChange(subjects.filter(s => s !== tag))

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && subjects.length) {
      remove(subjects[subjects.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-[36px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {subjects.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-full text-[10px] font-black text-[var(--text-secondary)]"
        >
          {tag}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); remove(tag) }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (inputVal.trim()) add(inputVal) }}
        placeholder={subjects.length === 0 ? 'Adicionar matéria (Enter)...' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-[11px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved'

export default function StudyPage() {
  const today = useMemo(isoToday, [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [content, setContent] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [currentEntryId, setCurrentEntryId] = useState<string | undefined>()

  const { data: entries = [], isLoading } = useStudyEntries()
  const upsert = useUpsertStudyEntry()

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const isToday = selectedDate === today

  // ── Derived data ────────────────────────────────────────────────────────
  const entriesWithContent = useMemo(() => {
    return new Set(entries.filter(e => e.content?.trim()).map(e => e.date))
  }, [entries])

  const totalEntries = entriesWithContent.size

  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    // If today has no notes yet, start counting from yesterday
    const startIso = isoToday()
    if (!entriesWithContent.has(startIso)) {
      d.setDate(d.getDate() - 1)
    }
    while (true) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!entriesWithContent.has(iso)) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [entriesWithContent])

  // ── Load entry for selected date ─────────────────────────────────────────
  useEffect(() => {
    const entry = entries.find(e => e.date === selectedDate)
    setContent(entry?.content ?? '')
    setSubjects(entry?.subjects ?? [])
    setCurrentEntryId(entry?.id)
    setSaveStatus('idle')
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [selectedDate, entries])

  // ── Auto-save ────────────────────────────────────────────────────────────
  const doSave = useCallback((c: string, s: string[], entryId: string | undefined) => {
    if (!c.trim() && s.length === 0) return // Don't save empty
    setSaveStatus('saving')
    upsert.mutate(
      { id: entryId, date: selectedDate, content: c, subjects: s },
      {
        onSuccess: (id) => {
          setSaveStatus('saved')
          if (id && !entryId) setCurrentEntryId(id as string)
          setTimeout(() => setSaveStatus('idle'), 2500)
        },
      }
    )
  }, [selectedDate, upsert])

  const scheduleAutoSave = useCallback((c: string, s: string[]) => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave(c, s, currentEntryId), 1500)
  }, [currentEntryId, doSave])

  const handleContentChange = (val: string) => {
    setContent(val)
    scheduleAutoSave(val, subjects)
  }

  const handleSubjectsChange = (s: string[]) => {
    setSubjects(s)
    scheduleAutoSave(content, s)
  }

  // ── Date navigation ──────────────────────────────────────────────────────
  const prevDay = () => setSelectedDate(d => shiftDate(d, -1))
  const nextDay = () => { if (!isToday) setSelectedDate(d => shiftDate(d, 1)) }
  const goToday = () => setSelectedDate(today)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-screen flex flex-col">
      {/* ─ Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 md:px-6 lg:px-8 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--text-primary)] leading-tight truncate">
              Caderno de Estudos
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize truncate">
              {formatFull(selectedDate)}
            </p>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-1 shrink-0">
            {!isToday && (
              <button
                onClick={goToday}
                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all mr-1"
              >
                Hoje
              </button>
            )}
            <button
              onClick={prevDay}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextDay}
              disabled={isToday}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ─ Body ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-10">
          <div className="flex flex-col lg:flex-row gap-6 h-full">

            {/* ── LEFT: Notepad ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col gap-4 lg:order-1 min-w-0">
              {/* Note header */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  📝 Notas do dia
                </p>
                {/* Save status */}
                <AnimatePresence mode="wait">
                  {saveStatus === 'saving' && (
                    <motion.div
                      key="saving"
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      className="flex items-center gap-1.5 text-[var(--text-muted)]"
                    >
                      <Loader2 size={11} className="animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Salvando</span>
                    </motion.div>
                  )}
                  {saveStatus === 'saved' && (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      className="flex items-center gap-1.5 text-emerald-400"
                    >
                      <CheckCheck size={11} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Salvo</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subjects */}
              <div className="px-4 py-2.5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Matérias / Tópicos
                </p>
                <SubjectTags subjects={subjects} onChange={handleSubjectsChange} />
              </div>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  value={content}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder={
                    isToday
                      ? 'O que você estudou hoje? Anote aqui conceitos, resumos, exercícios...'
                      : 'Notas deste dia...'
                  }
                  className={cn(
                    "w-full h-full min-h-[320px] lg:min-h-[480px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl",
                    "px-5 py-4 text-[var(--text-primary)] font-medium text-sm leading-relaxed",
                    "placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/20 transition-all resize-none",
                    "[scrollbar-width:none]"
                  )}
                />
                {/* Line count hint */}
                {content.length > 0 && (
                  <p className="absolute bottom-3 right-4 text-[9px] text-[var(--text-muted)]/50 select-none pointer-events-none">
                    {content.split('\n').length} linha{content.split('\n').length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* ── RIGHT: Gadgets sidebar ─────────────────────────────────── */}
            <div className="lg:w-[300px] xl:w-[320px] shrink-0 flex flex-col gap-4 lg:order-2">

              {/* Pomodoro widget */}
              <PomodoroWidget />

              {/* Streak + stats */}
              <StreakCard streak={streak} totalEntries={totalEntries} />

              {/* 14-day history */}
              <HistoryCalendar
                entriesWithContent={entriesWithContent}
                selectedDate={selectedDate}
                today={today}
                onSelect={setSelectedDate}
              />

              {/* Tips card */}
              <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  💡 Dicas
                </p>
                <ul className="space-y-1.5">
                  {[
                    'Use Enter para separar tópicos',
                    'Anote fórmulas e conceitos-chave',
                    'Revise as notas do dia anterior',
                    'Combine com o Modo Foco 🍅',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500/60 text-[10px] mt-0.5 shrink-0">→</span>
                      <span className="text-[11px] text-[var(--text-muted)] leading-snug">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
