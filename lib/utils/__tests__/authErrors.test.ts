import { describe, it, expect } from 'vitest'
import { friendlyAuthError } from '../authErrors'

describe('friendlyAuthError', () => {
  it('REGRESSÃO: auth/invalid-credential (erro atual do Firebase para senha errada) vira mensagem em português, não "Erro de acesso (auth/...)"', () => {
    const msg = friendlyAuthError({ code: 'auth/invalid-credential', message: 'Firebase: Error (auth/invalid-credential).' })
    expect(msg).toBe('E-mail ou senha incorretos. Confira os dados ou crie uma conta.')
    expect(msg).not.toMatch(/auth\//)
  })

  it('códigos antigos de senha errada e usuário inexistente dão a mesma mensagem', () => {
    const a = friendlyAuthError({ code: 'auth/wrong-password' })
    const b = friendlyAuthError({ code: 'auth/user-not-found' })
    expect(a).toBe(b)
  })

  it('REGRESSÃO: fechar a janela do Google não mostra erro', () => {
    expect(friendlyAuthError({ code: 'auth/popup-closed-by-user' })).toBe('')
    expect(friendlyAuthError({ code: 'auth/cancelled-popup-request' })).toBe('')
  })

  it('popup bloqueado e ambiente sem suporte orientam o usuário', () => {
    expect(friendlyAuthError({ code: 'auth/popup-blocked' })).toMatch(/pop-ups|e-mail e senha/)
    expect(friendlyAuthError({ code: 'auth/operation-not-supported-in-this-environment' })).toMatch(/Safari\/Chrome/)
  })

  it('rede, excesso de tentativas e senha fraca', () => {
    expect(friendlyAuthError({ code: 'auth/network-request-failed' })).toMatch(/conexão/)
    expect(friendlyAuthError({ code: 'auth/too-many-requests' })).toMatch(/Muitas tentativas/)
    expect(friendlyAuthError({ code: 'auth/weak-password' })).toMatch(/6 caracteres/)
  })

  it('nunca devolve o texto bruto do SDK (inglês/técnico) em erro desconhecido', () => {
    const msg = friendlyAuthError({ code: 'auth/qualquer-coisa', message: 'Firebase: Some internal text with key AIza123' })
    expect(msg).toBe('Não foi possível concluir agora. Tente novamente.')
    expect(msg).not.toMatch(/Firebase|AIza/)
  })

  it('chave de API inválida não vaza instrução de .env para o usuário', () => {
    const msg = friendlyAuthError({ message: 'Firebase: Error (auth/invalid-api-key). API key not valid' })
    expect(msg).not.toMatch(/\.env/)
  })

  it('entrada que não é erro cai na mensagem genérica', () => {
    expect(friendlyAuthError(null)).toBe('Não foi possível concluir agora. Tente novamente.')
    expect(friendlyAuthError('texto')).toBe('Não foi possível concluir agora. Tente novamente.')
  })
})
