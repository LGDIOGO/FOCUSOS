import type { Metadata } from 'next'
import { LegalShell, CONTACT_PLACEHOLDER } from '@/components/legal/LegalShell'

export const metadata: Metadata = { title: 'Política de Privacidade | FocusOS' }

const h2 = 'text-xl font-black text-white pt-2'

export default function PrivacidadePage() {
  return (
    <LegalShell title="Política de Privacidade">
      <p>
        Este texto descreve, de forma simples, como o FocusOS trata seus dados pessoais, em linha com a
        Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). É um rascunho e ainda será revisado juridicamente.
      </p>

      <h2 className={h2}>1. Dados que coletamos</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Cadastro: nome, e-mail e CPF.</li>
        <li>
          Conteúdo que você cria no app: hábitos, tarefas, eventos, metas, anotações e anexos do módulo Trabalho,
          finanças, reservas, livros e estudos, categorias, notificações e configurações.
        </li>
        <li>Chaves de API que você gerar (guardamos apenas um hash e uma prévia, nunca a chave completa).</li>
        <li>
          Se você conectar o Google Agenda: o e-mail da conta Google e um token de renovação para sincronizar seus eventos.
        </li>
        <li>Dados de assinatura e pagamento (plano, validade, identificador do pagamento). Não guardamos número de cartão.</li>
      </ul>

      <h2 className={h2}>2. Para que usamos</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Prestar o serviço: autenticar você, guardar e mostrar seus dados.</li>
        <li>Recursos de IA que você acionar: o texto enviado ao recurso é processado para gerar a resposta.</li>
        <li>Cobrança e controle do plano e do período de teste.</li>
        <li>Segurança e prevenção a abuso (por exemplo, limites de requisições).</li>
      </ul>

      <h2 className={h2}>3. Com quem compartilhamos (subprocessadores)</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Firebase / Google (autenticação, banco de dados e armazenamento de arquivos).</li>
        <li>Vercel (hospedagem do aplicativo).</li>
        <li>Groq e Google AI (apenas ao usar recursos de IA; o conteúdo que você envia a esses recursos é processado por eles).</li>
        <li>Mercado Pago (processamento de pagamentos).</li>
        <li>Google Agenda (somente se você conectar a integração).</li>
      </ul>
      <p>Não vendemos seus dados.</p>

      <h2 className={h2}>4. Seus direitos</h2>
      <p>Pela LGPD (art. 18) você pode, entre outros:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Acessar e exportar seus dados: Configurações, aba Sistema, botão &quot;Exportar meus dados&quot; (arquivo JSON).</li>
        <li>
          Excluir sua conta e seus dados: Configurações, aba Sistema, botão &quot;Apagar minha conta&quot;. A exclusão é
          definitiva e não pode ser desfeita.
        </li>
        <li>Corrigir dados diretamente no app, ou pedir ajuda pelo contato abaixo.</li>
      </ul>
      <p>
        Algumas informações de pagamento podem ser mantidas pelo Mercado Pago e por nós pelo prazo exigido em lei.
      </p>

      <h2 className={h2}>5. Segurança e retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta existir. Ao apagar a conta, removemos os dados do app; cópias em
        provedores podem levar algum tempo para sair de seus sistemas.
      </p>

      <h2 className={h2}>6. Contato</h2>
      <p>Dúvidas e pedidos sobre seus dados: {CONTACT_PLACEHOLDER}</p>
    </LegalShell>
  )
}
