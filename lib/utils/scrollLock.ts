/**
 * Trava a rolagem da página enquanto há modal aberto.
 *
 * `body { overflow: hidden }` sozinho NÃO impede a página de rolar por baixo do modal no
 * Safari do iPhone. A técnica confiável é fixar o body (`position: fixed; top: -scrollY`)
 * e, ao destravar, restaurar o estilo e a posição de rolagem. Com contador, para vários
 * modais empilhados (ex.: seletor de emoji sobre um modal).
 *
 * Pura (recebe body e window): testável sem navegador.
 */
export interface ScrollLockBody {
  style: {
    position: string
    top: string
    left: string
    right: string
    width: string
    overflow: string
  }
}

export interface ScrollLockWindow {
  scrollY: number
  scrollTo: (x: number, y: number) => void
}

export function createScrollLock(getBody: () => ScrollLockBody, getWindow: () => ScrollLockWindow) {
  let locks = 0
  let savedY = 0
  let saved = { position: '', top: '', left: '', right: '', width: '', overflow: '' }

  return {
    lock() {
      if (locks === 0) {
        const body = getBody()
        const win = getWindow()
        savedY = win.scrollY
        saved = {
          position: body.style.position,
          top: body.style.top,
          left: body.style.left,
          right: body.style.right,
          width: body.style.width,
          overflow: body.style.overflow,
        }
        body.style.position = 'fixed'
        body.style.top = `-${savedY}px`
        body.style.left = '0'
        body.style.right = '0'
        body.style.width = '100%'
        body.style.overflow = 'hidden'
      }
      locks += 1
    },
    unlock() {
      if (locks === 0) return
      locks -= 1
      if (locks === 0) {
        const body = getBody()
        body.style.position = saved.position
        body.style.top = saved.top
        body.style.left = saved.left
        body.style.right = saved.right
        body.style.width = saved.width
        body.style.overflow = saved.overflow
        getWindow().scrollTo(0, savedY)
      }
    },
    /** Só para testes. */
    count: () => locks,
  }
}
