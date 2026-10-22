import { authWithFirebaseToken } from '@/app/api/v1/_auth'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { exportUserData, deleteUserData, type AdminLike } from '@/lib/server/userData'

export const EXPORT_RATE_LIMIT = 5
export const DELETE_RATE_LIMIT = 3
export const ACCOUNT_RATE_WINDOW_MS = 10 * 60_000
export const DELETE_CONFIRM_WORD = 'APAGAR'

function limited(retryAfterSec: number) {
  return Response.json(
    { error: 'Muitas requisições. Tente novamente em instantes.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )
}

export async function handleExport(req: Request, admin: AdminLike): Promise<Response> {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const rl = checkRateLimit(`account-export:${uid}`, EXPORT_RATE_LIMIT, ACCOUNT_RATE_WINDOW_MS)
  if (!rl.ok) return limited(rl.retryAfterSec)

  try {
    const result = await exportUserData(admin, uid)
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="focusos-meus-dados.json"',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return Response.json({ error: 'Não foi possível exportar os dados.' }, { status: 500 })
  }
}

export async function handleDelete(req: Request, admin: AdminLike): Promise<Response> {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const rl = checkRateLimit(`account-delete:${uid}`, DELETE_RATE_LIMIT, ACCOUNT_RATE_WINDOW_MS)
  if (!rl.ok) return limited(rl.retryAfterSec)

  let body: any = null
  try {
    body = await req.json()
  } catch {}
  if (!body || body.confirm !== DELETE_CONFIRM_WORD) {
    return Response.json({ error: 'Confirmação inválida. Envie {"confirm":"APAGAR"}.' }, { status: 400 })
  }

  try {
    const result = await deleteUserData(admin, uid)
    if (!result.ok) {
      console.error('[account/delete] falha parcial', uid, result.failures)
      return Response.json(
        { error: 'A exclusão não foi concluída e sua conta continua ativa. Tente novamente.' },
        { status: 500 },
      )
    }
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Não foi possível apagar a conta.' }, { status: 500 })
  }
}
