# Backlog

Mantido pelo `gerente-produto`. Máx. 15 itens abertos. Tamanho: P/M/G. Ordem = prioridade.
`[BLOQUEADO: Diogo]` = depende de credencial, console de terceiros ou decisão dele.
`[INVESTIGAR]` = precisa de auditoria de desempenho (somente leitura, com medição) antes de virar tarefa de código.

**Diretriz do Diogo (2026-10-23):** o app está em desenvolvimento/melhoria, NÃO em lançamento público. Foco: FUNCIONAMENTO e OTIMIZAÇÃO. Tudo que é vendabilidade/lançamento está em "Adiados" (registrado, sem prioridade). Prioridade: bug conhecido > dado/produção em risco > regra crítica testada > desempenho > UX > polimento.

## Abertos (15)

1. **[ESCOLHIDO PARA O PRÓXIMO CICLO] Extrair a regra "só hoje altera a ofensiva" do `useHabits` para função pura e testar** — M. Bug já ocorreu 3 vezes (status é por data, `{id}_{yyyy-MM-dd}`; marcar outro dia nunca altera hoje).
   - **Problema:** a regra vive dentro do hook, sem teste; qualquer edição no hook pode reintroduzir a regressão. Ofensiva errada quebra a confiança no app de hábitos.
   - **Comportamento esperado:** função pura em `lib/utils/` (ex.: `streak.ts`) decide, dados `(streakAtual, dataMarcada, hoje, novoStatus)`, se e como a ofensiva muda. Só `dataMarcada == hoje` altera; passada/futura não mexe. `useHabits` apenas chama a função. Sem novo motor de recorrência: reutilizar `occursOn` de `lib/utils/recurrence.ts` onde a regra precisar saber se o hábito ocorre no dia.
   - **Critério de pronto (verificável):** (a) função pura exportada em `lib/utils/` sem import de Firebase/React; (b) testes `REGRESSÃO:` cobrindo no mínimo: marcar data passada não altera a ofensiva; marcar data futura não altera; marcar hoje incrementa; desmarcar hoje decrementa; marcar passada e depois hoje não duplica; virada de dia (fuso local); hábito que não ocorre hoje (via `occursOn`); (c) rodar os testes novos contra a versão antiga do hook (ou revertendo a chamada) e comprovar que falham sem a função; (d) `grep` mostra que `useHabits` não tem mais a lógica inline de ofensiva; (e) `npx tsc --noEmit` 0 erros e `npm test` verde; (f) entrada nova em `docs/bugs-corrigidos.md` (blindagem) e remoção do item de "Próximos testes"; (g) o dev declara o que não verificou (comportamento real no navegador com conta logada; pedir ao Diogo marcar um dia passado no preview).
   - **Áreas prováveis:** `lib/hooks/useHabits.ts`, `lib/utils/recurrence.ts`, novo `lib/utils/streak.ts` e seu teste em `lib/utils/__tests__/`. **Riscos:** mudar o cálculo existente sem querer (extrair preservando o comportamento atual, só então corrigir); fuso/data local vs UTC; CRLF (usar Edit com trecho exato). **Agentes:** qa-testes (escreve os testes primeiro e extrai), dev-features (ajusta o hook), revisor-codigo (diff). Sem seguranca/ux.
2. **[BUG] `/v1/goals` GET: `where(status)` + `orderBy(created_at)` exige índice composto** — P. Ordenar no cliente como em `/v1/events` (um único `where('user_id',...)` + filtro/ordenação no cliente). Pronto quando: teste `REGRESSÃO:` da rota sem `orderBy` no Firestore; verificar à mão se hoje devolve erro (índice ausente) `[verificar]`.
3. **Extrair o carry-over (arraste) do Trabalho para função pura e testar** — M. Janela de 60 dias; em recorrentes só a ocorrência mais recente em aberto. Pronto quando: função em `lib/utils/` + testes `REGRESSÃO:` (limite de 60 dias, série recorrente, item concluído não arrasta, status por data) e o hook usa a função.
4. **Testes da conversão de ciclos de Finanças para mensal** — P. Semanal/quinzenal/anual; o bug de somar valor de face já ocorreu. Pronto quando: função pura (extrair se preciso) com testes por ciclo e um caso "valor de face somado" que falharia no código antigo.
5. **[INVESTIGAR] Leituras excessivas do Firestore: listeners duplicados e leituras por tela** — M. Hipótese (a confirmar): vários hooks abrem `onSnapshot` na mesma coleção por tela ou remontam ao navegar. Auditoria: inventariar cada `onSnapshot`/`getDocs` em `lib/hooks/*` e componentes, quem monta onde, e contar leituras ao abrir cada tela (Console do Firebase > Uso, ou contador temporário no preview de dev, nunca em produção). Saída: tabela tela x listeners x leituras e itens de correção com tamanho. Não inventar números: "verificar" até medir.
6. **[INVESTIGAR] Carregamento do Resumo (tempo até conteúdo útil)** — M. Medir com DevTools (Performance/Network, throttling de celular) no preview: ordem das requisições, o que bloqueia a primeira pintura, cascata de hooks, skeletons. Saída: medições antes/depois e causas ranqueadas. Depende do item 5 (mesmos listeners).
7. **[INVESTIGAR] Tamanho do bundle e imports pesados** — M. Rodar `next build` e ler o relatório de tamanho por rota (e `@next/bundle-analyzer` se o Diogo aprovar adicionar a devDependency); procurar imports de biblioteca inteira (ícones, datas, Firebase, `mercadopago`/libs de servidor vazando para o cliente), candidatos a `dynamic import` (modais, gráficos, editor). Saída: First Load JS por rota e lista de cortes com ganho estimado `[verificar]`.
8. **[INVESTIGAR] Re-renders nos dashboards (Resumo, Hábitos, Trabalho, Finanças)** — M. Medir com React DevTools Profiler no preview com dados sintéticos (`app/zzpreview`, apagar depois): componentes que re-renderizam sem mudança de props, listas sem `key`/memo, contexto largo, cálculos pesados no render (`occursOn` em loop). Saída: lista de hotspots com evidência; só depois, tarefas de `useMemo`/`memo`/divisão de contexto.
9. **Auditoria de UX do primeiro uso (conta nova)**: estados vazios de Resumo, Hábitos, Trabalho — M. Rodar `/auditoria ux`. Verificar auto-seed em conta nova (nunca verificado de ponta a ponta).
10. **UX P2/P3 do fluxo de conta** — P. Contraste `text-white/40` em `AccountDataSection`; juntar "Zona de Perigo" com a seção de conta; botão "Resetar Sistema" sem `onClick` em `SettingsModal.tsx` (**bug visível**: remover ou ligar com confirmação dentro da UI, sem `window.confirm`); "Voltar" com `history.back` em `LegalShell`.
11. **Banners de erro do `FirestoreDiagnostic`: botão de fechar e não cobrir o relógio** — P.
12. **Endurecer exclusão de conta: reautenticação e Storage** — M. (a) Só apagar com login recente (`auth_time` do ID token, proposta 5 min; 401 pedindo novo login; avaliar `revokeRefreshTokens`). (b) Sem `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `lib/server/accountAdmin.ts` só avisa e apaga a conta sem os arquivos: deve falhar com 500 e não chamar `deleteUser`. Pronto quando: testes `REGRESSÃO:` em `lib/server/__tests__/account.test.ts` para os dois casos. Dado irreversível: por isso entra acima de UX nova se houver vaga.
13. **Schema completo de validação do `/api/v1/*`** (tipos, tamanhos de `description`, `recurrence`, `color`, `time`) — M. A auditoria só validou datas, números e ids.
14. **Dependências com CVE alto/crítico no `npm audit`** (mercadopago/uuid, vite, ws, websocket-driver etc.) — M. `next` está na 14.2.35 (último 14.x); correção do crítico só na 16.x (major, item próprio). Contagem atual: 2 baixa, 17 moderada, 30 alta, 4 crítica. Tratar por pacote, `tsc` e testes verdes. Também reduz bundle se sair dependência (liga ao item 7).
15. **[BLOQUEADO: Diogo] Pacote de ações pendentes dele** — P. Detalhes em `docs/pendencias.md`: `FIREBASE_PRIVATE_KEY` na Vercel (Calendar em produção); rotação da chave de serviço antiga e do refresh token OAuth; chave de serviço de dev no Preview; ativar Storage e publicar `storage.rules`; verificar à mão que gravar `is_paid: true` falha; conferir violações da CSP (Report-Only) e promovê-la; remover fallbacks de `lib/firebase/config.ts` com preview validado; criar variável de cifra e então implementar criptografia do `refresh_token` do Google (AES-GCM, ver `decisoes.md`, M de dev). Claude só volta nesses itens quando ele liberar.

## Feitos na develop, aguardando PR/merge (não contam como abertos)
- Falha fechada em `_auth.ts` (A1); proteção de `app/api/ai/*` (A4); `/v1` e `/mcp` com rate limit e origem fixa (A6); remoção de `fix-rules` e `debug/*`, erros genéricos, headers com CSP Report-Only (A2/A7 parte de código); regras do Firestore escritas e já publicadas em produção (2026-10-23); pagamentos Mercado Pago com token, preço no servidor e webhook validado (código pronto); LGPD fatia 8a (`/api/account/export`, `/api/account/delete`, `AccountDataSection`, `/privacidade`, `/termos`), **não verificada no navegador** (exige Admin SDK no Preview).
- Auditoria complementar de segurança (antigo item 9, escolhido em 2026-10-22): estado de conclusão `[verificar]` no `git log` e em `decisoes.md` antes de dar por encerrada.

## Adiados (vendabilidade/lançamento, por diretriz de 2026-10-23; registrados, sem prioridade)
- Tela de assinatura/checkout (o checkout não tem chamador no app) e configurar webhook no painel do Mercado Pago — G. `[BLOQUEADO: Diogo]` parte do console.
- Renovar Access Token e Client Secret do Mercado Pago (apareceram em prints) — P. `[BLOQUEADO: Diogo]`. Segurança, não lançamento: fazer quando ele puder, mesmo adiado.
- LGPD 8b: aviso de subprocessadores de IA (Groq/Gemini) nas páginas e no chat — P.
- LGPD 8c / `docs/comercial.md` (`/auditoria comercial`), planos e preços — M.
- Revisão jurídica de `/privacidade` e `/termos` (faixa "Rascunho"), prazo de resposta a titulares, retenção de `mp_payments` — `[BLOQUEADO: Diogo]`.
- Título "Rascunho" e índice nas páginas legais (polimento).
- Revogar o token no Google ao desconectar a agenda e ao excluir a conta — P.
- Rotacionar o `client_secret` literal do commit 9e0382b — P. `[BLOQUEADO: Diogo]`; é o client público do Firebase CLI (baixo risco).
- Testes da cascata de modelos de IA (`lib/ai/models.ts`) com cliente simulado — M. (Funcionamento: subir quando houver vaga.)
- Testes de UI com Playwright (login, criar hábito, marcar dia) — G.
- Emulador do Firestore para testar hooks e regras — G.
- Terceiro ambiente (staging) — M.

## Ideias (sem prioridade)
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.

## Concluídos
Ver `docs/bugs-corrigidos.md` e o histórico do git.
