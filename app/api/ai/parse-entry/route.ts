import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

    const systemPrompt = `
      Você é um motor de parsing de linguagem natural para o FocusOS.
      Sua tarefa é extrair informações de agendamento de uma frase curta.
      
      REFERÊNCIA TEMPORAL:
      Hoje é: ${today} (${dayName})
      
      JSON DE RESPOSTA (OBRIGATÓRIO):
      {
        "title": "Apenas o nome limpo do evento/hábito",
        "time": "HH:MM (24h) ou null",
        "date": "YYYY-MM-DD ou null (resolva 'amanhã', 'próxima segunda', etc)",
        "recurrence": {
          "frequency": "none" | "daily" | "weekly" | "monthly" | "specific_days",
          "days_of_week": [0-6] | null (0 é Domingo),
          "interval": number | 1
        },
        "category_id": "ID da categoria mais próxima se fornecida, ou null"
      }

      REGRAS:
      - Se o usuário disser "segundas e quartas", use specific_days com [1, 3].
      - Se disser "todo dia", use daily.
      - Se disser um horário como "19h", use "19:00".
      - Tente mapear para as seguintes categorias disponíveis: ${JSON.stringify(categories || [])}
      - Retorne APENAS o JSON.
    `

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: systemPrompt },
        { text: `FRASE PARA PARSE: "${text}"\nTIPO: ${type} (habit ou agenda)` }
      ]
    })
    
    const textResponse = result.text
    if (!textResponse) {
      throw new Error('Resposta da IA vazia')
    }
    const jsonStr = textResponse.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('Parse Error:', err)
    return NextResponse.json({ error: 'Falha no parse inteligente' }, { status: 500 })
  }
}
