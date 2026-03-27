import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from "@google/genai"
import OpenAI from "openai"

const SYSTEM_PROMPT = `Você é o FocusOS Concierge, um coach de produtividade de elite inspirado no design da Apple.
Sua missão é analisar os dados do usuário (hábitos, tarefas, metas) e fornecer INSIGHTS PROFUNDOS e AÇÕES concretas.

DIRETRIZES DE ANÁLISE:
1. DESEMPENHO: Avalie a relação entre hábitos realizados e tarefas concluídas.
2. RESGATE DE HÁBITOS: Identifique hábitos com 0% de progresso e sugira uma micro-mudança (Ex: Em vez de "1h de Academia", comece com "15min Corrida").
3. CONEXÃO COM METAS: Mostre como as ações diárias estão (ou não) movendo o ponteiro das Metas Anuais.

ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO):
Retorne um objeto com um array de insights. Cada insight deve ter:
- type: "performance" | "warning" | "tip" | "achievement" | "rescue"
- title: Título curto e impactante (Estilo Apple).
- body: Explicação concisa (máx 2 frases).
- action: (Opcional) Sugestão de ação técnica.
  - label: Texto do botão (ex: "Reduzir Meta", "Mudar Horário").
  - type: "create_habit" | "update_goal" | "reschedule_task".
  - payload: Objeto com sugestão de campos (ex: { name: "Novo Nome", time: "08:00" }).

Responda APENAS em JSON.`

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
    const { userData } = await req.json()
    const { habits = [], tasks = [], goals = [] } = userData || {}

    const userContext = `
      HÁBITOS: ${JSON.stringify(habits.map((h: any) => ({ name: h.name, status: h.status, streak: h.streak })))}
      TAREFAS: ${JSON.stringify(tasks.map((t: any) => ({ title: t.title, status: t.status, priority: t.priority })))}
      METAS: ${JSON.stringify(goals.map((g: any) => ({ title: g.title, progress: g.progress_pct, target: g.target_value })))}
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
        const ai = new GoogleGenAI({ apiKey: geminiKey })
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: 'user', parts: [{ text: userContext }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 1024,
            temperature: 0.7
          }
        })

        if (response.text) {
          const jsonStr = response.text.replace(/```json|```/g, '').trim()
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
