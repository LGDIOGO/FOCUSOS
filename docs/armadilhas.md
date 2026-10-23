# Armadilhas técnicas

Pegadinhas que já custaram tempo. Antes de investigar algo estranho, procure aqui.

## Verificação e deploy
1. **Telas logadas não são testáveis pelo Claude** (sem credenciais). Padrão: página temporária `app/zzpreview/page.tsx` com dados sintéticos exercitando o hook/componente real; inspecionar no navegador; **apagar a página** e `.next/types/app/zzpreview`. Nunca commitar.
2. **`curl` em produção dispara o Vercel Security Checkpoint** (403 anti-bot), por polling excessivo. Confirme deploy pelo navegador (`fetch` dentro da página) ou monitor leve. Usuários reais não são afetados.
3. **Acento no bundle de produção aparece escapado** (`An\xfancio`). Ao procurar strings no deploy, use trecho sem acento ou o escape. Já gerou falso negativo.
4. **O build da Vercel pula checagem de tipos.** Erro de tipo não derruba o deploy; o CI (`tsc`) é o portão.
5. **Push não publica regras** do Firebase. Rode o deploy de regras à mão no projeto certo.
6. O symlink `claude/` e a pasta `.claude/` estão no `.gitignore`/`.vercelignore`. O symlink já quebrou um build. Também estão excluídos do `tsconfig` e do vitest (senão entram worktrees antigas).
7. `sync.bat`/`git-sync.sh`: `git add .` + push na `main` = produção sem revisão. Não usar.

## Código
8. **`tsconfig` target ES5:** sem spread de `Map`/`Set` (`[...map]`); use `Array.from`.
9. **CRLF:** substituição multilinha por script falha em silêncio; use Edit com trecho exato.
10. **Firestore e índices:** consultas usam um único `where('user_id','==',uid)` e filtram o resto no cliente, para não exigir índice composto.
11. **Firestore rejeita `undefined`.** Para apagar campo: `deleteField()`.
12. **`window.confirm()` retorna `false` na hora no PWA instalado.** Confirme dentro da UI.
13. **Recorrência: um motor só** (`lib/utils/recurrence.ts`). Usa `differenceInCalendar*` de propósito (variantes por duração escorregam com fuso), prende o dia ao tamanho do mês e trata `end_date` como inclusivo.
14. **Status é por data, não por item.** `habit_logs`/`event_logs`/`work_logs` têm id `{id}_{yyyy-MM-dd}`. Marcar outro dia nunca altera hoje.
15. **Modelos de IA são aposentados.** Edite `lib/ai/models.ts`.
16. **Reconectar o Google sem revogar antes** faz o Google não devolver refresh token (o callback avisa).
17. **Código que importa Firebase no topo** quebra no vitest: use `vi.mock` ou extraia a lógica para função pura.
18. **Nunca decodifique JWT sem verificar a assinatura.** `authWithFirebaseToken` só aceita o que o Admin SDK verifica; sem credencial, nega (401). `verifyIdToken` funciona sem service account (só baixa as chaves públicas).
19. **Rotas `/api/ai/*` e checkout exigem ID token.** No cliente use `authFetch` (`lib/utils/authFetch.ts`), não `fetch` cru. No servidor use `guardAiRequest` (`lib/server/guard.ts`).
20. **Nunca monte URL a partir do header `Host`.** Use `internalOrigin()` (`lib/server/origin.ts`).
21. **Preço e plano vivem no servidor** (`PLAN_PRICE_*` no ambiente + `lib/server/payments.ts`). O webhook confere valor/moeda, valida `x-signature` (`MP_WEBHOOK_SECRET`) e é idempotente (`mp_payments/{id}`). Sem preço ou segredo configurado, tudo recusa.
22. **`profiles`: campos de assinatura e `trial_started_at` só o Admin SDK altera** (regras travam). Não grave `is_paid`/`subscription_*` pelo cliente. Perfil não pode ser apagado pelo cliente (senão reinicia o teste).
23. **vitest 4: `vi.fn` que devolve Promise rejeitada reprova o teste** mesmo com o erro tratado. Em mocks de falha use função comum.
24. **Rate limit é em memória por instância** (serverless): freio contra abuso, não limite global exato.
25. **Coleção nova com `user_id` entra em `USER_COLLECTIONS`** (`lib/server/userData.ts`), senão exportação/exclusão de conta (LGPD) deixa dado órfão. Um teste varre `lib/hooks` e `firestore.rules` e falha se faltar.

26. **`/v1/performance`: `days` inválido ou <= 0 vira o padrão (7); `from`>`to` e intervalo > 366 dias dão 400** (`resolveRange` em `lib/server/validate.ts`). Compatível com o MCP.
