import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { auth, db } from '@/lib/firebase/config' // Using client config for simplicity in dev
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA ausente (API Key)' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const { type, userData } = await req.json()

    const context = userData || {}

    const systemPrompt = `
      Você é um coach de produtividade especialista em design Apple (minimalista, elegante, direto). 
      Analise os dados de hábitos e tarefas fornecidos e gere um insight CONCISO (máximo 2 frases).
      
      Padrões a identificar:
      - Consistência (ou falta dela)
      - Correlações entre hábitos e conclusão de tarefas
      - Sugestões para o dia atual baseado no histórico
      
      Categorias de retorno (type): "warning", "pattern", "tip", "achievement"
      
      Responda APENAS em JSON no formato: { "type": "...", "title": "...", "body": "..." }
      Fale em Português do Brasil. Seja motivador mas profissional.
    `

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: systemPrompt },
        { text: `Dados do Usuário:\n${JSON.stringify(context, null, 2)}\n\nTipo de insight esperado: ${type || 'auto'}` }
      ]
    })
    
    const text = result.text || ''
    
    // Extract JSON from potential markdown formatting
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const insight = JSON.parse(jsonStr)

    return NextResponse.json(insight)
  } catch (err: any) {
    console.error('Gemini 3 Error:', err)
    return NextResponse.json({ 
      error: 'Falha na geração de insight',
      details: err.message
    }, { status: 500 })
  }
}
