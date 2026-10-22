import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, CONTACT_PLACEHOLDER } from '@/components/legal/LegalShell'

export const metadata: Metadata = { title: 'Termos de Uso | FocusOS' }

const h2 = 'text-xl font-black text-white pt-2'

export default function TermosPage() {
  return (
    <LegalShell title="Termos de Uso">
      <p>
        Estes termos regem o uso do FocusOS, aplicativo de produtividade (hábitos, tarefas, agenda, metas, finanças e
        trabalho). É um rascunho e ainda será revisado juridicamente.
      </p>

      <h2 className={h2}>1. Conta</h2>
      <p>
        Você é responsável pelas informações do cadastro e por manter sua senha em segurança. Você pode apagar sua conta
        a qualquer momento nas Configurações.
      </p>

      <h2 className={h2}>2. Uso aceitável</h2>
      <p>
        Não use o serviço para atividades ilegais, para tentar acessar dados de outras pessoas ou para sobrecarregar a
        infraestrutura. Podemos limitar ou suspender contas que violem estas regras.
      </p>

      <h2 className={h2}>3. Planos e pagamento</h2>
      <p>
        O FocusOS oferece um período de teste e planos pagos processados pelo Mercado Pago. Valores, prazos e condições
        de cancelamento serão detalhados antes da contratação.
      </p>

      <h2 className={h2}>4. Recursos de IA</h2>
      <p>
        Respostas geradas por IA podem conter erros e não substituem aconselhamento profissional (financeiro, jurídico ou
        de saúde). O conteúdo enviado a esses recursos é processado por Groq e Google AI.
      </p>

      <h2 className={h2}>5. Disponibilidade e responsabilidade</h2>
      <p>
        O serviço é oferecido no estado em que se encontra. Fazemos esforço razoável para mantê-lo disponível e seus dados
        seguros, mas não garantimos funcionamento ininterrupto. Recomendamos exportar seus dados periodicamente.
      </p>

      <h2 className={h2}>6. Privacidade</h2>
      <p>
        O tratamento de dados pessoais está descrito na <Link href="/privacidade" className="underline text-white">Política de Privacidade</Link>.
      </p>

      <h2 className={h2}>7. Contato</h2>
      <p>{CONTACT_PLACEHOLDER}</p>
    </LegalShell>
  )
}
