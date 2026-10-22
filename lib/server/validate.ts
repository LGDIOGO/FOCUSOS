/** Validações puras de entrada das rotas de API (testáveis sem Firebase). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86400000

/** AAAA-MM-DD de um dia que existe no calendário (rejeita 2026-02-31). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false
  const t = Date.parse(v + 'T00:00:00Z')
  return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === v
}

/** Fuso IANA aceito pelo runtime (ex.: America/Sao_Paulo). */
export function isValidTimezone(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 64) return false
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(v)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return true
  } catch {
    return false
  }
}

/** Lista de strings curtas (ids). Exige array de verdade, no máximo `max` itens. */
export function isStringArray(v: unknown, max = 500): v is string[] {
  return Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.length > 0 && x.length <= 200)
}

/** Número finito vindo de JSON/query (rejeita NaN, Infinity, objeto, string vazia). */
export function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'string' && v.trim() === '') return null
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const MAX_RANGE_DAYS = 366

export type RangeResult = { ok: true; from: string; to: string; days: number } | { ok: false; error: string }

/**
 * Resolve o intervalo de /v1/performance. `from`/`to` opcionais (AAAA-MM-DD);
 * `days` só vale quando `from` falta. Intervalo máximo de 366 dias.
 */
export function resolveRange(
  fromRaw: string | null, toRaw: string | null, daysRaw: string | null, today: string,
): RangeResult {
  if (fromRaw != null && !isIsoDate(fromRaw)) return { ok: false, error: 'from must be YYYY-MM-DD' }
  if (toRaw != null && !isIsoDate(toRaw)) return { ok: false, error: 'to must be YYYY-MM-DD' }
  let days = 7
  if (daysRaw != null) {
    const n = toFiniteNumber(daysRaw)
    if (n === null || n < 1) return { ok: false, error: 'days must be a positive number' }
    days = Math.min(Math.floor(n), 90)
  }
  const to = toRaw ?? today
  const from = fromRaw ?? new Date(Date.parse(to + 'T00:00:00Z') - days * DAY_MS).toISOString().slice(0, 10)
  const span = Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS) + 1
  if (span < 1) return { ok: false, error: 'from must be before to' }
  if (span > MAX_RANGE_DAYS) return { ok: false, error: `range must be at most ${MAX_RANGE_DAYS} days` }
  return { ok: true, from, to, days: span }
}
