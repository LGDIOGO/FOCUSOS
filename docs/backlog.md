# Backlog

Mantido pelo `gerente-produto`. Máx. 15 itens abertos. Tamanho: P/M/G. Ordem = prioridade.
`[BLOQUEADO: Diogo]` = depende de credencial, console de terceiros ou decisão dele.
`[INVESTIGAR]` = precisa de auditoria de desempenho (somente leitura, com medição) antes de virar tarefa de código.

**Diretriz do Diogo (2026-10-23):** o app está em desenvolvimento/melhoria, NÃO em lançamento público. Foco atual: FUNCIONAMENTO e UI/UX (mobile vertical, iPad, desktop, PWA). Tudo que é vendabilidade/lançamento está em "Adiados". As fatias F1-F5 vêm da auditoria de UX e ficam no topo, nesta ordem.

## Abertos (15)

1. **[ESCOLHIDO PARA O PRÓXIMO CICLO] F1 Shell responsivo** — G. Hoje Configurações e Sair só existem na Sidebar (`hidden lg:flex`): inacessíveis no celular e no iPad retrato.
   - **Comportamento esperado:** MobileNav com 4 destinos + "Mais" (bottom sheet com os demais destinos, Configurações, Sair e Modo Foco). Alvos >=44px e rótulo >=11px. Tokens CSS `--nav-h` e safe-area (`env(safe-area-inset-bottom)`). `dvh` no lugar de `vh`/`h-screen` em Sidebar, NotificationsCenter, SettingsModal, WorkItemModal. Sidebar colapsada (só ícones) entre `lg` e `xl`. `main` com scroll próprio no desktop. Aproveitar para: ligar ou remover o botão "Resetar Sistema" sem `onClick` em `SettingsModal.tsx` (confirmação dentro da UI, sem `window.confirm`).
   - **Critério de pronto (verificável):** (a) em 390x844 e 768x1024 (retrato) é possível abrir Configurações, Sair e Modo Foco em até 2 toques a partir de qualquer tela; (b) `grep` não acha `h-screen`/`100vh` nos 4 componentes listados; (c) alvos do MobileNav medem >=44px e rótulos >=11px (conferir no DevTools); (d) em 1024-1279px a sidebar mostra só ícones e em >=1280px completa; (e) no PWA/iPhone o nav não fica sob a barra home (safe-area); (f) conteúdo da última tela não fica atrás do nav (padding com `--nav-h`); (g) `npx tsc --noEmit` 0 erros e `npm test` verde; (h) dev declara o que não verificou (iOS real, PWA instalado) e verifica por `app/zzpreview` em 3 larguras (apagar depois).
   - **Áreas:** `components/layout/*` (Sidebar, MobileNav), `app/globals.css` (tokens), `NotificationsCenter`, `SettingsModal`, `WorkItemModal`. **Riscos:** `fixed` + `dvh` no Safari antigo (fallback `vh`); sobreposição com banners do `FirestoreDiagnostic` (fechar e não cobrir o relógio entram aqui como P: botão fechar + respeitar `--nav-h`). **Agentes:** ux-ui (desenho/preview), dev-features (código), revisor-codigo (diff). Teste unitário só se houver lógica pura.
2. **F2 Modal/BottomSheet base** — G. Cada modal tem sua própria estrutura; rodapé com Salvar some em tela pequena.
   - **Comportamento esperado:** componente em `components/ui` com esqueleto flex (cabeçalho, corpo rolável, rodapé fixo com Salvar), altura 92dvh, safe-area, ESC fecha, trava de scroll do fundo, `role="dialog"` e `aria-modal`. Migrar HabitModal, AgendaModal, TaskModal, GoalModal, WorkItemModal. EmojiPicker como sheet no mobile. Modais de CPF/Paywall com rolagem.
   - **Critério de pronto:** (a) os 5 modais usam o componente base (`grep` mostra o import); (b) em 390x667 o botão Salvar fica visível sem rolar a página e o corpo rola; (c) ESC fecha e o fundo não rola; (d) teste de unidade/RTL do componente se a infra permitir `[verificar]`, senão declarar; (e) tsc 0 e `npm test` verde. **Depende de F1** (dvh/tokens). **Agentes:** ux-ui, dev-features, revisor-codigo.
3. **F3 CategoryPicker unificado** — M. Chips roláveis, "+ Nova" inline, editar/excluir/ordenar em sheet com confirmação na UI; mesmo componente em Hábito, Tarefa, Meta e Agenda. OBS: o dev-features está corrigindo o bug "categorias criadas não aparecem" e adicionando "Gerenciar" no seletor (branch `fix/categorias`); F3 consolida e refina depois que essa branch entrar.
   - **Critério de pronto:** (a) um único componente usado nos 4 modais; (b) criar categoria inline a seleciona e ela aparece nos demais modais; (c) excluir pede confirmação dentro da UI; (d) lógica de ordenar/mesclar em função pura testada (`lib/utils/categories.ts` já existe na branch); (e) tsc 0 e testes verdes. **Depende de** `fix/categorias` e F2.
   - **Estado (feat/category-picker):** implementado em Hábito, Agenda e Meta (Tarefa não tem categoria); `order` opcional em `categories` (docs sem `order` vão para o fim). Não verificado em tela; Configurações segue com gestão própria (sem ordenar).
4. **F4 Legibilidade e toque** — M. Mínimo 12px (cerca de 417 usos de `text-[8-11px]`, contar com `grep` antes), contraste (cerca de 357 usos de `text-white/20-40` para tokens, mínimo /60), alvos 44px, ações sem depender de hover (agenda, metas, finanças, notificações), `aria-label` e foco visível. Inclui contraste de `AccountDataSection`, juntar "Zona de Perigo" com a seção de conta e "Voltar" com `history.back` em `LegalShell`. Ordem: MobileNav, modais, Agenda, Hábitos, resto.
   - **Critério de pronto (por etapa):** `grep -c` dos padrões cai a zero nos arquivos da etapa; ações de editar/excluir visíveis em toque (sem `group-hover` obrigatório); botões só-ícone têm `aria-label`; tsc 0 e testes verdes. Contagem total antes/depois registrada no PR.
5. **F5 Estados e desempenho de UI** — M. `EmptyState` e erro padrão (inclui auditoria do primeiro uso com conta nova: Resumo, Hábitos, Trabalho, e verificar o auto-seed, nunca verificado de ponta a ponta); HabitsMatrix no mobile (7-14 dias, células maiores); `next/dynamic` no SettingsModal; menos `backdrop-blur` no mobile; `content-visibility` nas seções abaixo da dobra.
   - **Critério de pronto:** (a) componente `EmptyState` usado em Resumo, Hábitos e Trabalho; (b) HabitsMatrix em 390px mostra no máximo 14 dias com células >=32px, sem rolagem horizontal obrigatória `[verificar]`; (c) SettingsModal fora do chunk inicial (First Load JS da rota antes/depois com `next build`); (d) tsc 0 e testes verdes.
6. **Extrair a regra "só hoje altera a ofensiva" do `useHabits` para função pura e testar** — M. Bug ocorreu 3 vezes (status é por data, `{id}_{yyyy-MM-dd}`).
   - **Critério de pronto:** (a) função pura em `lib/utils/streak.ts` sem import de Firebase/React; (b) testes `REGRESSÃO:` (passada não altera; futura não altera; hoje incrementa; desmarcar hoje decrementa; passada e depois hoje não duplica; virada de dia em fuso local; hábito que não ocorre hoje via `occursOn`); (c) testes falham sem a função; (d) `useHabits` sem lógica inline de ofensiva; (e) tsc 0 e `npm test` verde; (f) entrada em `docs/bugs-corrigidos.md`; (g) dev declara o que não verificou (conta logada). **Áreas:** `lib/hooks/useHabits.ts`, `lib/utils/recurrence.ts`. **Riscos:** mudar o cálculo ao extrair (preservar, depois corrigir); CRLF. **Agentes:** qa-testes, dev-features, revisor-codigo.
7. **[BUG] `/v1/goals` GET: `where(status)` + `orderBy(created_at)` exige índice composto** — P. Ordenar no cliente como em `/v1/events`. Pronto quando: teste `REGRESSÃO:` da rota sem `orderBy` no Firestore; verificar à mão se hoje devolve erro `[verificar]`.
8. **Extrair o carry-over (arraste) do Trabalho para função pura e testar** — M. Janela de 60 dias; em recorrentes só a ocorrência mais recente em aberto. Pronto quando: função em `lib/utils/` + testes `REGRESSÃO:` (limite de 60 dias, série recorrente, concluído não arrasta, status por data) e o hook usa a função.
9. **Testes da conversão de ciclos de Finanças para mensal** — P. Semanal/quinzenal/anual; o bug de somar valor de face já ocorreu. Pronto quando: função pura com testes por ciclo e um caso "valor de face somado" que falharia no código antigo.
10. **[INVESTIGAR] Leituras excessivas do Firestore: listeners duplicados e leituras por tela** — M. Inventariar cada `onSnapshot`/`getDocs` em `lib/hooks/*` e componentes, quem monta onde, e contar leituras ao abrir cada tela (Console do Firebase > Uso, ou contador temporário no preview de dev, nunca em produção). Saída: tabela tela x listeners x leituras e itens de correção. "Verificar" até medir.
11. **[INVESTIGAR] Carregamento do Resumo (tempo até conteúdo útil)** — M. DevTools (Performance/Network, throttling de celular) no preview: ordem das requisições, o que bloqueia a primeira pintura, cascata de hooks. Saída: medições antes/depois e causas ranqueadas. Depende do item 10.
12. **[INVESTIGAR] Tamanho do bundle e imports pesados** — M. `next build` e relatório por rota (`@next/bundle-analyzer` só com aprovação do Diogo); imports de biblioteca inteira, libs de servidor vazando para o cliente, candidatos a `dynamic import`. Saída: First Load JS por rota e lista de cortes `[verificar]`. Liga com F5 e com CVEs (Adiados).
13. **[INVESTIGAR] Re-renders nos dashboards (Resumo, Hábitos, Trabalho, Finanças)** — M. React DevTools Profiler no preview com dados sintéticos (`app/zzpreview`, apagar depois): re-render sem mudança de props, listas sem `key`/memo, contexto largo, `occursOn` em loop. Saída: hotspots com evidência; só depois tarefas de `useMemo`/`memo`.
14. **Endurecer exclusão de conta: reautenticação e Storage** — M. (a) Só apagar com login recente (`auth_time`, proposta 5 min; 401 pedindo novo login; avaliar `revokeRefreshTokens`). (b) Sem `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `lib/server/accountAdmin.ts` só avisa: deve falhar com 500 e não chamar `deleteUser`. Pronto quando: testes `REGRESSÃO:` em `lib/server/__tests__/account.test.ts` para os dois casos. Dado irreversível.
15. **[BLOQUEADO: Diogo] Pacote de ações pendentes dele** — P. Detalhes em `docs/pendencias.md`: `FIREBASE_PRIVATE_KEY` na Vercel; rotação da chave de serviço antiga e do refresh token OAuth; chave de dev no Preview; Storage e `storage.rules`; verificar à mão que gravar `is_paid: true` falha; CSP Report-Only; remover fallbacks de `lib/firebase/config.ts`; variável de cifra e criptografia do `refresh_token` do Google. Claude só volta quando ele liberar.

## Feitos na develop, aguardando PR/merge (não contam como abertos)
- Falha fechada em `_auth.ts` (A1); proteção de `app/api/ai/*` (A4); `/v1` e `/mcp` com rate limit e origem fixa (A6); remoção de `fix-rules` e `debug/*`, erros genéricos, headers com CSP Report-Only (A2/A7 parte de código); regras do Firestore publicadas em produção (2026-10-23); pagamentos Mercado Pago com token, preço no servidor e webhook validado (código pronto); LGPD fatia 8a (`/api/account/export`, `/api/account/delete`, `AccountDataSection`, `/privacidade`, `/termos`), **não verificada no navegador** (exige Admin SDK no Preview).
- Auditoria complementar de segurança (escolhida em 2026-10-22): estado de conclusão `[verificar]` no `git log` e em `decisoes.md`.

## Adiados (registrados, sem prioridade; por diretriz de 2026-10-23 ou excedente do limite de 15)
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
