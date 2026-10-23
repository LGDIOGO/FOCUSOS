/**
 * Origem usada para o /mcp chamar o /api/v1 internamente. NUNCA vem do header
 * Host da requisição (controlável pelo chamador → SSRF + vazamento da API key).
 * Ordem: NEXT_PUBLIC_APP_URL, VERCEL_URL (definida pela Vercel), localhost.
 */
export function internalOrigin(env: Record<string, string | undefined> = process.env): string {
  const app = env.NEXT_PUBLIC_APP_URL?.trim()
  if (app && /^https?:\/\//.test(app)) return app.replace(/\/+$/, '')
  const vercel = env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  return 'http://localhost:3000'
}
