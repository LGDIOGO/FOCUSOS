/**
 * Valida CPF (Cadastro de Pessoa Física) brasileiro
 * @param cpf String contendo apenas números ou formatado
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]+/g, '')
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false

  const cpfArray = cleanCPF.split('').map(el => +el)
  
  const rest = (count: number) => {
    return (
      ((cpfArray
        .slice(0, count - 12)
        .reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11) % 10
    )
  }

  return rest(10) === cpfArray[9] && rest(11) === cpfArray[10]
}

/**
 * Verifica se o trial de 30 dias expirou
 * @param trialStartedAt ISO string da data de início
 */
export function isTrialExpired(trialStartedAt?: string | null): boolean {
  if (!trialStartedAt) return false // No date means they haven't started or are old; don't block yet.
  const startDate = new Date(trialStartedAt)
  const currentDate = new Date()
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 90 // Buffer safety (30 + 60 grace)
}

/**
 * Verifica se o período de carência (ex: 2 dias) passou
 * @param startDate ISO string da data de início
 * @param graceDays Número de dias de carência
 */
export function isGracePeriodOver(startDate?: string | null, graceDays: number = 2): boolean {
  if (!startDate) return false // No date = don't block. Wait for data to be set.
  const start = new Date(startDate)
  const current = new Date()
  const diffTime = current.getTime() - start.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays >= graceDays
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '')
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
