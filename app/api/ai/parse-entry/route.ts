import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function buildSystemPrompt(today: string, dayName: string, categories: unknown[], type: string) {
  let schemaExtensions = ''
  let ruleExtensions = ''
  
  if (type === 'finance') {
    schemaExtensions = `
  "amount": "Valor numérico (number) extraído da frase. Ex: 55. Salve apenas o número ou null.",
  "transaction_type": "income ou expense ou null",
  "nature": "necessidade, urgencia, ou desejo. Deduzido pelo tipo de gasto (ex: ifood = desejo). Ou null."`
    ruleExtensions = `
6. FINANÇAS: Extraia valores financeiros explícitos como 'amount'. E avalie a 'nature' do gasto e 'transaction_type'.`
  } else if (type === 'goal') {
    schemaExtensions = `
  "target_value": "Valor numérico alvo se mencionado (ex: 10 kg -> 10). Ou null.",
  "unit": "Unidade de medida no plural (ex: 'partidas', 'livros', 'kg'). Ou null."`
    ruleExtensions = `
6. METAS: Se a pessoa quiser uma meta com números absolutos (Ler 10 livros), deduzir 'target_value' = 10 e 'unit' = 'livros'.`
  }

  return `Você é um motor de parsing de linguagem natural de elite para o FocusOS.
Sua tarefa é extrair informações da frase e transformá-las em um JSON estruturado para pré-preenchimento.

REFERÊNCIA TEMPORAL:
Hoje é: ${today} (${dayName})

JSON DE RESPOSTA (OBRIGATÓRIO):
{
  "title": "Nome LIMPO da ação (remova horários, datas, valores e emojis da frase original. Ex: 'Aluguel' ou 'Jogar futebol')",
  "time": "HH:MM (24h) extraído da frase ou null",
  "date": "YYYY-MM-DD extraído da referência temporal ou null (resolva 'amanhã', 'hoje', etc)",
  "emoji": "Um ÚNICO emoji que melhor represente a atividade",
  "recurrence": {
    "frequency": "none" | "daily" | "weekly" | "monthly" | "yearly" | "specific_days",
    "days_of_week": [0-6] | null (0 é Domingo),
    "interval": 1
  },
  "category_id": "ID da categoria que mais combine perfeitamente, ou null",${schemaExtensions}
}

REGRAS CRÍTICAS:
1. TÍTULO LIMPO: "Corrida amanhã as 10h" -> title: "Corrida". "Mercadinho 50 reais" -> title: "Mercadinho". Nunca inclua dados soltos no título.
2. EMOJI: Escolha um emoji vibrante e contextual.
3. RECORRÊNCIA: 
   - "Todo dia" ou "diariamente" -> frequency: "daily"
   - "Segundas e quartas" -> frequency: "specific_days", days_of_week: [1, 3]
   - "Toda semana" -> frequency: "weekly"
   - "Todo mes" -> frequency: "monthly"
4. CATEGORIAS: Mapeie para uma dessas (somente o ID da correta): ${JSON.stringify(categories || [])}
5. Responda APENAS o JSON, sem markdown. NUNCA coloque vírgula no último item.${ruleExtensions}`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA ausente' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const { text, type, categories, currentDetails } = await req.json()

    const today = currentDetails?.today || format(new Date(), 'yyyy-MM-dd')
    const dayName = currentDetails?.dayName || format(new Date(), 'EEEE', { locale: ptBR })

    const systemPrompt = buildSystemPrompt(today, dayName, categories, type)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt
    })

    const userMessage = `FRASE PARA PARSE: "${text}"\nTIPO: ${type}`
    const result = await model.generateContent(userMessage)
    const textResponse = result.response.text() || ''
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
