/**
 * Princípio de Pareto (80/20) para FocusOS
 * Mensagens motivacionais discretas e variadas para encorajar o usuário a atingir 80% de conclusão.
 */

const PARETO_MESSAGES = [
  "Lembre-se: 20% das suas ações geram 80% dos seus resultados. Foque no essencial.",
  "O princípio de 80/20 diz que a consistência no topo é o que realmente transforma sua rotina.",
  "Busque os 80%. A perfeição é inimiga da execução constante.",
  "Focar nos 20% mais importantes levará você a 80% do seu objetivo. Continue firme.",
  "Sua produtividade floresce quando você domina os 80% planejados.",
  "Mantenha o Pareto em mente: 80% de conclusão é o marco da alta performance.",
  "Não se cobre pela perfeição, mas lute pelos 80% que transformam seu dia.",
  "A regra de ouro: 80% de acerto hoje garante 100% de progresso amanhã.",
  "Consistência acima de tudo. A meta é 80% de compromisso com seu eu do futuro.",
  "A disciplina de atingir 80% do planejado é o que separa o sonho da realidade."
];

export function getParetoMessage(seed?: number): string {
  const index = seed !== undefined 
    ? Math.floor(Math.abs(seed) % PARETO_MESSAGES.length)
    : Math.floor(Math.random() * PARETO_MESSAGES.length);
    
  return PARETO_MESSAGES[index];
}
