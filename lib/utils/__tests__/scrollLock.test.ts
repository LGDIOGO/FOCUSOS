import { describe, it, expect } from 'vitest'
import { createScrollLock, type ScrollLockBody, type ScrollLockWindow } from '../scrollLock'

function setup(initialY = 0) {
  const body: ScrollLockBody = { style: { position: '', top: '', left: '', right: '', width: '', overflow: '' } }
  const calls: Array<[number, number]> = []
  const win: ScrollLockWindow = { scrollY: initialY, scrollTo: (x, y) => { calls.push([x, y]) } }
  const lock = createScrollLock(() => body, () => win)
  return { body, win, calls, lock }
}

describe('createScrollLock', () => {
  it('REGRESSÃO: trava com position:fixed e guarda a posição de rolagem (overflow:hidden sozinho não segura no Safari iOS)', () => {
    const { body, lock } = setup(480)
    lock.lock()
    expect(body.style.position).toBe('fixed')
    expect(body.style.top).toBe('-480px')
    expect(body.style.width).toBe('100%')
    expect(body.style.overflow).toBe('hidden')
  })

  it('ao destravar restaura os estilos anteriores e volta para a mesma posição de rolagem', () => {
    const { body, calls, lock } = setup(480)
    body.style.overflow = 'auto'
    lock.lock()
    lock.unlock()
    expect(body.style.position).toBe('')
    expect(body.style.top).toBe('')
    expect(body.style.overflow).toBe('auto')
    expect(calls).toEqual([[0, 480]])
  })

  it('modais empilhados: só destrava quando o último fecha', () => {
    const { body, calls, lock } = setup(100)
    lock.lock()
    lock.lock()
    lock.unlock()
    expect(body.style.position).toBe('fixed')
    expect(calls).toEqual([])
    lock.unlock()
    expect(body.style.position).toBe('')
    expect(calls).toEqual([[0, 100]])
  })

  it('o segundo lock não regrava a posição (já com a página fixa, scrollY seria 0)', () => {
    const { win, body, lock } = setup(300)
    lock.lock()
    win.scrollY = 0 // com o body fixo, o navegador reporta 0
    lock.lock()
    expect(body.style.top).toBe('-300px')
  })

  it('unlock sem lock não faz nada nem deixa o contador negativo', () => {
    const { calls, lock } = setup(50)
    lock.unlock()
    lock.unlock()
    expect(lock.count()).toBe(0)
    expect(calls).toEqual([])
    lock.lock()
    expect(lock.count()).toBe(1)
  })
})
