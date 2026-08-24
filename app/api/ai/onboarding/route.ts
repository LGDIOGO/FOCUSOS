import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/models'

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

━━━ HÁBITO ou COMPROMISSO? (classifique sempre assim) ━━━
HÁBITO = comportamento que a pessoa quer construir ou manter, medido por constância
  e streak. Depende só dela. Ex: academia, leitura, meditação, beber água, correr,
  evitar açúcar, dormir cedo.
COMPROMISSO (evento) = obrigação marcada, com hora e geralmente terceiros envolvidos.
  Falhar tem consequência externa, não quebra de streak. Ex: aula, terapia, consulta,
  reunião, prova, viagem, aniversário, pagar conta, vencimento.
Repetir NÃO faz virar hábito: "terapia toda quinta" é COMPROMISSO recorrente.
Se o usuário disser "compromisso", "agenda" ou "marcar", é sempre evento.
Na dúvida entre os dois, prefira evento.
Nunca duplique: cada coisa citada aparece UMA vez, em UM dos arrays.

Horários: use o que o usuário disse. Se ele não disse, escolha um plausível para a
atividade (pagamento 09:00, treino 07:00, jantar 20:00). Nunca use 00:00.

━━━ DATAS E REPETIÇÃO (REGRA CRÍTICA) ━━━
SEMPRE resolva expressões de tempo em datas ISO reais (YYYY-MM-DD) usando a DATA DE HOJE do contexto.
"amanhã", "sexta que vem", "dia 15", "todo mês", "próxima semana" → calcule a data exata. NUNCA deixe "date" vazio.

Compromisso que SE REPETE → UM único evento com "recurrence" (NÃO crie 10 eventos separados):
  "toda terça e quinta"        → {"frequency":"specific_days","days_of_week":[2,4]}
  "todo dia"                   → {"frequency":"daily","interval":1}
  "dia sim dia não"            → {"frequency":"daily","interval":2}
  "toda semana"                → {"frequency":"weekly","interval":1}
  "quinzenal / a cada 15 dias" → {"frequency":"weekly","interval":2}
  "todo mês" / "todo dia 10"   → {"frequency":"monthly","interval":1}
  "todo ano" / aniversários    → {"frequency":"yearly","interval":1}
Em recorrentes, "date" = PRÓXIMA ocorrência a partir de hoje — NUNCA uma data passada.
"todo dia 10" com hoje sendo dia 16 → use o dia 10 do MÊS QUE VEM, não o deste mês.
Datas passadas viram pendências atrasadas falsas na agenda do usuário.
Se houver prazo final ("até dezembro", "pelos próximos 3 meses"), inclua "end_date"
(YYYY-MM-DD). Sem prazo → omita "end_date".

Compromissos DIFERENTES entre si (reunião seg + dentista qua + viagem sex) → um objeto por item no array.
Mesmo compromisso em datas repetidas → UM objeto com recurrence.

AÇÕES EM ITEMS EXISTENTES (OBRIGATÓRIO quando usuário pedir editar/excluir):
Use a tag [ACTIONS] com os IDs exatos do contexto abaixo:
[ACTIONS]{"modify":[{"id":"ID_EXATO","collection":"habits","updates":{"name":"Novo Nome","time":"07:00"}}],"delete":[{"id":"ID_EXATO","collection":"habits"}]}[/ACTIONS]

Coleções válidas: "habits", "events", "goals", "tasks"
NUNCA invente IDs. Use apenas IDs listados no contexto do usuário.
Em "updates", envie SÓ os campos que mudam. Ao alterar dias de repetição, PARTA dos dias
atuais mostrados no contexto ("repete: seg,qua,sex") — "adicionar sábado" = [1,3,5,6],
nunca reescreva a semana inteira.

REGRAS TÉCNICAS JSON:
Quando sugerir itens NOVOS, inclua ao final:
[SUGGESTIONS]{"habits": [...], "events": [...], "goals": [...]}[/SUGGESTIONS]

- Hábito: "name", "type" ('positive'|'negative'), "emoji", "description", "time" (HH:MM), "recurrence": {"frequency": "daily"|"weekly"|"specific_days"|"monthly"|"yearly", "interval": número, "days_of_week": [0-6]}
- Evento: "title", "date" (YYYY-MM-DD, OBRIGATÓRIO), "time" (HH:MM), "type" ('meeting'|'birthday'|'event'|'task'|'other'), "emoji", "description", "recurrence" (opcional, mesmo formato do hábito), "end_date" (opcional, fim da série)
- Meta: "title", "target_value" (número), "unit" (ex: "vezes","km"), "emoji", "description", "color" (HEX), "priority" ('high'|'medium'), "term": "annual", "end_date": "YYYY-MM-DD"
- Dias: dom=0, seg=1, ter=2, qua=3, qui=4, sex=5, sáb=6

EXEMPLO (usuário: "toda segunda tenho academia 7h, e dia 20 tenho consulta médica"):
[SUGGESTIONS]{"events":[
{"title":"Academia","date":"2026-08-17","time":"07:00","type":"event","emoji":"🏋️","description":"Treino semanal","recurrence":{"frequency":"specific_days","days_of_week":[1],"interval":1}},
{"title":"Consulta Médica","date":"2026-08-20","time":"09:00","type":"meeting","emoji":"🩺","description":""}
]}[/SUGGESTIONS]

ESTRUTURA DA RESPOSTA:
1. Análise breve e perspicaz da situação do usuário (1-2 parágrafos max)
2. Recomendações em formato de lista quando pertinente
3. JSON [SUGGESTIONS] e/ou [ACTIONS] no final (NUNCA no meio do texto)`

export async function POST(req: NextRequest) {
  try {
    const { messages, userData } = await req.json()

    // Data de referência: sem isto a IA não consegue resolver "amanhã",
    // "sexta que vem" etc. em datas ISO reais.
    const tz = userData?.timezone || 'America/Sao_Paulo'
    const now = new Date()
    const todayISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now) // en-CA => YYYY-MM-DD
    const weekdayPT = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz, weekday: 'long',
    }).format(now)

    // Calendário pré-calculado. Modelos erram aritmética de dia-da-semana
    // ("sexta que vem" caía em sábado), então entregamos a tabela pronta
    // em vez de pedir o cálculo.
    const fmtISO = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    const fmtDay = (d: Date) =>
      new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'long' }).format(d)

    const addDays = (n: number) => new Date(now.getTime() + n * 86400000)
    const calendar = Array.from({ length: 21 }, (_, i) => {
      const d = addDays(i)
      const tag = i === 0 ? ' ← HOJE' : i === 1 ? ' ← AMANHÃ' : ''
      return `  ${fmtISO(d)} = ${fmtDay(d)}${tag}`
    }).join('\n')

    // "próxima <dia>" = a primeira ocorrência futura (nunca hoje).
    const nextWeekday: string[] = []
    for (let w = 0; w < 7; w++) {
      const target = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][w]
      for (let i = 1; i <= 7; i++) {
        const d = addDays(i)
        if (fmtDay(d) === target) { nextWeekday.push(`  próxima ${target} = ${fmtISO(d)}`); break }
      }
    }

    const dateBlock = `\n\n━━━ DATA DE REFERÊNCIA ━━━
HOJE: ${todayISO} (${weekdayPT}) | Fuso: ${tz}

CALENDÁRIO (use estas datas — NÃO calcule por conta própria):
${calendar}

ATALHOS:
${nextWeekday.join('\n')}

Para datas além de 21 dias, conte a partir de HOJE (${todayISO}).
"daqui N semanas" = HOJE + N*7 dias. "dia N" = próximo dia N no calendário.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

    // Construir bloco de contexto do usuário
    let contextBlock = ""
    if (userData) {
      // Sem a recorrência atual no contexto, o modelo reescrevia os dias do
      // zero ao editar ("adiciona sábado" virava seg-sáb).
      const describeRec = (r: any) => {
        if (!r?.frequency) return 'único'
        const n = r.interval && r.interval > 1 ? ` a cada ${r.interval}` : ''
        if (r.frequency === 'specific_days') {
          const names = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
          return `repete: ${(r.days_of_week || []).map((d: number) => names[d]).join(',')}`
        }
        return `repete: ${r.frequency}${n}`
      }

      const habitsLines = userData.habits?.map((h: any) =>
        `  [ID:${h.id}] ${h.emoji || '✨'} ${h.name} | streak:${h.streak || 0}d | tipo:${h.type || 'positive'} | horário:${h.time || '--'} | ${describeRec(h.recurrence)}`
      ).join('\n') || '  Nenhum'

      const goalsLines = userData.goals?.map((g: any) =>
        `  [ID:${g.id}] ${g.emoji || '🎯'} ${g.title} | ${g.current_value || 0}/${g.target_value} ${g.unit || ''} | prioridade:${g.priority || 'medium'}`
      ).join('\n') || '  Nenhuma'

      const tasksLines = userData.tasks?.slice(0, 10).map((t: any) =>
        `  [ID:${t.id}] ${t.title} | status:${t.status || 'pending'}`
      ).join('\n') || '  Nenhuma'

      const eventsLines = userData.events?.slice(0, 20).map((e: any) =>
        `  [ID:${e.id}] ${e.emoji || '📅'} ${e.title} | ${e.date} ${e.time || ''} | ${describeRec(e.recurrence)}${e.end_date ? ` | até ${e.end_date}` : ''}`
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

    const FINAL_SYSTEM_PROMPT = SYSTEM_PROMPT + dateBlock + contextBlock

    // O histórico inteiro segue junto: sem ele a IA perde o fio da conversa
    // (o fallback antigo mandava só a última mensagem do usuário).
    try {
      const { text, provider, model } = await generateText({
        system: FINAL_SYSTEM_PROMPT,
        messages: messages.map((m: any) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: 0.7,
      })
      return NextResponse.json({ message: text, provider, model })
    } catch (aiErr: any) {
      console.error('Onboarding AI failure:', aiErr.message)
      return NextResponse.json({
        error: 'Falha em todos os provedores de IA',
        details: aiErr.message,
      }, { status: 503 })
    }

  } catch (err: unknown) {
    const error = err as Error
    console.error('Onboarding API Error:', error.message)
    return NextResponse.json({ 
      error: 'Falha interna na API', 
      details: error.message
    }, { status: 500 })
  }
}
