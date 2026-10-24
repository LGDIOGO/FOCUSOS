// Faz um elemento `fixed inset-0` acompanhar o viewport visual, para que o teclado
// virtual (iOS/Android) não cubra o rodapé/busca. Devolve a função de limpeza.
export function fitToVisualViewport(el: HTMLElement | null): () => void {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!el || !vv) return () => {}
  const fit = () => {
    const keyboardOpen = vv.height < window.innerHeight - 80
    el.style.top = keyboardOpen ? `${vv.offsetTop}px` : ''
    el.style.height = keyboardOpen ? `${vv.height}px` : ''
    el.style.bottom = keyboardOpen ? 'auto' : ''
  }
  vv.addEventListener('resize', fit)
  vv.addEventListener('scroll', fit)
  fit()
  return () => {
    vv.removeEventListener('resize', fit)
    vv.removeEventListener('scroll', fit)
    el.style.top = ''
    el.style.height = ''
    el.style.bottom = ''
  }
}
