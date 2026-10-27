/**
 * Copia texto para a área de transferência sem nunca lançar.
 * 'copied' = copiou; 'manual' = não deu: a UI deve mostrar o texto selecionável.
 * Dependências injetáveis para testar sem navegador.
 */
export interface CopyTextDeps {
  clipboard?: { writeText: (text: string) => Promise<void> } | null
  /** Executa o fallback legado (textarea + execCommand). Devolve true se copiou. */
  execCopy?: (text: string) => boolean
}

function defaultExecCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.readOnly = true
  ta.setAttribute('aria-hidden', 'true')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '-9999px'
  ta.style.fontSize = '16px' // evita zoom automático no iOS
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  let ok = false
  try {
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    try { document.body.removeChild(ta) } catch { /* já removida */ }
  }
  return ok
}

export async function copyText(text: string, deps?: CopyTextDeps): Promise<'copied' | 'manual'> {
  const clipboard = deps && 'clipboard' in deps
    ? deps.clipboard
    : (typeof navigator !== 'undefined' ? navigator.clipboard : null)
  const execCopy = (deps && deps.execCopy) || defaultExecCopy

  try {
    if (clipboard && typeof clipboard.writeText === 'function') {
      await clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    // HTTPS/permissão/iOS: segue para o fallback
  }
  try {
    if (execCopy(text)) return 'copied'
  } catch {
    // sem suporte
  }
  return 'manual'
}
