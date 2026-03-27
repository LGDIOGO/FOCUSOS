import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from "@google/genai"

const SYSTEM_PROMPT = `Você é um coach de produtividade especialista em design Apple (minimalista, elegante, direto). 
Analise os dados de hábitos e tarefas fornecidos e gere um insight CONCISO (máximo 2 frases).

Padrões a identificar:
- Consistência (ou falta dela)
- Correlações entre hábitos e conclusão de tarefas
- Sugestões para o dia atual baseado no histórico

Categorias de retorno (type): "warning", "pattern", "tip", "achievement"

Responda APENAS em JSON no formato: { "type": "...", "title": "...", "body": "..." }
Fale em Português do Brasil. Seja motivador mas profissional.`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA ausente (API Key)' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const { type, userData } = await req.json()

    const context = userData || {}
    const userMessage = `Dados do Usuário:\n${JSON.stringify(context, null, 2)}\n\nTipo de insight esperado: ${type || 'auto'}`

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    })
    
    const text = response.text || ''
    
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const insight = JSON.parse(jsonStr)

    return NextResponse.json(insight)
  } catch (err: unknown) {
    const error = err as Error
    console.error('Insights API Error:', error.message)
    return NextResponse.json({ 
      error: 'Falha na geração de insight',
      details: error.message
    }, { status: 500 })
  }
}
