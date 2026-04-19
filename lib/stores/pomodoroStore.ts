import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break'

export interface PomodoroSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  cyclesBeforeLong: number
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLong: 4,
}

export const PHASE_COLORS: Record<PomodoroPhase, string> = {
  focus: '#FF453A',
  short_break: '#34C759',
  long_break: '#007AFF',
}

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: 'Foco',
  short_break: 'Descanso Curto',
  long_break: 'Descanso Longo',
}

export const MOTIVATIONAL_MESSAGES: string[] = [
  "A dopamina não premia o resultado — ela premia a antecipação do esforço.",
  "Cada ciclo recalibra seu sistema de recompensa para valorizar o processo.",
  "Resistir à distração não é força de vontade — é neuroplasticidade em ação.",
  "O flow começa quando a dificuldade supera levemente sua zona de conforto.",
  "Você não precisa querer trabalhar. Você só precisa ter começado.",
  "Sistemas vencem motivação toda vez. A disciplina é ilusão — o ambiente é tudo.",
  "Cada ciclo completo prova: você é quem termina o que começa.",
  "Distração libera dopamina rápida. Foco profundo constrói dopamina duradoura.",
  "Descanso não é fraqueza. É quando o córtex pré-frontal consolida o aprendizado.",
  "Alto desempenho não é intensidade constante — é recuperação estratégica.",
  "Procrastinar é o custo de temer o início, não o trabalho. O timer elimina a escolha.",
  "Sua vontade é um recurso finito. Use-a para iniciar, não para manter.",
  "Hábitos são votações repetidas sobre quem você está se tornando.",
  "O desconforto que sente agora é literalmente sinapses se reconectando.",
  "Cada minuto de foco profundo vale quatro de trabalho fragmentado.",
  "Atenção é seu ativo mais escasso — e o mais facilmente roubado.",
  "O obstáculo não está no trabalho. Está no espaço entre intenção e ação.",
  "O cérebro não diferencia trabalho real de profundo — só você pode escolher.",
  "Quem controla o início controla o resultado.",
  "Emoções passam. O trabalho permanece.",
  "O que você pratica, você se torna — mesmo que seja apenas atenção.",
  "Não pense no que vai produzir. Pense apenas nos próximos minutos.",
  "Saia da tela. Deixe o cérebro consolidar o que acabou de aprender.",
  "Mova o corpo. Mude o estado. Volte com clareza.",
  "Esse intervalo não é recompensa — é preparação para o próximo ciclo.",
  "Você não é tão ocupado quanto pensa. É tão distraído quanto permite.",
  "A disciplina de longo prazo começa com pequenas vitórias repetidas hoje.",
  "Feito supera perfeito — mas foco profundo supera feito.",
  "Seu cérebro daqui a 66 dias será diferente pelas escolhas de hoje.",
  "Modo foco não é sobre velocidade. É sobre profundidade irreplicável.",
]

export function phaseDurationSeconds(phase: PomodoroPhase, s: PomodoroSettings): number {
  if (phase === 'focus') return s.focusDuration * 60
  if (phase === 'short_break') return s.shortBreakDuration * 60
  return s.longBreakDuration * 60
}

function resolveNext(
  phase: PomodoroPhase,
  cycleCount: number,
  settings: PomodoroSettings
): { phase: PomodoroPhase; cycleCount: number } {
  if (phase === 'focus') {
    const newCount = cycleCount + 1
    return {
      phase: newCount % settings.cyclesBeforeLong === 0 ? 'long_break' : 'short_break',
      cycleCount: newCount,
    }
  }
  return { phase: 'focus', cycleCount }
}

interface PomodoroStore {
  isOpen: boolean
  isRunning: boolean
  phase: PomodoroPhase
  secondsLeft: number
  cycleCount: number
  settings: PomodoroSettings
  motivationIndex: number
  showMotivation: boolean
  carouselIndex: number

  toggle: () => void
  open: () => void
  close: () => void
  startStop: () => void
  reset: () => void
  tick: () => void
  skipPhase: () => void
  updateSettings: (s: Partial<PomodoroSettings>) => void
  setCarouselIndex: (i: number) => void
  hideMotivation: () => void
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isRunning: false,
      phase: 'focus',
      secondsLeft: DEFAULT_SETTINGS.focusDuration * 60,
      cycleCount: 0,
      settings: DEFAULT_SETTINGS,
      motivationIndex: 0,
      showMotivation: false,
      carouselIndex: 0,

      toggle: () => set(s => ({ isOpen: !s.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      startStop: () => set(s => ({ isRunning: !s.isRunning })),

      reset: () =>
        set(s => ({
          isRunning: false,
          secondsLeft: phaseDurationSeconds(s.phase, s.settings),
        })),

      tick: () => {
        const { secondsLeft, phase, cycleCount, settings, motivationIndex } = get()
        if (secondsLeft > 1) {
          set({ secondsLeft: secondsLeft - 1 })
        } else {
          const next = resolveNext(phase, cycleCount, settings)
          set({
            phase: next.phase,
            cycleCount: next.cycleCount,
            secondsLeft: phaseDurationSeconds(next.phase, settings),
            isRunning: false,
            showMotivation: true,
            motivationIndex: (motivationIndex + 1) % MOTIVATIONAL_MESSAGES.length,
          })
        }
      },

      skipPhase: () => {
        const { phase, cycleCount, settings, motivationIndex } = get()
        const next = resolveNext(phase, cycleCount, settings)
        set({
          phase: next.phase,
          cycleCount: next.cycleCount,
          secondsLeft: phaseDurationSeconds(next.phase, settings),
          isRunning: false,
          showMotivation: true,
          motivationIndex: (motivationIndex + 1) % MOTIVATIONAL_MESSAGES.length,
        })
      },

      updateSettings: s =>
        set(state => {
          const newSettings = { ...state.settings, ...s }
          return {
            settings: newSettings,
            secondsLeft: phaseDurationSeconds(state.phase, newSettings),
            isRunning: false,
          }
        }),

      setCarouselIndex: i => set({ carouselIndex: i }),
      hideMotivation: () => set({ showMotivation: false }),
    }),
    {
      name: 'focusos-pomodoro',
      partialize: s => ({
        settings: s.settings,
        cycleCount: s.cycleCount,
        motivationIndex: s.motivationIndex,
      }),
    }
  )
)
