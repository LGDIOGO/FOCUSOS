import { Habit, Task } from '@/types'

export type InsightType = 'tip' | 'warning' | 'pattern' | 'achievement' | 'replan'

export interface Insight {
  type: InsightType
  title: string
  body: string
}

/**
 * Simula a lógica de IA analisando o banco de dados.
 * Em produção, isso poderia chamar a rota /api/ai/insights
 */
export const generateLocalInsights = (habits: Habit[], tasks: Task[]): Insight[] => {
  const insights: Insight[] = []

  // 1. Análise de falhas em hábitos
  const failedHabits = habits.filter(h => h.status === 'failed')
  if (failedHabits.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Atenção aos Padrões',
      body: `Você registrou ${failedHabits.length} falha(s) hoje. Que tal identificar o que causou o bloqueio e ajustar o horário para amanhã?`
    })
  }

  // 2. Comemoração de Streaks
  const highStreaks = habits.filter(h => h.streak >= 7)
  if (highStreaks.length > 0) {
    insights.push({
      type: 'achievement',
      title: 'Consistência de Elite',
      body: `Parabéns! Você mantém o hábito "${highStreaks[0].name}" há ${highStreaks[0].streak} dias seguidos.`
    })
  }

  // 3. Tarefas Críticas
  const criticalPending = tasks.filter(t => t.priority === 'critical' && !t.done)
  if (criticalPending.length > 0) {
    insights.push({
      type: 'replan',
      title: 'Prioridade Absoluta',
      body: `Você ainda tem "${criticalPending[0].title}" pendente. É sua tarefa mais crítica de hoje.`
    })
  }

  // 4. Dica Geral de Produtividade
  if (insights.length < 2) {
    insights.push({
      type: 'tip',
      title: 'Dica de Ouro',
      body: 'Experimente a técnica de "Habit Stacking": vincule um hábito novo a um que você já faz automaticamente.'
    })
  }

  return insights
}
