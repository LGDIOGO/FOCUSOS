import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import {
  buildReference, parseReference, getPlanPrice, evaluatePayment, verifyMpSignature, PLAN_DAYS,
} from '../payments'

const env = { PLAN_PRICE_MENSAL: '19,90', PLAN_PRICE_ANUAL: '199.00' }

function sign(secret: string, dataId: string, requestId: string, ts: number) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`
}

describe('referência do pagamento', () => {
  it('ida e volta', () => {
    expect(parseReference(buildReference('uid123', 'Mensal'))).toEqual({ uid: 'uid123', plan: 'Mensal' })
  })
  it('rejeita lixo, plano desconhecido e referência antiga (só uid)', () => {
    expect(parseReference('uid123')).toBeNull()
    expect(parseReference('uid123:Vitalicio')).toBeNull()
    expect(parseReference(':Mensal')).toBeNull()
    expect(parseReference(undefined)).toBeNull()
  })
})

describe('getPlanPrice', () => {
  it('lê do ambiente (vírgula ou ponto) e devolve null se não configurado', () => {
    expect(getPlanPrice('Mensal', env)).toBe(19.9)
    expect(getPlanPrice('Anual', env)).toBe(199)
    expect(getPlanPrice('Trimestral', env)).toBeNull()
    expect(getPlanPrice('Mensal', { PLAN_PRICE_MENSAL: '0' })).toBeNull()
    expect(getPlanPrice('Mensal', { PLAN_PRICE_MENSAL: 'abc' })).toBeNull()
  })
})

describe('evaluatePayment', () => {
  const ok = { status: 'approved', external_reference: 'u1:Mensal', transaction_amount: 19.9, currency_id: 'BRL' }

  it('aprova pagamento correto', () => {
    expect(evaluatePayment(ok, env)).toEqual({ ok: true, uid: 'u1', plan: 'Mensal', days: PLAN_DAYS.Mensal })
  })
  it('REGRESSÃO: pagar centavos por plano caro não libera', () => {
    expect(evaluatePayment({ ...ok, transaction_amount: 0.01 }, env)).toEqual({ ok: false, reason: 'amount_mismatch' })
  })
  it('REGRESSÃO: pagar o plano barato não libera o plano caro', () => {
    expect(evaluatePayment({ ...ok, external_reference: 'u1:Anual' }, env)).toEqual({ ok: false, reason: 'amount_mismatch' })
  })
  it('recusa moeda errada, status não aprovado, referência ruim e preço não configurado', () => {
    expect(evaluatePayment({ ...ok, currency_id: 'USD' }, env)).toMatchObject({ ok: false, reason: 'bad_currency' })
    expect(evaluatePayment({ ...ok, status: 'pending' }, env)).toMatchObject({ ok: false, reason: 'not_approved' })
    expect(evaluatePayment({ ...ok, external_reference: 'u1' }, env)).toMatchObject({ ok: false, reason: 'bad_reference' })
    expect(evaluatePayment(ok, {})).toMatchObject({ ok: false, reason: 'price_not_configured' })
  })
})

describe('verifyMpSignature', () => {
  const now = 1_700_000_000_000
  const base = { secret: 's3gredo', dataId: 'ABC123', xRequestId: 'req-1', now }

  it('aceita assinatura correta (data.id em minúsculo no manifest)', () => {
    expect(verifyMpSignature({ ...base, xSignature: sign('s3gredo', 'ABC123', 'req-1', now) })).toBe(true)
  })
  it('REGRESSÃO: recusa assinatura com segredo errado, ausente ou malformada', () => {
    expect(verifyMpSignature({ ...base, xSignature: sign('outro', 'ABC123', 'req-1', now) })).toBe(false)
    expect(verifyMpSignature({ ...base, xSignature: null })).toBe(false)
    expect(verifyMpSignature({ ...base, xSignature: 'lixo' })).toBe(false)
    expect(verifyMpSignature({ ...base, xSignature: `ts=${now}` })).toBe(false)
  })
  it('recusa se id ou request-id forem trocados', () => {
    const sig = sign('s3gredo', 'ABC123', 'req-1', now)
    expect(verifyMpSignature({ ...base, dataId: 'OUTRO', xSignature: sig })).toBe(false)
    expect(verifyMpSignature({ ...base, xRequestId: 'req-2', xSignature: sig })).toBe(false)
  })
  it('recusa timestamp velho (replay)', () => {
    const old = now - 60 * 60 * 1000
    expect(verifyMpSignature({ ...base, xSignature: sign('s3gredo', 'ABC123', 'req-1', old) })).toBe(false)
  })
  it('sem segredo configurado nunca valida', () => {
    expect(verifyMpSignature({ ...base, secret: '', xSignature: sign('', 'ABC123', 'req-1', now) })).toBe(false)
  })
})
