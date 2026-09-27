import type { RecurrenceRule } from '@/types'

/**
 * Conversão de recorrência e alocação de horários para o Google Agenda.
 *
 * Duas coisas moram aqui porque só fazem sentido juntas: a série precisa virar
 * UM evento recorrente no Google (não trinta cópias), e o que não tem horário
 * precisa ganhar um sem colidir com o que já está marcado.
 */

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/**
 * Traduz a regra interna para RRULE (RFC 5545). Mandar uma ocorrência por dia
 * encheria a agenda de eventos soltos e tornaria impossível editar a série
 * inteira do lado do Google.
 *
 * @param until último dia da série (yyyy-MM-dd), opcional
 */
export function toRRule(rule: RecurrenceRule | undefined | null, until?: string | null): string[] {
  if (!rule?.frequency) return []

  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1
  const parts: string[] = []

  switch (rule.frequency) {
    case 'daily':
      parts.push('FREQ=DAILY')
      break
    case 'weekly':
      parts.push('FREQ=WEEKLY')
      break
    case 'specific_days': {
      const days = (rule.days_of_week || [])
        .filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
        .map(d => BYDAY[d])
      if (!days.length) return []
      parts.push('FREQ=WEEKLY', `BYDAY=${days.join(',')}`)
      break
    }
    case 'monthly':
      parts.push('FREQ=MONTHLY')
      break
    case 'yearly':
      parts.push('FREQ=YEARLY')
      break
    default:
      return []
  }

  if (interval > 1) parts.push(`INTERVAL=${interval}`)

  if (until) {
    // UNTIL é inclusive e precisa ser UTC; 23:59:59 garante que o último dia entra.
    const compact = until.replace(/-/g, '')
    if (/^\d{8}$/.test(compact)) parts.push(`UNTIL=${compact}T235959Z`)
  }

  return [`RRULE:${parts.join(';')}`]
}

// ─── Alocação de horários ────────────────────────────────────────────────────

export interface Busy { startMin: number; endMin: number }

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h)) return NaN
  return h * 60 + (Number.isFinite(m) ? m : 0)
}

export const toHHMM = (mins: number): string => {
  const wrapped = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Janela varrida ao procurar espaço livre, e o passo entre tentativas. */
const DAY_START = 6 * 60   // 06:00
const DAY_END = 23 * 60    // 23:00
const STEP = 30            // meia hora: encaixa em vãos que a hora cheia perderia

const overlaps = (a: Busy, b: Busy) => a.startMin < b.endMin && b.startMin < a.endMin

/**
 * Dá horário ao que não tem, em blocos de uma hora, sem encostar no que já
 * está marcado nem nos blocos recém-atribuídos.
 *
 * Quando a janela do dia acaba, os que sobraram são enfileirados logo após o
 * último bloco — passam das 23h, mas continuam sem se sobrepor, que é a regra
 * que importa. Some-los seria pior do que mostrá-los tarde.
 *
 * @param fixed  intervalos já ocupados (itens com horário próprio)
 * @param count  quantos blocos alocar, na ordem em que devem aparecer
 */
export function allocateSlots(fixed: Busy[], count: number, durationMin = 60): string[] {
  if (count <= 0) return []

  const busy: Busy[] = [...fixed].sort((a, b) => a.startMin - b.startMin)
  const out: string[] = []

  let cursor = DAY_START
  for (let i = 0; i < count; i++) {
    let placed = false

    while (cursor + durationMin <= DAY_END) {
      const candidate: Busy = { startMin: cursor, endMin: cursor + durationMin }
      const clash = busy.find(b => overlaps(candidate, b))
      if (!clash) {
        out.push(toHHMM(cursor))
        busy.push(candidate)
        busy.sort((a, b) => a.startMin - b.startMin)
        cursor += durationMin
        placed = true
        break
      }
      // Pula direto para o fim do conflito em vez de avançar de STEP em STEP.
      cursor = Math.max(cursor + STEP, clash.endMin)
    }

    if (!placed) {
      // Janela esgotada: empilha em sequência a partir do fim de tudo.
      const last = busy.length ? Math.max(...busy.map(b => b.endMin)) : DAY_END
      const start = Math.max(last, DAY_END)
      out.push(toHHMM(start))
      busy.push({ startMin: start, endMin: start + durationMin })
      cursor = start + durationMin
    }
  }

  return out
}

/** Intervalo ocupado por um item que já tem horário. */
export function busyFrom(time: string | undefined, durationMin = 60): Busy | null {
  if (!time) return null
  const start = toMinutes(time)
  if (!Number.isFinite(start)) return null
  return { startMin: start, endMin: start + (durationMin > 0 ? durationMin : 60) }
}
