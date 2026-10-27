/**
 * Converte qualquer erro de salvar em frase curta em português.
 * NUNCA repassa `err.message` cru (vaza detalhe técnico do Firebase e some no PWA).
 */
export const GENERIC_SAVE_ERROR = 'Não foi possível salvar agora. Tente novamente.'

const MSG_OFFLINE = 'Sem conexão. Confira a internet e tente de novo.'
const MSG_SESSION = 'Sua sessão expirou. Entre de novo.'
const MSG_DENIED = 'Você não tem permissão para fazer isso. Entre de novo e tente outra vez.'
const MSG_QUOTA = 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'
const MSG_TIMEOUT = 'A operação demorou demais. Tente de novo.'

function extractCode(err: unknown): string {
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string') return code.toLowerCase()
  }
  return ''
}

export function friendlySaveError(err: unknown, contexto?: string): string {
  const code = extractCode(err)
  let base = GENERIC_SAVE_ERROR

  if (code) {
    if (code.indexOf('permission-denied') !== -1) base = MSG_DENIED
    else if (code.indexOf('unauthenticated') !== -1 || code.indexOf('requires-recent-login') !== -1 || code.indexOf('user-token-expired') !== -1) base = MSG_SESSION
    else if (code.indexOf('unavailable') !== -1 || code.indexOf('network') !== -1) base = MSG_OFFLINE
    else if (code.indexOf('resource-exhausted') !== -1 || code.indexOf('too-many-requests') !== -1) base = MSG_QUOTA
    else if (code.indexOf('deadline-exceeded') !== -1 || code.indexOf('timeout') !== -1) base = MSG_TIMEOUT
  } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    base = MSG_OFFLINE
  }

  // contexto só entra em texto genérico controlado por nós, nunca de err.message
  if (contexto && base === GENERIC_SAVE_ERROR) {
    return 'Não foi possível ' + contexto + ' agora. Tente novamente.'
  }
  return base
}
