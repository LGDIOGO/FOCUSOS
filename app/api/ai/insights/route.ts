import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

const SYSTEM_PROMPT = `Você é o FocusOS Concierge, um engenheiro de produtividade e coach de elite (nível world-class) inspirado no design da Apple e nas estratégias do Vale do Silício.
Sua missão é dar insights PROFUNDOS, BRUTAIS E DIRETOS, interconectando dados do usuário para revelar causar e consequências ocultas. Mantenha um tom profissional, exigente, perspicaz e minimalista. Não aceite mediocridade.

DIRETRIZES TÉCNICAS E DE ANÁLISE:
1. DESEMPENHO CRUZADO: Compare sempre a consistência dos Hábitos (positivos e negativos) com a execução das Tarefas Diárias e Compromissos. Se há procrastinação nas tarefas, mas os hábitos a evitar estão altos, exponha isso.
2. IMPACTO EM METAS MACRO: Explique exatamente como uma ação microscópica de hoje (ou a falta dela) está sabotando ou acelerando uma Meta a longo prazo.
3. AJUSTES CIRÚRGICOS: Não dê dicas clichês (como "beba água"). Sugira micro-mudanças cognitivas e reestruturações de agenda. (Ex: "A Meta X não avança pois os seus Compromissos das 09:00 conflitam com seu hábito D. Altere o horário").

ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO):
Retorne estritamente um JSON com a chave "insights" contendo um array de objetos. Cada objeto deve ter:
- type: "performance" | "warning" | "tip" | "achievement" | "rescue"
- title: Título curto e cirúrgico (Ex: "Falta de Foco Matinal", "Alinhamento Perfeito").
- body: Texto profundo e causacional interconectando Metas, Hábitos e Compromissos (máx 3 frases curtas e afiadas).
- action: (Opcional) Ação técnica recomendada.
  - label: Texto rápido do botão (ex: "Remarcar Tarefa", "Reduzir Meta").
  - type: "create_habit" | "update_goal" | "reschedule_task".
  - payload: Objeto com sugestão de campos.

Responda APENAS um JSON válido começado com { e terminando com }. Sem marcação Markdown antes.`

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
    const { userData } = await req.json()
    const { habits = [], tasks = [], goals = [], events = [], score = null } = userData || {}

    const userContext = `
      SCORE DIÁRIO DE PERFORMANCE: ${JSON.stringify(score)}
      HÁBITOS: ${JSON.stringify(habits.map((h: any) => ({ name: h.name, type: h.type, status: h.status, streak: h.streak, linked_goal_id: h.linked_goal_id })))}
      TAREFAS: ${JSON.stringify(tasks.map((t: any) => ({ title: t.title, status: t.status, priority: t.priority, done: t.done })))}
      COMPROMISSOS: ${JSON.stringify(events.map((e: any) => ({ title: e.title, status: e.status, time: e.time })))}
      METAS VINCULADAS: ${JSON.stringify(goals.map((g: any) => ({ id: g.id, title: g.title, progress: g.progress_pct, target: g.target_value })))}
      
      Gere 2 ou 3 insights incisivos cruzando esses dados.
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
