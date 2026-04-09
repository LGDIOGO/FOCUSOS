import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

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
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
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

    // 1. Tentar com GROQ
    if (groqKey) {
      try {
        const groq = new OpenAI({
          apiKey: groqKey,
          baseURL: "https://api.groq.com/openai/v1",
        })

        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContext }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        const text = completion.choices[0]?.message?.content
        if (text) {
          const parsed = JSON.parse(text)
          return NextResponse.json(parsed.insights || parsed)
        }
      } catch (groqErr: any) {
        console.warn('Insights Groq failed, falling back to Gemini:', groqErr.message)
      }
    }

    // 2. Tentar com GEMINI
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: SYSTEM_PROMPT
        })

        const result = await model.generateContent(userContext)
        const response = await result.response
        const text = response.text()

        if (text) {
          const jsonStr = text.replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(jsonStr)
          return NextResponse.json(parsed.insights || parsed)
        }
      } catch (geminiErr: any) {
        console.error('Insights Gemini fallback failed:', geminiErr.message)
      }
    }

    return NextResponse.json({ error: 'Falha na geração de insight' }, { status: 500 })
  } catch (err: unknown) {
    const error = err as Error
    console.error('Insights API Error:', error.message)
    return NextResponse.json({ 
      error: 'Falha na geração de insight',
      details: error.message
    }, { status: 500 })
  }
}
