import { NextRequest } from 'next/server'
import { authWithApiKey } from '../v1/_auth'

// ── Helpers ────────────────────────────────────────────────────────────────
function ok(id: any, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result })
}
function err(id: any, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } })
}

async function callV1(req: NextRequest, path: string, method = 'GET', body?: unknown) {
  const host = req.headers.get('host') || 'focusos-rlvs.vercel.app'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  const res = await fetch(`${proto}://${host}/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// ── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_summary',
    description: 'Retorna um resumo completo do FocusOS: hábitos de hoje, próximos compromissos, tarefas pendentes, metas ativas e desempenho da semana.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_performance',
    description: 'Retorna métricas de desempenho por período: score diário, hábitos concluídos, sequência atual.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Número de dias (padrão 7, máx 90)' },
        from: { type: 'string', description: 'Data início YYYY-MM-DD' },
        to: { type: 'string', description: 'Data fim YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'list_habits',
    description: 'Lista todos os hábitos ativos do usuário.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_habit',
    description: 'Cria um novo hábito no FocusOS.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Nome do hábito' },
        type: { type: 'string', enum: ['positive', 'negative'], description: 'Tipo do hábito' },
        time: { type: 'string', description: 'Horário ideal HH:MM' },
        emoji: { type: 'string', description: 'Emoji representativo' },
      },
    },
  },
  {
    name: 'list_events',
    description: 'Lista compromissos da agenda, opcionalmente filtrado por período.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Data início YYYY-MM-DD (padrão: hoje)' },
        to: { type: 'string', description: 'Data fim YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'create_event',
    description: 'Cria um novo compromisso/evento na agenda.',
    inputSchema: {
      type: 'object',
      required: ['title', 'date'],
      properties: {
        title: { type: 'string', description: 'Título do compromisso' },
        date: { type: 'string', description: 'Data YYYY-MM-DD' },
        time: { type: 'string', description: 'Horário HH:MM' },
        type: { type: 'string', enum: ['meeting', 'birthday', 'event', 'task', 'other'] },
        description: { type: 'string' },
      },
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tarefas, opcionalmente filtrado por status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa no FocusOS.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        due_date: { type: 'string', description: 'Data limite YYYY-MM-DD' },
        due_time: { type: 'string', description: 'Horário limite HH:MM' },
      },
    },
  },
  {
    name: 'list_goals',
    description: 'Lista metas com progresso atual.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'paused'] },
      },
    },
  },
  {
    name: 'create_goal',
    description: 'Cria uma nova meta no FocusOS.',
    inputSchema: {
      type: 'object',
      required: ['title', 'target_value'],
      properties: {
        title: { type: 'string', description: 'Título da meta' },
        target_value: { type: 'number', description: 'Valor alvo' },
        current_value: { type: 'number', description: 'Progresso atual (padrão 0)' },
        unit: { type: 'string', description: 'Unidade, ex: km, livros, %' },
        end_date: { type: 'string', description: 'Data limite YYYY-MM-DD' },
        emoji: { type: 'string' },
      },
    },
  },
]

// ── Tool executor ───────────────────────────────────────────────────────────
async function executeTool(req: NextRequest, name: string, args: Record<string, any>) {
  const today = new Date().toISOString().slice(0, 10)

  switch (name) {
    case 'get_summary':
      return callV1(req, '/summary')

    case 'get_performance': {
      const p = new URLSearchParams()
      if (args.days) p.set('days', String(args.days))
      if (args.from) p.set('from', args.from)
      if (args.to) p.set('to', args.to)
      return callV1(req, `/performance?${p}`)
    }

    case 'list_habits':
      return callV1(req, '/habits')

    case 'create_habit':
      return callV1(req, '/habits', 'POST', args)

    case 'list_events': {
      const p = new URLSearchParams({ from: args.from || today })
      if (args.to) p.set('to', args.to)
      return callV1(req, `/events?${p}`)
    }

    case 'create_event':
      return callV1(req, '/events', 'POST', args)

    case 'list_tasks': {
      const p = new URLSearchParams()
      if (args.status) p.set('status', args.status)
      return callV1(req, `/tasks?${p}`)
    }

    case 'create_task':
      return callV1(req, '/tasks', 'POST', args)

    case 'list_goals': {
      const p = new URLSearchParams()
      if (args.status) p.set('status', args.status)
      return callV1(req, `/goals?${p}`)
    }

    case 'create_goal':
      return callV1(req, '/goals', 'POST', args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Authenticate
  const auth = await authWithApiKey(req)
  if (!auth) {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized — include X-API-Key: fos_live_...' } },
      { status: 401 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return err(null, -32700, 'Parse error')
  }

  const { method, params, id } = body

  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'focusos', version: '1.0.0', description: 'FocusOS — hábitos, agenda, tarefas e metas' },
        })

      case 'notifications/initialized':
        return new Response(null, { status: 204 })

      case 'tools/list':
        return ok(id, { tools: TOOLS })

      case 'tools/call': {
        const toolName: string = params?.name
        const toolArgs: Record<string, any> = params?.arguments ?? {}
        const data = await executeTool(req, toolName, toolArgs)
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        })
      }

      case 'ping':
        return ok(id, {})

      default:
        return err(id, -32601, `Method not found: ${method}`)
    }
  } catch (e: any) {
    return err(id, -32603, e?.message || 'Internal error')
  }
}

// SSE endpoint for server-initiated messages (required by MCP spec)
export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"ping"}\n\n'))
      // Keep-alive
      const interval = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(': ping\n\n')) } catch { clearInterval(interval) }
      }, 20000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  })
}
