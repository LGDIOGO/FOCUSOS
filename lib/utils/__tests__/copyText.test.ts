import { describe, it, expect } from 'vitest'
import { copyText } from '../copyText'

const rejecting = () => Promise.reject(new Error('NotAllowedError'))

describe('copyText', () => {
  it('REGRESSÃO: clipboard ok devolve copied sem usar o fallback', async () => {
    let fallback = 0
    const r = await copyText('abc', {
      clipboard: { writeText: () => Promise.resolve() },
      execCopy: () => { fallback++; return true },
    })
    expect(r).toBe('copied')
    expect(fallback).toBe(0)
  })

  it('REGRESSÃO: clipboard rejeita -> execCommand copia', async () => {
    const r = await copyText('abc', { clipboard: { writeText: rejecting }, execCopy: () => true })
    expect(r).toBe('copied')
  })

  it('REGRESSÃO: ambos falham -> manual', async () => {
    const r = await copyText('abc', { clipboard: { writeText: rejecting }, execCopy: () => false })
    expect(r).toBe('manual')
  })

  it('REGRESSÃO: clipboard ausente usa fallback; sem nada, manual', async () => {
    expect(await copyText('abc', { clipboard: undefined, execCopy: () => true })).toBe('copied')
    expect(await copyText('abc', { clipboard: null, execCopy: () => false })).toBe('manual')
  })

  it('REGRESSÃO: nunca lança (writeText síncrono que lança, execCopy que lança)', async () => {
    const r = await copyText('abc', {
      clipboard: { writeText: () => { throw new Error('boom') } },
      execCopy: () => { throw new Error('boom2') },
    })
    expect(r).toBe('manual')
  })
})
