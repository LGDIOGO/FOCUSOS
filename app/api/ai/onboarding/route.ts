import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

const SYSTEM_PROMPT = `Você é o "FocusOS Concierge", um assistente de elite inspirado na estética e precisão da Apple. 
Seu objetivo é ajudar o usuário a organizar sua rotina, focando em HÁBITOS, COMPROMISSOS e METAS ESTRATÉGICAS. Responda em Português de forma elegante e minimalista. 

DIRETRIZES DE INTELIGÊNCIA:
1. TÍTULOS CURTOS (ESSENCIAL): Gere títulos extremamente sucintos e diretos. Ex: "Academia", "Corrida", "Leitura", "Reunião". Evite frases longas.
2. HÁBITOS (Positivos e de Evitamento): 
   - Atividades recorrentes. 
   - Sugira também "Hábitos a Evitar" para apoiar a rotina. Ex: "Evitar Telas" (Noite), "Evitar Cafeína" (Tarde), "Evitar Dormir Tarde".
3. METAS ESTRATÉGICAS: Se o usuário mencionar uma frequência (Ex: "Corro 3x/semana"), calcule e sugira uma META ANUAL. 
   - Lógica de cálculo: Se hoje é Março e ele corre 3x/semana, restam ~40 semanas. Meta Sugerida: ~100-120 corridas até 31/12/2026.
4. AGENDA: Compromissos únicos que NÃO se repetem regularmente.

ESTRUTURA DA RESPOSTA (OBRIGATÓRIO):
1. Feedback Inicial: Um parágrafo curto, sofisticado e inspirador sobre a rotina do usuário.

2. Seções Recomendadas:
   ### [RECOMENDAÇÕES]
   * **Nome Sugerido (HH:MM)**: Descrição curta focada em benefício. Separe por Hábitos, Hábitos a Evitar e Metas.

REGRAS TÉCNICAS (JSON OBRIGATÓRIO NO FINAL):
Você DEVE incluir as sugestões estruturadas no formato JSON exato dentro das tags [SUGGESTIONS]:
[SUGGESTIONS]{"habits": [...], "events": [...], "goals": [...]}[/SUGGESTIONS]
- Hábito: Use "name", "type" ('positive' ou 'negative'), "emoji", "description", "time" (HH:MM), "recurrence": {"frequency": "daily"|"weekly"|"specific_days", "days_of_week": [0-6]}.
- Evento: Use "title", "time" (HH:MM), "type" ('meeting', 'event'), "emoji", "description".
- Meta (Goal): Use "title", "target_value" (número), "unit" (ex: "vezes", "km"), "emoji", "description", "color" (HEX Apple), "priority" ('high'|'medium'), "term": "annual", "end_date": "2026-12-31".
- IMPORTANTE: Se o usuário citar "segunda, quarta e sexta", use specific_days com [1, 3, 5].`

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
    const { messages, userData } = await req.json()
    const lastUserMsg = messages[messages.length - 1]?.content || ''

    // Construir bloco de contexto do usuário
    let contextBlock = ""
    if (userData) {
      contextBlock = `\n\nCONTEXTO ATUAL DO USUÁRIO:
- HÁBITOS ATIVOS: ${userData.habits?.map((h: any) => `${h.name} (${h.streak || 0} dias de ofensiva)`).join(', ') || 'Nenhum'}
- METAS: ${userData.goals?.map((g: any) => `${g.title} (${g.current_value}/${g.target_value} ${g.unit})`).join(', ') || 'Nenhuma'}
- TAREFAS RECENTES: ${userData.tasks?.slice(0, 5).map((t: any) => t.title).join(', ') || 'Nenhuma'}
- ÚLTIMOS LOGS: ${userData.recentLogs?.slice(0, 5).map((l: any) => `${l.habit_id}: ${l.status}`).join(', ') || 'Sem histórico recente'}`
    }

    const FINAL_SYSTEM_PROMPT = SYSTEM_PROMPT + contextBlock

    // 1. Tentar com GROQ (Primário - mais rápido e maior cota)
    if (groqKey) {
      try {
        const groq = new OpenAI({
          apiKey: groqKey,
          baseURL: "https://api.groq.com/openai/v1",
        })

        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: FINAL_SYSTEM_PROMPT },
            ...messages.map((m: any) => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content
            }))
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        })

        const text = completion.choices[0]?.message?.content
        if (text) {
          return NextResponse.json({ message: text, provider: 'groq' })
        }
      } catch (groqErr: any) {
        console.warn('Groq failed, falling back to Gemini:', groqErr.message)
      }
    }

    // 2. Tentar com GEMINI (Sempre como fallback)
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: FINAL_SYSTEM_PROMPT
        })

        const result = await model.generateContent(lastUserMsg)
        const response = await result.response
        const text = response.text()

        if (text) {
          return NextResponse.json({ message: text, provider: 'gemini' })
        }
      } catch (geminiErr: any) {
        console.error('Gemini fallback also failed:', geminiErr.message)
      }
    }

    return NextResponse.json({ 
      error: 'Falha em todos os provedores de IA',
      details: 'Groq e Gemini falharam ou não estão configurados.'
    }, { status: 500 })

  } catch (err: unknown) {
    const error = err as Error
    console.error('Onboarding API Error:', error.message)
    return NextResponse.json({ 
      error: 'Falha interna na API', 
      details: error.message
    }, { status: 500 })
  }
}
