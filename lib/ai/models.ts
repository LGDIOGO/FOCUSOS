import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * IDs de modelo ficavam fixos em cada rota. Quando a Groq aposentou
 * `llama-3.3-70b-versatile` e a Google tirou `gemini-1.5-flash` do v1beta, as
 * quatro rotas de IA passaram a devolver 500 ao mesmo tempo — provedor
 * primário e fallback caíram juntos, porque ambos eram um único ID cada.
 *
 * Aqui a lista é ordenada por preferência e percorrida até alguma responder.
 * Aposentar um modelo passa a degradar em vez de derrubar.
 */
export const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b',
  'groq/compound',
] as const

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
] as const

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface GenerateOptions {
  system: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  /** Pede JSON puro ao provedor quando ele suportar. */
  jsonMode?: boolean
}

export interface GenerateResult {
  text: string
  provider: 'groq' | 'gemini'
  model: string
}

/**
 * Modelos de raciocínio (qwen, entre outros) às vezes vazam o rascunho.
 * O chat renderiza a resposta crua, então isso apareceria para o usuário.
 */
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\|channel\|>[\s\S]*?<\|message\|>/gi, '')
    .trim()
}

/** Erro de modelo indisponível — vale tentar o próximo da lista. */
function isModelUnavailable(err: any): boolean {
  const status = err?.status ?? err?.response?.status
  const msg = String(err?.message || '')
  return (
    status === 404 ||
    status === 400 ||
    status === 503 ||
    /does not exist|not found|decommission|deprecat|high demand|overloaded|unavailable/i.test(msg)
  )
}

export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const groqKey = process.env.GROQ_API_KEY?.trim()
  const geminiKey = (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY
  )?.trim()

  const failures: string[] = []

  if (groqKey) {
    const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
    for (const model of GROQ_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: 'system', content: opts.system }, ...opts.messages],
          temperature: opts.temperature ?? 0.7,
          ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
          ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
        })
        const text = stripReasoning(completion.choices[0]?.message?.content || '')
        if (text) return { text, provider: 'groq', model }
        failures.push(`groq/${model}: resposta vazia`)
      } catch (err: any) {
        failures.push(`groq/${model}: ${err?.message ?? err}`)
        if (!isModelUnavailable(err)) break // erro de chave/cota: trocar de modelo não ajuda
      }
    }
  }

  if (geminiKey) {
    const genAI = new GoogleGenerativeAI(geminiKey)
    // O SDK do Gemini não tem papel "system" nas mensagens: vai em systemInstruction
    // e o histórico é achatado, marcando quem falou.
    const prompt = opts.messages
      .map(m => (m.role === 'assistant' ? `Assistente: ${m.content}` : `Usuário: ${m.content}`))
      .join('\n\n')

    for (const model of GEMINI_MODELS) {
      try {
        const client = genAI.getGenerativeModel({
          model,
          systemInstruction: opts.system,
          ...(opts.jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
        })
        const result = await client.generateContent(prompt)
        const text = stripReasoning(result.response.text() || '')
        if (text) return { text, provider: 'gemini', model }
        failures.push(`gemini/${model}: resposta vazia`)
      } catch (err: any) {
        failures.push(`gemini/${model}: ${err?.message ?? err}`)
        if (!isModelUnavailable(err)) break
      }
    }
  }

  if (!groqKey && !geminiKey) {
    throw new Error('Nenhuma API de IA configurada (GROQ_API_KEY ou GOOGLE_AI_API_KEY)')
  }
  throw new Error(`Todos os modelos falharam. Tentativas: ${failures.join(' | ')}`)
}
