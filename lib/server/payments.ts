import { createHmac, timingSafeEqual } from 'crypto'

export type PlanName = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'

/** Dias de acesso por plano. Preço NÃO fica aqui: vem do ambiente (PLAN_PRICE_*). */
export const PLAN_DAYS: Record<PlanName, number> = {
  Mensal: 30,
  Trimestral: 90,
  Semestral: 180,
  Anual: 365,
}

export function isPlanName(v: unknown): v is PlanName {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLAN_DAYS, v)
}

/** Preço em BRL do plano (env PLAN_PRICE_MENSAL etc.). null = não configurado → checkout recusa. */
export function getPlanPrice(plan: PlanName, env: Record<string, string | undefined> = process.env): number | null {
  const raw = env[`PLAN_PRICE_${plan.toUpperCase()}`]
  if (!raw) return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

/** external_reference = "<uid>:<plano>" */
export function buildReference(uid: string, plan: PlanName): string {
  return `${uid}:${plan}`
}

export function parseReference(ref: unknown): { uid: string; plan: PlanName } | null {
  if (typeof ref !== 'string') return null
  const i = ref.lastIndexOf(':')
  if (i <= 0) return null
  const uid = ref.slice(0, i)
  const plan = ref.slice(i + 1)
  if (!isPlanName(plan)) return null
  return { uid, plan }
}

/**
 * Valida o header x-signature do Mercado Pago:
 * manifest = `id:<data.id minúsculo>;request-id:<x-request-id>;ts:<ts>;`, HMAC-SHA256 com o segredo.
 * Rejeita assinatura ausente/malformada e timestamps fora da tolerância.
 */
export function verifyMpSignature(opts: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
  secret: string
  now?: number
  toleranceMs?: number
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts
  if (!xSignature || !xRequestId || !dataId || !secret) return false

  let ts = ''
  let v1 = ''
  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim())
    if (k === 'ts') ts = v || ''
    if (k === 'v1') v1 = v || ''
  }
  if (!ts || !v1) return false

  const now = opts.now ?? Date.now()
  const tolerance = opts.toleranceMs ?? 10 * 60 * 1000
  const tsMs = Number(ts)
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > tolerance) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(v1, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export type PaymentDecision =
  | { ok: true; uid: string; plan: PlanName; days: number }
  | { ok: false; reason: string }

/** Decide se um pagamento do MP libera o plano: aprovado, BRL, valor igual ao da tabela do servidor. */
export function evaluatePayment(
  payment: { status?: string | null; external_reference?: unknown; transaction_amount?: unknown; currency_id?: string | null },
  env: Record<string, string | undefined> = process.env,
): PaymentDecision {
  if (payment.status !== 'approved') return { ok: false, reason: 'not_approved' }
  const ref = parseReference(payment.external_reference)
  if (!ref) return { ok: false, reason: 'bad_reference' }
  const price = getPlanPrice(ref.plan, env)
  if (price === null) return { ok: false, reason: 'price_not_configured' }
  if (payment.currency_id !== 'BRL') return { ok: false, reason: 'bad_currency' }
  const paid = Number(payment.transaction_amount)
  if (!Number.isFinite(paid) || Math.round(paid * 100) !== Math.round(price * 100)) {
    return { ok: false, reason: 'amount_mismatch' }
  }
  return { ok: true, uid: ref.uid, plan: ref.plan, days: PLAN_DAYS[ref.plan] }
}
