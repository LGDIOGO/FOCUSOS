import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from "@google/genai"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function buildSystemPrompt(today: string, dayName: string, categories: unknown[]) {
  return `Você é um motor de parsing de linguagem natural de elite para o FocusOS.
Sua tarefa é extrair informações de agendamento de uma frase e transformá-las em um JSON estruturado.

REFERÊNCIA TEMPORAL:
Hoje é: ${today} (${dayName})

JSON DE RESPOSTA (OBRIGATÓRIO):
{
  "title": "Nome da tarefa LIMPO (remova horários, datas e emojis da frase original. Ex: 'Jogar futebol')",
  "time": "HH:MM (24h) ou null",
  "date": "YYYY-MM-DD ou null (resolva 'amanhã', 'hoje', 'terça que vem', etc)",
  "emoji": "Um ÚNICO emoji que melhor represente a atividade (Ex: ⚽ para futebol, 🏃 para corrida)",
  "recurrence": {
    "frequency": "none" | "daily" | "weekly" | "monthly" | "specific_days",
    "days_of_week": [0-6] | null (0 é Domingo),
    "interval": number | 1
  },
  "category_id": "ID da categoria mais próxima se fornecida, ou null"
}

REGRAS CRÍTICAS:
1. TÍTULO LIMPO: "Corrida amanhã as 10h" -> title: "Corrida". Nunca inclua a data/hora no título.
2. EMOJI: Escolha um emoji vibrante e contextual.
3. RECORRÊNCIA: 
   - "Todo dia" ou "diariamente" -> frequency: "daily"
   - "Segundas e quartas" -> frequency: "specific_days", days_of_week: [1, 3]
   - "Toda semana" -> frequency: "weekly"
4. CATEGORIAS: Mapeie para uma dessas se fizer sentido: ${JSON.stringify(categories || [])}
5. Responda APENAS o JSON, sem markdown.`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA ausente' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const { text, type, categories, currentDetails } = await req.json()

    const today = currentDetails?.today || format(new Date(), 'yyyy-MM-dd')
    const dayName = currentDetails?.dayName || format(new Date(), 'EEEE', { locale: ptBR })

    const systemPrompt = buildSystemPrompt(today, dayName, categories)
    const userMessage = `FRASE PARA PARSE: "${text}"\nTIPO: ${type} (habit ou agenda)`

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
        temperature: 0.1
      }
    })
    
    const textResponse = response.text || ''
    if (!textResponse) {
      throw new Error('Resposta da IA vazia')
    }
    const jsonStr = textResponse.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const error = err as Error
    console.error('Parse Error:', error.message)
    return NextResponse.json({ error: 'Falha no parse inteligente' }, { status: 500 })
  }
}
