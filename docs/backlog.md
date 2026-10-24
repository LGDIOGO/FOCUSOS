# Backlog

Mantido pelo `gerente-produto`. Máx. 15 itens abertos. Tamanho: P/M/G. Ordem = prioridade.
`[BLOQUEADO: Diogo]` = depende de credencial, console de terceiros ou decisão dele.
`[INVESTIGAR]` = precisa de auditoria de desempenho (somente leitura, com medição) antes de virar tarefa de código.

**Diretriz do Diogo (2026-10-23):** o app está em desenvolvimento/melhoria, NÃO em lançamento público. Foco atual: FUNCIONAMENTO e UI/UX (mobile vertical, iPad, desktop, PWA). Tudo que é vendabilidade/lançamento está em "Adiados". As fatias F1-F5 vêm da auditoria de UX e ficam no topo, nesta ordem. F1-F3 estão feitas (ver "Feitos na develop").

## Abertos (15)

1. **F4 Legibilidade e toque** — M. Mínimo 12px (cerca de 417 usos de `text-[8-11px]`, contar com `grep` antes), contraste (cerca de 357 usos de `text-white/20-40` para tokens, mínimo /60), alvos 44px, ações sem depender de hover (agenda, metas, finanças, notificações), `aria-label` e foco visível. Inclui contraste de `AccountDataSection`, juntar "Zona de Perigo" com a seção de conta e "Voltar" com `history.back` em `LegalShell`. Ordem: MobileNav, modais, Agenda, Hábitos, resto. (Modais já usam o `Modal` base; resta o item 13.)
   - **Critério de pronto (por etapa):** `grep -c` dos padrões cai a zero nos arquivos da etapa; ações de editar/excluir visíveis em toque (sem `group-hover` obrigatório); botões só-ícone têm `aria-label`; tsc 0 e testes verdes. Contagem total antes/depois registrada no PR.
2. **F5 Estados e desempenho de UI** — M. `EmptyState` e erro padrão (inclui auditoria do primeiro uso com conta nova: Resumo, Hábitos, Trabalho, e verificar o auto-seed, nunca verificado de ponta a ponta); HabitsMatrix no mobile (7-14 dias, células maiores); `next/dynamic` no SettingsModal; menos `backdrop-blur` no mobile; `content-visibility` nas seções abaixo da dobra.
   - **Critério de pronto:** (a) componente `EmptyState` usado em Resumo, Hábitos e Trabalho; (b) HabitsMatrix em 390px mostra no máximo 14 dias com células >=32px, sem rolagem horizontal obrigatória `[verificar]`; (c) SettingsModal fora do chunk inicial (First Load JS da rota antes/depois com `next build`); (d) tsc 0 e testes verdes.
3. **Validação visual de F1-F3 em celular e iPad** — M. Claude não vê telas logadas: o Diogo confere no preview da `develop` (390x844, 390x667, 768x1024, 1024-1279 e >=1280px) e no PWA instalado. Cobre: nav inferior e sheet "Mais", Modal com Salvar visível, ESC em camadas, CategoryPicker. Itens que não foram verificados: iOS real, PWA instalado. Recomendado antes do merge do PR #5.
4. **Botão "Cancelar" do formulário de criar categoria não fecha quando não há nenhuma categoria** — P. Reportado; não reproduzido em teste ainda. Pronto quando: reproduzido em teste (ou no preview), corrigido e entrada em `bugs-corrigidos.md`.
5. **Extrair a regra "só hoje altera a ofensiva" do `useHabits` para função pura e testar** — M. Bug ocorreu 3 vezes (status é por data, `{id}_{yyyy-MM-dd}`).
   - **Critério de pronto:** (a) função pura em `lib/utils/streak.ts` sem import de Firebase/React; (b) testes `REGRESSÃO:` (passada não altera; futura não altera; hoje incrementa; desmarcar hoje decrementa; passada e depois hoje não duplica; virada de dia em fuso local; hábito que não ocorre hoje via `occursOn`); (c) testes falham sem a função; (d) `useHabits` sem lógica inline de ofensiva; (e) tsc 0 e `npm test` verde; (f) entrada em `docs/bugs-corrigidos.md`; (g) dev declara o que não verificou (conta logada). **Áreas:** `lib/hooks/useHabits.ts`, `lib/utils/recurrence.ts`. **Riscos:** mudar o cálculo ao extrair (preservar, depois corrigir); CRLF. **Agentes:** qa-testes, dev-features, revisor-codigo.
6. **[BUG] `/v1/goals` GET: `where(status)` + `orderBy(created_at)` exige índice composto** — P. Ordenar no cliente como em `/v1/events`. Pronto quando: teste `REGRESSÃO:` da rota sem `orderBy` no Firestore; verificar à mão se hoje devolve erro `[verificar]`.
7. **Extrair o carry-over (arraste) do Trabalho para função pura e testar** — M. Janela de 60 dias; em recorrentes só a ocorrência mais recente em aberto. Pronto quando: função em `lib/utils/` + testes `REGRESSÃO:` (limite de 60 dias, série recorrente, concluído não arrasta, status por data) e o hook usa a função.
8. **Testes da conversão de ciclos de Finanças para mensal** — P. Semanal/quinzenal/anual; o bug de somar valor de face já ocorreu. Pronto quando: função pura com testes por ciclo e um caso "valor de face somado" que falharia no código antigo.
9. **[INVESTIGAR] Leituras excessivas do Firestore: listeners duplicados e leituras por tela** — M. Inventariar cada `onSnapshot`/`getDocs` em `lib/hooks/*` e componentes, quem monta onde, e contar leituras ao abrir cada tela (Console do Firebase > Uso, ou contador temporário no preview de dev, nunca em produção). Saída: tabela tela x listeners x leituras e itens de correção. "Verificar" até medir.
10. **Endurecer exclusão de conta: reautenticação e Storage** — M. (a) Só apagar com login recente (`auth_time`, proposta 5 min; 401 pedindo novo login; avaliar `revokeRefreshTokens`). (b) Sem `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `lib/server/accountAdmin.ts` só avisa: deve falhar com 500 e não chamar `deleteUser`. Pronto quando: testes `REGRESSÃO:` em `lib/server/__tests__/account.test.ts` para os dois casos. Dado irreversível.
11. **[BLOQUEADO: Diogo] Pacote de ações pendentes dele** — P. Detalhes em `docs/pendencias.md`: `FIREBASE_PRIVATE_KEY` na Vercel; rotação da chave de serviço antiga e do refresh token OAuth; chave de dev no Preview; Storage e `storage.rules`; verificar à mão que gravar `is_paid: true` falha; CSP Report-Only; remover fallbacks de `lib/firebase/config.ts`; variável de cifra e criptografia do `refresh_token` do Google. Claude só volta quando ele liberar.
12. **Ordenar categorias também em Configurações** — P. `SettingsModal` tem gestão própria de categorias, sem ordenar. Pronto quando: usa `sortCategories`/`moveCategory` (ou reaproveita `CategoryManagerSheet`) e o `order` é gravado do mesmo jeito.
13. **Migrar GoalModal e WorkItemModal de `forceDark` para tokens (F4)** — P. Hoje usam `DARK_TOKENS` fixos (`components/ui/Modal.tsx`) para o CategoryPicker/sheet ficar escuro; é provisório (ver `decisoes.md`). Pronto quando: `grep forceDark` vazio e o tema claro testado no preview.
14. **Animação de saída do Modal não roda** — P. `Modal` tem `exit` no framer-motion, mas os chamadores (`HabitModal`, `GoalModal`, `AgendaModal`, `TaskModal`) renderizam `<Modal>` sem `AnimatePresence`, então a saída não roda. Pronto quando: a saída anima nos modais migrados, sem quebrar ESC nem o fechamento por backdrop.
15. **Teste de integração do `useReorderCategories`** — P. A lógica (`sortCategories`, `moveCategory`) já é testada; falta o hook (`writeBatch` com só os ids que mudaram e invalidação de `['categories']`). Só vale com infra de mock do Firestore (ver `testes.md`); se não houver, declarar como lacuna.

## Feitos na develop, aguardando PR/merge (não contam como abertos)
- **F1 Shell responsivo, F2 Modal base, F3 CategoryPicker unificado** (PR #5, branch `develop`; commits `62cf975` a `c3d8081`). Testes unitários de lógica pura; **verificação visual pendente** (item 3). Detalhes em `modulos.md` (Navegação, Modal base, Categorias).
- Falha fechada em `_auth.ts` (A1); proteção de `app/api/ai/*` (A4); `/v1` e `/mcp` com rate limit e origem fixa (A6); remoção de `fix-rules` e `debug/*`, erros genéricos, headers com CSP Report-Only (A2/A7 parte de código); regras do Firestore publicadas em produção (2026-10-23); pagamentos Mercado Pago com token, preço no servidor e webhook validado (código pronto); LGPD fatia 8a (`/api/account/export`, `/api/account/delete`, `AccountDataSection`, `/privacidade`, `/termos`), **não verificada no navegador** (exige Admin SDK no Preview).
- Auditoria complementar de segurança (escolhida em 2026-10-22): estado de conclusão `[verificar]` no `git log` e em `decisoes.md`.

## Adiados (registrados, sem prioridade; por diretriz de 2026-10-23 ou excedente do limite de 15)
- Carregamento do Resumo (tempo até conteúdo útil): DevTools com throttling de celular, cascata de hooks — M. `[INVESTIGAR]`. Depende do item 9. (Excedente, 2026-10-23.)
- Tamanho do bundle e imports pesados (`next build`, First Load JS por rota, candidatos a `dynamic import`) — M. `[INVESTIGAR]`. Liga com F5 e com CVEs. (Excedente, 2026-10-23.)
- Re-renders nos dashboards (Resumo, Hábitos, Trabalho, Finanças) com React DevTools Profiler — M. `[INVESTIGAR]`. Só depois de medir; `useMemo`/`memo` não são tarefa antes disso. (Excedente, 2026-10-23.)
- Schema completo de validação do `/api/v1/*` (tipos, tamanhos de `description`, `recurrence`, `color`, `time`) — M. A auditoria só validou datas, números e ids. (Excedente.)
- Dependências com CVE alto/crítico no `npm audit` (mercadopago/uuid, vite, ws, websocket-driver etc.) — M. `next` 14.2.35 (último 14.x); correção do crítico só na 16.x (major, item próprio). Contagem: 2 baixa, 17 moderada, 30 alta, 4 crítica. Voltar ao topo se houver vaga: segurança. (Excedente.)
- Tela de assinatura/checkout (sem chamador no app) e webhook no painel do Mercado Pago — G. `[BLOQUEADO: Diogo]` parte do console.
- Renovar Access Token e Client Secret do Mercado Pago (apareceram em prints) — P. `[BLOQUEADO: Diogo]`. Segurança: fazer quando ele puder.
- LGPD 8b: aviso de subprocessadores de IA (Groq/Gemini) nas páginas e no chat — P.
- LGPD 8c / `docs/comercial.md` (`/auditoria comercial`), planos e preços — M.
- Revisão jurídica de `/privacidade` e `/termos` (faixa "Rascunho"), prazo de resposta a titulares, retenção de `mp_payments` — `[BLOQUEADO: Diogo]`.
- Título "Rascunho" e índice nas páginas legais (polimento).
- Revogar o token no Google ao desconectar a agenda e ao excluir a conta — P.
- Rotacionar o `client_secret` literal do commit 9e0382b — P. `[BLOQUEADO: Diogo]`; client público do Firebase CLI (baixo risco).
- Testes da cascata de modelos de IA (`lib/ai/models.ts`) com cliente simulado — M.
- Testes de UI com Playwright (login, criar hábito, marcar dia) — G.
- Emulador do Firestore para testar hooks e regras — G.
- Terceiro ambiente (staging) — M.

## Ideias (sem prioridade)
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.

## Concluídos
Ver `docs/bugs-corrigidos.md` e o histórico do git.

## F4 parcial (branch feat/legibilidade-toque)
- Feito: `text-[8-11px]` -> `text-xs` (exceto HabitsMatrix, HabitsWeekGrid e acompanhamento, microtexto de grade); `text-white/20-40` -> `--text-muted` (telas sempre escuras: `text-white/60`); `--text-muted` subiu para 0.5 (escuro) e 0.55 (claro) para atingir ~4.5:1; ações de excluir visíveis no toque com 44px e `aria-label` (agenda, metas, hábitos, finanças, notificações, notas); foco visível global em `button`/`a` (`globals.css`).
- Fica: `forceDark` de GoalModal/WorkItemModal (conteúdo usa cores fixas; migrar exige revisão tela a tela); `uppercase tracking-widest` em rótulos longos; alvos <44px restantes (chips, ícones de cabeçalho); `text-[var(--text-muted)]/N` (14 usos, classe inválida no Tailwind, sem efeito); overlays de hover do avatar no SettingsModal; verificação visual de estouro de layout com fonte maior.
