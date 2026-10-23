import { authWithFirebaseToken } from '@/app/api/v1/_auth'
import { checkRateLimit } from './rateLimit'

export const AI_MAX_BODY_BYTES = 32 * 1024
export const AI_RATE_LIMIT = 20
export const AI_RATE_WINDOW_MS = 60_000

export type GuardResult =
  | { ok: true; uid: string; body: any }
  | { ok: false; response: Response }

/**
 * Porta de entrada das rotas de IA: token Firebase válido (401), corpo até 32 KB
 * (413) e rate limit por uid (429). Devolve o corpo JSON já lido.
 */
export async function guardAiRequest(req: Request, scope: string): Promise<GuardResult> {
  const uid = await authWithFirebaseToken(req)
  if (!uid) {
    return { ok: false, response: Response.json({ error: 'Não autenticado' }, { status: 401 }) }
  }

  const rl = checkRateLimit(`${scope}:${uid}`, AI_RATE_LIMIT, AI_RATE_WINDOW_MS)
  if (!rl.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      ),
    }
  }

  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > AI_MAX_BODY_BYTES) {
    return { ok: false, response: Response.json({ error: 'Requisição grande demais' }, { status: 413 }) }
  }

  let body: any
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    return { ok: false, response: Response.json({ error: 'JSON inválido' }, { status: 400 }) }
  }
  return { ok: true, uid, body }
}
