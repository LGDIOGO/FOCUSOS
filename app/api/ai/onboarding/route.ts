import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

const SYSTEM_PROMPT = `Você é o "FocusOS IA", um assistente de produtividade pessoal de elite para o app FocusOS.
Você conhece o histórico e contexto completo do usuário e toma decisões precisas com base nisso.
Responda em Português de forma direta, inteligente e sofisticada.

CAPACIDADES PRINCIPAIS:
1. CRIAR novos hábitos, eventos e metas via [SUGGESTIONS]
2. MODIFICAR e EXCLUIR itens existentes via [ACTIONS] usando os IDs do contexto
3. ANALISAR o progresso e dar conselhos estratégicos
4. CRIAR em massa (múltiplos itens de uma vez)

DIRETRIZES DE CRIAÇÃO:
- Títulos curtos e diretos: "Academia", "Corrida", "Leitura". Evite frases longas.
- Hábitos positivos E de evitamento (type: 'negative'). Ex: "Evitar Telas", "Evitar Cafeína".
- Se o usuário citar frequência (3x/semana), calcule meta anual automaticamente.
- Para criar em massa, inclua todos no array habits/events/goals no mesmo [SUGGESTIONS].

AÇÕES EM ITEMS EXISTENTES (OBRIGATÓRIO quando usuário pedir editar/excluir):
Use a tag [ACTIONS] com os IDs exatos do contexto abaixo:
[ACTIONS]{"modify":[{"id":"ID_EXATO","collection":"habits","updates":{"name":"Novo Nome","time":"07:00"}}],"delete":[{"id":"ID_EXATO","collection":"habits"}]}[/ACTIONS]

Coleções válidas: "habits", "events", "goals", "tasks"
NUNCA invente IDs. Use apenas IDs listados no contexto do usuário.

REGRAS TÉCNICAS JSON:
Quando sugerir itens NOVOS, inclua ao final:
[SUGGESTIONS]{"habits": [...], "events": [...], "goals": [...]}[/SUGGESTIONS]

- Hábito: "name", "type" ('positive'|'negative'), "emoji", "description", "time" (HH:MM), "recurrence": {"frequency": "daily"|"weekly"|"specific_days", "days_of_week": [0-6]}
- Evento: "title", "time" (HH:MM), "type" ('meeting'|'event'), "emoji", "description"
- Meta: "title", "target_value" (número), "unit" (ex: "vezes","km"), "emoji", "description", "color" (HEX), "priority" ('high'|'medium'), "term": "annual", "end_date": "2026-12-31"
- Dias: seg=1, ter=2, qua=3, qui=4, sex=5, sáb=6, dom=0

ESTRUTURA DA RESPOSTA:
1. Análise breve e perspicaz da situação do usuário (1-2 parágrafos max)
2. Recomendações em formato de lista quando pertinente
3. JSON [SUGGESTIONS] e/ou [ACTIONS] no final (NUNCA no meio do texto)`

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
    const { messages, userData } = await req.json()
    const lastUserMsg = messages[messages.length - 1]?.content || ''

    // Construir bloco de contexto do usuário
    let contextBlock = ""
    if (userData) {
      const habitsLines = userData.habits?.map((h: any) =>
        `  [ID:${h.id}] ${h.emoji || '✨'} ${h.name} | streak:${h.streak || 0}d | tipo:${h.type || 'positive'} | horário:${h.time || '--'}`
      ).join('\n') || '  Nenhum'

      const goalsLines = userData.goals?.map((g: any) =>
        `  [ID:${g.id}] ${g.emoji || '🎯'} ${g.title} | ${g.current_value || 0}/${g.target_value} ${g.unit || ''} | prioridade:${g.priority || 'medium'}`
      ).join('\n') || '  Nenhuma'

      const tasksLines = userData.tasks?.slice(0, 10).map((t: any) =>
        `  [ID:${t.id}] ${t.title} | status:${t.status || 'pending'}`
      ).join('\n') || '  Nenhuma'

      const eventsLines = userData.events?.slice(0, 10).map((e: any) =>
        `  [ID:${e.id}] ${e.emoji || '📅'} ${e.title} | ${e.date} ${e.time || ''}`
      ).join('\n') || '  Nenhum'

      contextBlock = `\n\n━━━ CONTEXTO ATUAL DO USUÁRIO ━━━
HÁBITOS ATIVOS (use IDs para modificar/excluir):
${habitsLines}

METAS:
${goalsLines}

TAREFAS RECENTES:
${tasksLines}

EVENTOS/COMPROMISSOS:
${eventsLines}

LOGS RECENTES: ${userData.recentLogs?.slice(0, 5).map((l: any) => `${l.habit_id}:${l.status}`).join(', ') || 'Sem histórico'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
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
