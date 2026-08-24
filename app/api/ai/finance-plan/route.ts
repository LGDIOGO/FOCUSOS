import { NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/models';

export async function POST(req: Request) {
  // Fora do try: o fallback no catch precisa dos números reais do usuário,
  // senão devolve o plano genérico de "cadastre sua renda" para quem já cadastrou.
  let income = 0, fixedCosts = 0, variableExpenses = 0;

  try {
    const body = await req.json();
    ({ income = 0, fixedCosts = 0, variableExpenses = 0 } = body);
    const { potes, futureTransactions } = body;

    const hasAnyKey = !!(
      process.env.GROQ_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim()
    );

    // If no key, return a useful static suggestion (not an error card)
    if (!hasAnyKey) {
      return NextResponse.json({
        plan: buildStaticPlan(income, fixedCosts, variableExpenses)
      });
    }

    const liquidBalance = (income || 0) - (fixedCosts || 0) - (variableExpenses || 0);
    const commitmentRate = income > 0 ? Math.round(((fixedCosts + variableExpenses) / income) * 100) : 0;
    const savingsRate = income > 0 ? Math.max(0, Math.round((liquidBalance / income) * 100)) : 0;

    const potesDescription = Array.isArray(potes) && potes.length > 0
      ? potes.map((p: any) => `${p.title} (${p.percent}%)`).join(', ')
      : 'Nenhum pote configurado ainda';

    const futureTxDescription = Array.isArray(futureTransactions) && futureTransactions.length > 0
      ? futureTransactions.slice(0, 5).map((t: any) => `${t.title} R$${t.amount} em ${t.date}`).join('; ')
      : 'Nenhuma transação futura registrada';

    const prompt = `Você é um conselheiro financeiro pessoal de elite, especialista em psicologia financeira e planejamento de longo prazo.

PERFIL FINANCEIRO DO USUÁRIO:
- Renda Mensal: R$ ${income ?? 0}
- Custos Fixos Mensais: R$ ${fixedCosts ?? 0}
- Gastos Variáveis Recentes: R$ ${variableExpenses ?? 0}
- Saldo Líquido Mensal: R$ ${liquidBalance}
- Taxa de Comprometimento: ${commitmentRate}%
- Taxa de Poupança Potencial: ${savingsRate}%
- Destinação por Potes: ${potesDescription}
- Transações Futuras Planejadas: ${futureTxDescription}

SUA TAREFA:
Gere um Master Plan financeiro REALISTA e PERSONALIZADO com exatamente 6 fases baseado no perfil acima.
Cada fase deve conter de 3 a 5 itens práticos e específicos para esta pessoa, não genéricos.
Foque em análise da vida financeira real, comportamental e de patrimônio.

As fases obrigatórias são:
1. "Imediato" - Diagnóstico e ações urgentes dos próximos 30 dias
2. "Próximos 3 Meses" - Consolidação e primeiras mudanças de hábito
3. "Próximos 6 Meses" - Construção de reservas e eliminação de vulnerabilidades
4. "Próximos 9 Meses" - Aceleração e otimização das destinações
5. "Próximo Ano" - Posicionamento patrimonial e objetivos maiores
6. "Visão 2-3 Anos" - Escala, investimentos e conquistas de longo prazo

REGRAS IMPORTANTES:
- Seja específico com os valores reais do usuário (use os R$ fornecidos)
- Identifique problemas reais (se comprometimento > 70%, aponte como urgência)
- Não repita itens entre fases
- Itens já claramente atingidos hoje podem ter "done": true
- Primeiro item da fase 1 deve ter "done": false pois é ação imediata
- NÃO inclua comentários, use APENAS JSON puro sem markdown

Retorne APENAS um JSON array com esta estrutura exata (sem \`\`\`json):
[
  {
    "phase": "Nome da Fase Premium",
    "period": "Período da fase",
    "items": [
      { "text": "Ação específica com valores reais do usuário", "done": false }
    ],
    "active": true
  }
]
Apenas a primeira fase tem "active": true. As demais têm "active": false.`;

    const { text } = await generateText({
      system: 'Você é um conselheiro financeiro de elite. Responda APENAS com JSON puro, sem markdown, sem comentários, sem texto antes ou depois do JSON.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      // Modelos de raciocínio consomem orçamento antes de escrever a resposta;
      // com 2000 o plano vinha cortado no meio e o JSON.parse quebrava.
      maxTokens: 6000,
      jsonMode: true,
    });

    let aiContent = text.trim() || '[]';

    // Strip any markdown code fences if the model adds them
    aiContent = aiContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsedPlan = JSON.parse(aiContent);

    // Handle object wrapper { "plan": [...] } or { "phases": [...] }
    if (parsedPlan && typeof parsedPlan === 'object' && !Array.isArray(parsedPlan)) {
      const firstKey = Object.keys(parsedPlan)[0];
      parsedPlan = Array.isArray(parsedPlan[firstKey]) ? parsedPlan[firstKey] : [parsedPlan];
    }

    return NextResponse.json({ plan: parsedPlan });

  } catch (error: any) {
    console.error('Error generating AI finance plan:', error);

    // On parse error or API error, return a static analytical plan instead of crashing
    return NextResponse.json({
      plan: buildStaticPlan(income, fixedCosts, variableExpenses),
      warning: error.message
    });
  }
}

function buildStaticPlan(income: number, fixedCosts: number, variableExpenses: number) {
  const liquid = Math.max(0, income - fixedCosts - variableExpenses);
  const commitment = income > 0 ? Math.round(((fixedCosts + variableExpenses) / income) * 100) : 0;

  return [
    {
      phase: "Diagnóstico Financeiro",
      period: "Imediato",
      active: true,
      items: [
        { text: income > 0 ? `Renda mensal de R$ ${income.toFixed(0)} mapeada` : "Cadastre sua renda mensal para começar", done: income > 0 },
        { text: fixedCosts > 0 ? `Custos fixos de R$ ${fixedCosts.toFixed(0)} identificados (${commitment}% da renda)` : "Adicione seus custos fixos (aluguel, assinaturas, etc.)", done: fixedCosts > 0 },
        { text: "Configure os Potes de destinação para organizar seu dinheiro", done: false },
        { text: "Registre todos os gastos variáveis do mês atual", done: variableExpenses > 0 }
      ]
    },
    {
      phase: "Organização Fundamental",
      period: "Próximos 3 Meses",
      active: false,
      items: [
        { text: "Eliminar pelo menos 1 assinatura ou gasto desnecessário", done: false },
        { text: liquid > 0 ? `Direcionar R$ ${Math.round(liquid * 0.3)} mensais para reserva de emergência` : "Aumentar margem líquida reduzindo gastos variáveis", done: false },
        { text: "Mapear todos os gastos por categoria por 3 meses seguidos", done: false }
      ]
    },
    {
      phase: "Construção de Segurança",
      period: "Próximos 6 Meses",
      active: false,
      items: [
        { text: "Atingir 3 meses de custos fixos em reserva de emergência", done: false },
        { text: "Reduzir comprometimento de renda abaixo de 60%", done: false },
        { text: "Começar a registrar metas financeiras com prazos definidos", done: false }
      ]
    },
    {
      phase: "Aceleração e Proteção",
      period: "Próximos 9 Meses",
      active: false,
      items: [
        { text: "Completar reserva de emergência de 6 meses de despesas", done: false },
        { text: "Iniciar investimento mensal sistemático (mesmo que pequeno)", done: false },
        { text: "Revisar e renegociar contratos fixos (internet, seguro, etc.)", done: false }
      ]
    },
    {
      phase: "Posicionamento Patrimonial",
      period: "Próximo Ano",
      active: false,
      items: [
        { text: "Alcançar taxa de poupança acima de 20% da renda bruta", done: false },
        { text: "Definir objetivo patrimonial de médio prazo com valor e data", done: false },
        { text: "Diversificar em pelo menos 2 tipos diferentes de investimento", done: false }
      ]
    },
    {
      phase: "Escala e Liberdade Financeira",
      period: "Visão 2-3 Anos",
      active: false,
      items: [
        { text: "Ter renda passiva cobrindo ao menos 30% dos custos fixos", done: false },
        { text: "Patrimônio líquido crescente e diversificado", done: false },
        { text: "Reduzir dependência de renda ativa com ativos produtivos", done: false }
      ]
    }
  ];
}
