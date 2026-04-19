#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const BASE_URL = process.env.FOCUSOS_API_URL || 'https://focusos-rlvs.vercel.app'
const API_KEY = process.env.FOCUSOS_API_KEY || ''

if (!API_KEY) {
  process.stderr.write('❌ FOCUSOS_API_KEY não definida. Configure a variável de ambiente.\n')
  process.exit(1)
}

async function api(path, options = {}) {
  const url = `${BASE_URL}/api/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}

const server = new McpServer({
  name: 'focusos',
  version: '1.0.0',
  description: 'Integração completa com FocusOS — gerencie hábitos, compromissos, tarefas e metas',
})

// ── SUMMARY ──────────────────────────────────────────────────────────────────
server.tool(
  'get_summary',
  'Retorna um resumo completo do FocusOS: hábitos de hoje, próximos compromissos, tarefas pendentes, metas ativas e desempenho semanal.',
  {},
  async () => {
    const data = await api('/summary')
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2),
      }],
    }
  }
)

// ── PERFORMANCE ───────────────────────────────────────────────────────────────
server.tool(
  'get_performance',
  'Retorna métricas de desempenho por período: score diário, hábitos concluídos, sequência atual.',
  {
    days: z.number().int().min(1).max(90).optional().describe('Número de dias (padrão: 7, máximo: 90)'),
    from: z.string().optional().describe('Data início YYYY-MM-DD'),
    to: z.string().optional().describe('Data fim YYYY-MM-DD'),
  },
  async ({ days, from, to }) => {
    const params = new URLSearchParams()
    if (days) params.set('days', String(days))
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const data = await api(`/performance?${params}`)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

// ── HABITS ────────────────────────────────────────────────────────────────────
server.tool(
  'list_habits',
  'Lista todos os hábitos ativos do usuário com status de hoje.',
  {},
  async () => {
    const data = await api('/habits')
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool(
  'create_habit',
  'Cria um novo hábito no FocusOS.',
  {
    name: z.string().min(1).max(100).describe('Nome do hábito (obrigatório)'),
    type: z.enum(['positive', 'negative']).optional().describe('Tipo: positive (construir) ou negative (eliminar). Padrão: positive'),
    time: z.string().optional().describe('Horário ideal no formato HH:MM, ex: "07:30"'),
    emoji: z.string().optional().describe('Emoji representativo, ex: "💧"'),
    color: z.string().optional().describe('Cor hex, ex: "#0A84FF"'),
    recurrence: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().min(1).optional(),
    }).optional().describe('Recorrência. Padrão: diário'),
  },
  async (args) => {
    const data = await api('/habits', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: `✅ Hábito criado!\n${JSON.stringify(data, null, 2)}` }] }
  }
)

// ── EVENTS ────────────────────────────────────────────────────────────────────
server.tool(
  'list_events',
  'Lista compromissos/eventos da agenda, opcionalmente filtrado por período.',
  {
    from: z.string().optional().describe('Data início YYYY-MM-DD (padrão: hoje)'),
    to: z.string().optional().describe('Data fim YYYY-MM-DD'),
  },
  async ({ from, to }) => {
    const params = new URLSearchParams()
    const today = new Date().toISOString().slice(0, 10)
    params.set('from', from || today)
    if (to) params.set('to', to)
    const data = await api(`/events?${params}`)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool(
  'create_event',
  'Cria um novo compromisso/evento na agenda do FocusOS.',
  {
    title: z.string().min(1).max(120).describe('Título do compromisso (obrigatório)'),
    date: z.string().describe('Data no formato YYYY-MM-DD (obrigatório)'),
    time: z.string().optional().describe('Horário HH:MM, ex: "14:30"'),
    type: z.enum(['meeting', 'birthday', 'event', 'task', 'other']).optional().describe('Tipo do compromisso'),
    description: z.string().optional().describe('Descrição ou observações'),
    emoji: z.string().optional().describe('Emoji, ex: "📅"'),
  },
  async (args) => {
    const data = await api('/events', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: `✅ Compromisso criado!\n${JSON.stringify(data, null, 2)}` }] }
  }
)

// ── TASKS ─────────────────────────────────────────────────────────────────────
server.tool(
  'list_tasks',
  'Lista tarefas do FocusOS, opcionalmente filtrado por status.',
  {
    status: z.enum(['todo', 'in_progress', 'done']).optional().describe('Filtro de status (padrão: todas pendentes)'),
  },
  async ({ status }) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const data = await api(`/tasks?${params}`)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool(
  'create_task',
  'Cria uma nova tarefa no FocusOS.',
  {
    title: z.string().min(1).max(200).describe('Título da tarefa (obrigatório)'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Prioridade (padrão: medium)'),
    due_date: z.string().optional().describe('Data limite YYYY-MM-DD'),
    due_time: z.string().optional().describe('Horário limite HH:MM'),
  },
  async (args) => {
    const data = await api('/tasks', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: `✅ Tarefa criada!\n${JSON.stringify(data, null, 2)}` }] }
  }
)

// ── GOALS ─────────────────────────────────────────────────────────────────────
server.tool(
  'list_goals',
  'Lista metas ativas do FocusOS com progresso atual.',
  {
    status: z.enum(['active', 'completed', 'paused']).optional().describe('Status das metas (padrão: active)'),
  },
  async ({ status }) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const data = await api(`/goals?${params}`)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool(
  'create_goal',
  'Cria uma nova meta no FocusOS.',
  {
    title: z.string().min(1).max(120).describe('Título da meta (obrigatório)'),
    target_value: z.number().describe('Valor alvo numérico, ex: 100 (obrigatório)'),
    current_value: z.number().optional().describe('Progresso atual (padrão: 0)'),
    unit: z.string().optional().describe('Unidade de medida, ex: "km", "livros", "%"'),
    start_date: z.string().optional().describe('Data início YYYY-MM-DD (padrão: hoje)'),
    end_date: z.string().optional().describe('Data limite YYYY-MM-DD'),
    emoji: z.string().optional().describe('Emoji representativo, ex: "🎯"'),
  },
  async (args) => {
    const data = await api('/goals', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: `✅ Meta criada!\n${JSON.stringify(data, null, 2)}` }] }
  }
)

// ── Start ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write('✅ FocusOS MCP Server rodando via stdio\n')
