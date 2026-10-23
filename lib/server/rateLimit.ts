/**
 * Rate limit em memória (janela deslizante simples). Em serverless cada
 * instância tem seu próprio contador, então é um freio contra abuso casual, não
 * um limite global exato. Para limite global use um store compartilhado.
 */
const buckets = new Map<string, number[]>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) }
  }
  recent.push(now)
  buckets.set(key, recent)
  // Limpeza oportunista para não crescer sem limite.
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => {
      if (v.length === 0 || now - v[v.length - 1] >= windowMs) buckets.delete(k)
    })
  }
  return { ok: true, retryAfterSec: 0 }
}

export function resetRateLimits() {
  buckets.clear()
}
