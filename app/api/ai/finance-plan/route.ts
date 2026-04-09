import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// This configuration allows deployment on Edge runtimes but also works on Node.
// export const runtime = 'edge'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { income, fixedCosts, variableExpenses, potes } = body;

    // Check if API Key is configured
    const grokKey = process.env.GROQ_API_KEY?.trim();
    if (!grokKey) {
      console.warn("GROQ_API_KEY is not set. Returning fallback mock plan.");
      // Return a very generic AI Mock plan highlighting it's a fallback
      return NextResponse.json({
        plan: [
          {
            phase: 'Aviso: Configure sua API Key do Grok',
            period: 'Imediato',
            items: [
              { text: 'Painel conectou com o Backend mas falta a Chave da IA', done: false },
              { text: 'Adicione GROK_API_KEY no arquivo .env local ou Vercel', done: false }
            ],
            active: true
          },
          {
            phase: 'Fase 1: Organização Fundamental',
            period: 'Próximos 3 meses',
            items: [
              { text: `Sua renda base é de R$ ${income}`, done: true },
              { text: `Obrigações fixas calculadas em R$ ${fixedCosts}`, done: true },
              { text: 'Otimizar gastos do dia-a-dia', done: false }
            ],
            active: false
          }
        ]
      });
    }

    const openai = new OpenAI({
      apiKey: grokKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const prompt = `
      Atue como um Conselheiro Financeiro de Elite e estrategista.
      Analise o perfil financeiro deste cliente:
      - Renda Mensal Total: R$ ${income}
      - Custos Fixos: R$ ${fixedCosts}
      - Gastos Diários/Variáveis Recentes Cadastrados: R$ ${variableExpenses}
      - Potes de Destinação Configuradas: ${JSON.stringify(potes)}
      
      Sua tarefa é gerar um "Master Plan" financeiro com 3 fases de evolução.
      As fases representam: 1. Limpeza/Organização atual (Imediato), 2. Acumulação e Defesa (Próx. Trimestre), 3. Escala e Aceleração (Próx. Ano)
      
      Retorne ESTRITAMENTE um JSON em formato de Array, sem marcações markdown como \`\`\`json. O JSON precisa ter a exata estrutura abaixo:
      [
        {
          "phase": "Nome Seductive/Premium da Fase",
          "period": "Imediato ou Prazo",
          "items": [
            { "text": "Ação clara baseada nos R$ ou Potes do usuário", "done": false }
          ],
          "active": true // apenas o primeiro item é true
        }
      ]
    `;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let aiContent = response.choices[0].message.content || '[]';
    
    // GPT sometimes wraps json array in an object when response_format: json_object is used
    // If it wraps it like { "plan": [...] } we need to extract it
    let parsedRows = JSON.parse(aiContent);
    if (parsedRows && typeof parsedRows === 'object' && !Array.isArray(parsedRows)) {
      const firstKey = Object.keys(parsedRows)[0];
      if (Array.isArray(parsedRows[firstKey])) {
        parsedRows = parsedRows[firstKey];
      } else {
        // Fallback
        parsedRows = [parsedRows]; 
      }
    }

    return NextResponse.json({
      plan: parsedRows
    });
  } catch (error: any) {
    console.error('Error generating AI plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
