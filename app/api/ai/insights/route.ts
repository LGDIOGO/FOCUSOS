import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/models'

const SYSTEM_PROMPT = `Você é o FocusOS AI Concierge, um Coach de Alta Performance de Elite (estilo Neurocientistas e CEOs do Vale do Silício).
Sua missão é dar insights PROFUNDOS, FISIOLÓGICOS e DIRETOS, conectando os dados de produtividade do usuário com sua saúde física e mental. Sem conselhos vazios e clichês, seja prático, embasado e incisivo. Não aceite mediocridade, mas previna o Burnout.

PILARES DE ANÁLISE OBRIGATÓRIOS:
1. FOCO E PRODUTIVIDADE ENRAIZADOS NA ROTINA: Analise o timing e o volume de tarefas. Se a agenda está superlotada e tarefas não são concluídas, identifique falhas de planejamento ou falta de "Deep Work".
2. SAÚDE FÍSICA E RITMO CIRCADIANO: Use os horários dos compromissos e os hábitos relatados (ou ignorados, como treinos/água) para sugerir intervenções fisiológicas. Ex: "Você tem reuniões críticas às 14h, evite carboidratos pesados no almoço para evitar queda de performance".
3. SAÚDE MENTAL E DESCOMPRESSÃO: Perceba acúmulo de estresse. Se o usuário falha repetidamente ou está sempre correndo contra o tempo, exija janelas de "wind down" mental.

ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO):
Retorne estritamente um JSON com a chave "insights" contendo um array (máximo 4 insights). Cada objeto deve ter:
- type: "performance" | "warning" | "tip" | "achievement" | "rescue"
- title: Título hiper-específico (Ex: "Déficit Circadiano", "Sobrecarga Cognitiva Iminente").
- body: Texto afiado e persuasivo cruzando Hábitos/Metas x Fisiologia/Produtividade, usando o contexto de DATA/HORA que te passei. (MÁXIMO de 3-4 frases, seja tangível).
- action: (Opcional) Sugestão de ação EXTREMAMENTE ESPECÍFICA no aplicativo.
  - label: Texto rápido e prático (ex: "Bloquear 1h Focus", "Adicionar Hábito: Água").
  - type: "create_habit" | "update_goal" | "reschedule_task".
  - payload: Objeto com sugestão de campos para a ação preenchida.

Responda APENAS UM JSON VÁLIDO no formato especificado. Nunca inclua texto em markdown fora do JSON.`

export async function POST(req: NextRequest) {
  try {
    const { userData } = await req.json()
    const { habits = [], tasks = [], goals = [], events = [], score = null } = userData || {}

    const now = new Date()
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const currentDateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

    const userContext = `
      --- CONTEXTO TEMPORAL ---
      DATA DE HOJE: ${currentDateStr}
      HORA ATUAL: ${currentTimeStr}

      --- DADOS REAIS DO USUÁRIO ---
      SCORE DIÁRIO DE PERFORMANCE: ${JSON.stringify(score)}
      HÁBITOS: ${JSON.stringify(habits.map((h: any) => ({ name: h.name, type: h.type, status: h.status, streak: h.streak, linked_goal_id: h.linked_goal_id })))}
      TAREFAS: ${JSON.stringify(tasks.map((t: any) => ({ title: t.title, status: t.status, priority: t.priority, done: t.done })))}
      COMPROMISSOS: ${JSON.stringify(events.map((e: any) => ({ title: e.title, status: e.status, time: e.time })))}
      METAS VINCULADAS: ${JSON.stringify(goals.map((g: any) => ({ id: g.id, title: g.title, progress: g.progress_pct, target: g.target_value })))}
      
      BASEIE-SE ESTRITAMENTE NESTES DADOS PARA GERAR OS INSIGHTS. Gere de 2 a 4 insights precisos cruzando esses dados temporalmente e fisiologicamente.
    `

    try {
      const { text } = await generateText({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContext }],
        temperature: 0.7,
        jsonMode: true,
      })
      // Alguns modelos embrulham o JSON em cerca de markdown mesmo em modo JSON.
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return NextResponse.json(parsed.insights || parsed)
    } catch (aiErr: any) {
      console.error('Insights AI failure:', aiErr.message)
      return NextResponse.json({ error: 'Falha na geração de insight', details: aiErr.message }, { status: 503 })
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error('Insights API Error:', error.message)
    return NextResponse.json({ 
      error: 'Falha na geração de insight',
      details: error.message
    }, { status: 500 })
  }
}
