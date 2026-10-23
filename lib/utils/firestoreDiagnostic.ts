export type ProbeResult = 'ok' | 'permission_denied' | 'error'

/**
 * Interpreta o resultado da leitura de teste feita pelo FirestoreDiagnostic.
 *
 * Coleção vazia NÃO é problema: toda conta nova começa sem hábitos. Antes, esse
 * caso virava o aviso "Nenhum dado encontrado" para qualquer usuário novo.
 * Só erro de leitura (regras ou rede) merece aviso.
 */
export function diagnoseProbe(probe: { empty?: boolean; error?: unknown }): ProbeResult {
  if (probe.error === undefined) return 'ok'

  const e = probe.error as { code?: string; message?: string } | string
  const text = (typeof e === 'string' ? e : e?.code || e?.message || '').toLowerCase()
  return text.includes('permission') ? 'permission_denied' : 'error'
}
