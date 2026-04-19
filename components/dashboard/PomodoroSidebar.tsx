'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Play, Pause, RotateCcw, SkipForward, Settings2,
  Upload, Trash2, ImageIcon, ChevronUp, ChevronDown, Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  usePomodoroStore,
  phaseDurationSeconds,
  PHASE_COLORS,
  PHASE_LABELS,
  MOTIVATIONAL_MESSAGES,
  PomodoroPhase,
  PomodoroSettings,
} from '@/lib/stores/pomodoroStore'
import { usePomodoroImages } from '@/lib/hooks/usePomodoroImages'

const R = 80
const CIRCUMFERENCE = 2 * Math.PI * R

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function CircleTimer({
  phase,
  secondsLeft,
  totalSeconds,
}: {
  phase: PomodoroPhase
  secondsLeft: number
  totalSeconds: number
}) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const color = PHASE_COLORS[phase]

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg viewBox="0 0 200 200" width={200} height={200} className="absolute">
        {/* Track */}
        <circle cx={100} cy={100} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        {/* Glow */}
        <circle
          cx={100} cy={100} r={R}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.6s ease', filter: 'blur(8px)', opacity: 0.35 }}
        />
        {/* Progress */}
        <circle
          cx={100} cy={100} r={R}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.6s ease' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center gap-1 select-none">
        <span className="text-[52px] font-black tracking-tighter text-[var(--text-primary)] tabular-nums leading-none">
          {formatTime(secondsLeft)}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] mt-1" style={{ color }}>
          {PHASE_LABELS[phase]}
        </span>
      </div>
    </div>
  )
}

function CycleDots({ count, max }: { count: number; max: number }) {
  const filled = count % max
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-500',
            i < filled
              ? 'w-2 h-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              : 'w-1.5 h-1.5 bg-white/10'
          )}
        />
      ))}
    </div>
  )
}

function SettingsPanel({
  settings,
  onUpdate,
  onClose,
}: {
  settings: PomodoroSettings
  onUpdate: (s: Partial<PomodoroSettings>) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState(settings)

  const fields: { key: keyof PomodoroSettings; label: string; min: number; max: number; unit: string }[] = [
    { key: 'focusDuration', label: 'Tempo de Foco', min: 1, max: 90, unit: 'min' },
    { key: 'shortBreakDuration', label: 'Descanso Curto', min: 1, max: 30, unit: 'min' },
    { key: 'longBreakDuration', label: 'Descanso Longo', min: 5, max: 60, unit: 'min' },
    { key: 'cyclesBeforeLong', label: 'Ciclos até Descanso Longo', min: 2, max: 10, unit: 'x' },
  ]

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden' }}
      className="border-b border-[var(--border-subtle)]"
    >
      <div className="p-5 space-y-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Configurações do Timer
        </p>
        {fields.map(({ key, label, min, max, unit }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
              <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">
                {local[key]}{unit}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={local[key]}
              onChange={e => setLocal(prev => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full h-1 rounded-full accent-red-500 cursor-pointer"
            />
          </div>
        ))}
        <button
          onClick={() => { onUpdate(local); onClose() }}
          className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95"
        >
          Salvar Configurações
        </button>
      </div>
    </motion.div>
  )
}

export function PomodoroSidebar() {
  const {
    isOpen, close, isRunning, phase, secondsLeft, cycleCount,
    settings, motivationIndex, showMotivation, carouselIndex,
    startStop, reset, tick, skipPhase, updateSettings,
    setCarouselIndex, hideMotivation,
  } = usePomodoroStore()

  const { images, uploading, uploadProgress, uploadImage, deleteImage } = usePomodoroImages()

  const [showSettings, setShowSettings] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSeconds = phaseDurationSeconds(phase, settings)
  const safeCarouselIndex = images.length > 0 ? carouselIndex % images.length : 0
  const currentImage = images[safeCarouselIndex]

  // Timer interval
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Auto-advance carousel during focus
  useEffect(() => {
    if (images.length <= 1 || !isRunning || phase !== 'focus') return
    const interval = setInterval(() => {
      setCarouselIndex((safeCarouselIndex + 1) % images.length)
    }, 20000)
    return () => clearInterval(interval)
  }, [images.length, isRunning, phase, safeCarouselIndex, setCarouselIndex])

  // Auto-hide motivation after 8s
  useEffect(() => {
    if (!showMotivation) return
    const t = setTimeout(hideMotivation, 8000)
    return () => clearTimeout(t)
  }, [showMotivation, motivationIndex, hideMotivation])

  // Update document title
  useEffect(() => {
    if (!isRunning) {
      document.title = 'FocusOS'
      return
    }
    document.title = `${formatTime(secondsLeft)} · ${PHASE_LABELS[phase]} — FocusOS`
    return () => { document.title = 'FocusOS' }
  }, [isRunning, secondsLeft, phase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || [])
      .filter(f => f.type.startsWith('image/'))
      .forEach(uploadImage)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const cyclesUntilLong = settings.cyclesBeforeLong - (cycleCount % settings.cyclesBeforeLong)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-dvh w-full sm:w-[400px] z-[200] bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Timer size={17} className="text-red-400" />
                </div>
                <div>
                  <p className="text-base font-black text-[var(--text-primary)] leading-tight">Modo Foco</p>
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Pomodoro</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowSettings(v => !v); setShowLibrary(false) }}
                  className={cn(
                    'p-2.5 rounded-xl transition-all',
                    showSettings
                      ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                  )}
                >
                  <Settings2 size={17} />
                </button>
                <button
                  onClick={close}
                  className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Settings accordion */}
            <AnimatePresence>
              {showSettings && (
                <SettingsPanel
                  settings={settings}
                  onUpdate={updateSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </AnimatePresence>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:none]">

              {/* Image Carousel */}
              <div className="relative w-full h-44 bg-black overflow-hidden shrink-0">
                <AnimatePresence mode="sync">
                  {currentImage ? (
                    <motion.img
                      key={currentImage.id}
                      src={currentImage.url}
                      alt=""
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.4, ease: 'easeInOut' }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                      style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1010 50%, #0D0D0D 100%)' }}
                    >
                      <ImageIcon size={28} className="text-white/10" />
                      <p className="text-[9px] font-bold text-white/15 uppercase tracking-[0.2em] text-center px-8 leading-relaxed">
                        Adicione imagens para criar sua biblioteca de foco
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

                {/* Carousel nav dots */}
                {images.length > 1 && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                    {images.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 rounded-full transition-all duration-300',
                          i === safeCarouselIndex ? 'bg-white/80 w-4' : 'bg-white/25 w-1'
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Carousel arrow buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIndex((safeCarouselIndex - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
                    >
                      <ChevronDown size={14} className="rotate-90" />
                    </button>
                    <button
                      onClick={() => setCarouselIndex((safeCarouselIndex + 1) % images.length)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
                    >
                      <ChevronDown size={14} className="-rotate-90" />
                    </button>
                  </>
                )}

                {/* Upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 text-white/50 hover:text-white hover:bg-black/70 transition-all"
                >
                  {uploading ? (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 -rotate-90">
                      <circle cx={8} cy={8} r={6} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                      <circle
                        cx={8} cy={8} r={6}
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeDasharray={`${(uploadProgress / 100) * 37.7} 37.7`}
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <Upload size={13} />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Motivational message */}
              <div className="min-h-[36px] flex items-center justify-center px-6">
                <AnimatePresence mode="wait">
                  {showMotivation && (
                    <motion.p
                      key={motivationIndex}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-[11px] font-medium text-[var(--text-muted)] text-center italic leading-relaxed"
                    >
                      "{MOTIVATIONAL_MESSAGES[motivationIndex % MOTIVATIONAL_MESSAGES.length]}"
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Timer area */}
              <div className="flex flex-col items-center gap-5 py-4 px-6">
                <CircleTimer phase={phase} secondsLeft={secondsLeft} totalSeconds={totalSeconds} />

                {/* Cycle progress */}
                <div className="flex flex-col items-center gap-2">
                  <CycleDots count={cycleCount} max={settings.cyclesBeforeLong} />
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {cycleCount % settings.cyclesBeforeLong === 0 && cycleCount > 0
                      ? 'Descanso longo — você merece'
                      : cyclesUntilLong === 1
                      ? '1 ciclo para o descanso longo'
                      : `${cyclesUntilLong} ciclos para o descanso longo`}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-5">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={reset}
                    className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <RotateCcw size={17} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.91 }}
                    onClick={startStop}
                    className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center shadow-2xl transition-colors"
                    style={{ backgroundColor: PHASE_COLORS[phase] }}
                  >
                    {isRunning
                      ? <Pause size={26} fill="white" className="text-white" />
                      : <Play size={26} fill="white" className="text-white ml-1" />}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={skipPhase}
                    className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <SkipForward size={17} />
                  </motion.button>
                </div>
              </div>

              {/* Image Library */}
              <div className="border-t border-[var(--border-subtle)] mt-2">
                <button
                  onClick={() => { setShowLibrary(v => !v); setShowSettings(false) }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-overlay)] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Biblioteca de Foco
                    </span>
                    {images.length > 0 && (
                      <span className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-black text-[var(--text-muted)]">
                        {images.length}
                      </span>
                    )}
                  </div>
                  {showLibrary
                    ? <ChevronUp size={13} className="text-[var(--text-muted)]" />
                    : <ChevronDown size={13} className="text-[var(--text-muted)]" />}
                </button>

                <AnimatePresence>
                  {showLibrary && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-5 pb-8 space-y-3">
                        {images.length === 0 ? (
                          <div className="flex flex-col items-center gap-4 py-10">
                            <ImageIcon size={32} className="text-white/8" />
                            <p className="text-xs font-bold text-[var(--text-muted)] text-center">
                              Nenhuma imagem adicionada ainda
                            </p>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                            >
                              <Upload size={12} />
                              Adicionar Imagens
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {images.map((img, i) => (
                              <div
                                key={img.id}
                                className={cn(
                                  'relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all',
                                  i === safeCarouselIndex
                                    ? 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.35)]'
                                    : 'border-transparent hover:border-white/20'
                                )}
                                onClick={() => setCarouselIndex(i)}
                              >
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center">
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteImage(img) }}
                                    className="opacity-0 hover:opacity-100 p-1.5 rounded-lg bg-black/70 text-red-400 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
                            >
                              <Upload size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
