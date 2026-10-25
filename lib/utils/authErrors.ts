/**
 * Traduz códigos de erro do Firebase Auth em mensagens curtas em português.
 * Nunca devolve o texto bruto do SDK (inglês, técnico, às vezes com chaves/URLs).
 * Pura: sem Firebase nem React, para ser testável.
 */
export function friendlyAuthError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : ''
  const message = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''

  if (message.includes('API key')) return 'Erro de configuração do app. Tente novamente em instantes.'

  switch (code) {
    // O Firebase atual devolve invalid-credential para e-mail inexistente E senha errada
    // (de propósito, para não revelar quais e-mails existem).
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Confira os dados ou crie uma conta.'
    case 'auth/invalid-email':
      return 'Esse e-mail não parece válido. Confira e tente de novo.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos ou redefina a senha.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Confira a internet e tente de novo.'
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail. Use "Entrar".'
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.'
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site ou use e-mail e senha.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '' // o usuário só fechou a janela: não é erro para mostrar
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/web-storage-unsupported':
      return 'Este navegador não permite o login com Google aqui. Use e-mail e senha, ou abra no Safari/Chrome.'
    case 'auth/unauthorized-domain':
      return 'Este endereço não está autorizado para login com Google.'
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com esse e-mail usando outro método de login.'
    default:
      return 'Não foi possível entrar agora. Tente novamente.'
  }
}
