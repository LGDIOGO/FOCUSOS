# Backlog

Mantido pelo `gerente-produto`. Máx. 15 itens abertos. Tamanho: P/M/G. Ordem = prioridade.
`[BLOQUEADO: Diogo]` = depende de credencial, console de terceiros ou decisão dele.
Itens 1-9 vêm da auditoria de segurança estática (achados numerados A1-A11 no relatório; sem valores de segredo aqui).

## Abertos

1. ✅ **FEITO na develop (falta PR)** · **[CRÍTICO] Falha fechada na verificação do token em `app/api/v1/_auth.ts`** — P. (A1) Se o Admin SDK falha, `authWithFirebaseToken` decodifica o JWT sem checar assinatura: qualquer um forja um uid (afeta `/v1/keys` e google-calendar). Remover o fallback. Pronto quando: teste `REGRESSÃO:` mostra que token com assinatura inválida/Admin indisponível retorna 401; nenhum caminho decodifica JWT sem verificar. Áreas: `app/api/v1/_auth.ts`. Agente: dev + testes.
2. 🟡 **Código feito (rota removida); falta rotação [BLOQUEADO: Diogo]** · **[CRÍTICO] Apagar `app/api/admin/fix-rules` e tratar credenciais como comprometidas** — M. (A2) Rota POST/GET sem auth publica regras antigas do Firestore e tem `client_secret` OAuth no código. Pronto quando: rota removida (404 em preview); regras corretas republicadas (`firestore:rules`, dev e prod); `client_secret` e refresh token do Google rotacionados; chave de serviço antiga do Firebase também rotacionada; grep no repo sem o segredo. Parte de código: dev. Rotação/republicação: `[BLOQUEADO: Diogo]`. Obs.: o segredo continua no histórico git (ver item 9).
3. 🟡 **Código feito; falta `MP_WEBHOOK_SECRET` e `PLAN_PRICE_*` na Vercel [BLOQUEADO: Diogo]** · **[CRÍTICO] Pagamentos Mercado Pago: autenticar, preço no servidor, validar webhook** — G. (A3) `checkout/mercado-pago` aceita `userId` e preço do cliente sem token; `webhooks/mercadopago` não valida assinatura. Pronto quando: checkout exige token e deriva uid do token; plano/preço vêm de tabela no servidor; webhook valida `x-signature`, confere valor e é idempotente (testes de cada caso). Depende de segredo do webhook no console: `[BLOQUEADO: Diogo]` só para essa configuração.
4. ✅ **FEITO na develop (falta PR)** · **[ALTO] `app/api/ai/*`: exigir token, rate limit, limite de tamanho, schema de saída** — M. (A4) Hoje abertas: custo Groq/Gemini, prompt injection, dados financeiros expostos. Pronto quando: sem token = 401; excesso de requisições = 429; corpo acima do limite = 413; saída validada; testes cobrindo os quatro casos.
5. 🟡 **Regras escritas e compiladas; falta publicar e testar à mão [BLOQUEADO: Diogo]** · **[ALTO] `firestore.rules`: impedir autoedição de `is_paid`/`subscription_expires_at` e troca de `user_id`** — M. (A5) Dono do perfil burla o paywall. Pronto quando: update de `profiles` só passa se `affectedKeys` não tocar campos de assinatura; update em qualquer coleção não altera `user_id`; regras publicadas em dev (testadas à mão) e depois prod. Sem emulador (item antigo "Emulador do Firestore"): verificar manualmente com conta de teste.
6. ✅ **FEITO na develop (falta PR)** · **[ALTO] `/v1` e `/mcp`: rate limit, origem fixa, remover código morto** — M. (A6) `mcp/route.ts` monta URL interna com o header `Host` e envia a API key (SSRF); `_auth.ts` tem fallback REST de `api_keys` morto. Pronto quando: URL interna vem de constante/env; Host forjado não muda destino (teste); fallback removido; rate limit aplicado.
7. 🟡 **Feito: debug removido, erros genéricos, headers (CSP em Report-Only). Falta: fallbacks de produção em `config.ts`, promover CSP** · **[MÉDIO] Endurecimento: remover `debug/*`, erros genéricos, headers, fallbacks de produção** — M. (A7, A8, A11) Remover `app/api/debug/data` (token em query) e `debug/env`; erros não devolvem `err.message`; CSP/HSTS/`X-Frame-Options` em `next.config`; tirar `apiKey`/`projectId` de produção hardcoded em `lib/firebase/config.ts` e `_auth.ts`. Pronto quando: rotas debug dão 404, build sem env falha em vez de apontar para produção, headers presentes (verificar no navegador), `tsc` e `npm test` verdes.
8. **[MÉDIO] LGPD e vendabilidade** — G. (A10; absorve o antigo levantamento comercial) Exclusão de conta, exportação de dados, política de privacidade/termos, aviso de subprocessadores de IA, plus planos em `docs/comercial.md`. Pronto quando: fluxo de exclusão apaga dados do usuário (verificado com conta de teste), exportação baixa JSON, páginas de termos/privacidade linkadas; texto jurídico exige revisão do Diogo. Rodar `/auditoria comercial` antes.
9. **[MÉDIO] Auditoria complementar de segurança** — M. Não coberto: `npm audit`, rotas `v1` restantes, `google-calendar/sync`, `lib/firebase/admin.ts`, segredos antigos no histórico git. Inclui decidir sobre `refresh_token` do Google em texto puro e `err.message` (A9). Pronto quando: lista de achados nova entra no backlog. Rodar `/auditoria seguranca`.
10. **Extrair a regra "só hoje altera a ofensiva" do `useHabits` para função pura e testar** — M. Bug já ocorreu 3 vezes. Pronto quando: função em `lib/utils/` + testes `REGRESSÃO:` cobrindo marcar data passada/futura sem alterar hoje; `useHabits` usa a função.
11. **Extrair o carry-over (arraste) do Trabalho para função pura e testar** — M. Janela de 60 dias; em recorrentes só a ocorrência mais recente em aberto.
12. **Testes da conversão de ciclos de Finanças para mensal** — P. Semanal/quinzenal/anual; o bug de somar valor de face já ocorreu.
13. **Auditoria de UX do primeiro uso (conta nova)**: estados vazios de Resumo, Hábitos, Trabalho — M. Rodar `/auditoria ux`.
14. **`FIREBASE_PRIVATE_KEY` na Vercel (Production)** para o Google Calendar conectar — P. `[BLOQUEADO: Diogo]` (nota: coordenar com a rotação do item 2).

## Adiados por causa do limite de 15 (voltam quando houver vaga)
- Testes da cascata de modelos de IA (`lib/ai/models.ts`) com cliente simulado — M.
- Banners de erro do `FirestoreDiagnostic`: botão de fechar e não cobrir o relógio — P.
- Testes de UI com Playwright (login, criar hábito, marcar dia) — G.
- Emulador do Firestore para testar hooks e regras — G (útil ao item 5).
- Terceiro ambiente (staging) — M.
- Chave de serviço do Firebase de dev no Preview da `develop` — P. `[BLOQUEADO: Diogo]`
- Ativar Storage em produção e publicar `storage.rules` — P. `[BLOQUEADO: Diogo]` (ver `pendencias.md`).
- "Rotacionar a chave de serviço antiga do Firebase" foi fundido no item 2.

## Ideias (sem prioridade)
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.

## Concluídos
Ver `docs/bugs-corrigidos.md` e o histórico do git.
