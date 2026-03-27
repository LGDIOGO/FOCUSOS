import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from "@google/genai"
import OpenAI from "openai"

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
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)?.trim()
    
    const { type, userData } = await req.json()
    const context = userData || {}
    const userMessage = `Dados do Usuário:\n${JSON.stringify(context, null, 2)}\n\nTipo de insight esperado: ${type || 'auto'}`

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
            { role: "user", content: userMessage }
          ],
          model: "llama-3.1-70b-versatile",
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        const text = completion.choices[0]?.message?.content
        if (text) {
          return NextResponse.json(JSON.parse(text))
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
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 1024,
            temperature: 0.7
          }
        })

        if (response.text) {
          const jsonStr = response.text.replace(/```json|```/g, '').trim()
          return NextResponse.json(JSON.parse(jsonStr))
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
