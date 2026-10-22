# Ambientes: dev e produção

```
 local (npm run dev)  ──►  develop (preview na Vercel, Firebase DEV)  ──►  main (produção, Firebase PROD)
      escrever/testar            validar no celular/PWA, sem risco             só código validado
```

| | Dev | Produção |
|---|---|---|
| Branch | `develop` | `main` |
| URL | URL de preview da Vercel (gerada por push) | https://focusos-rlvs.vercel.app |
| Firebase | projeto **de dev** (a criar, ver abaixo) | `foco-os---produtividade-bfb58` |
| Dados | sintéticos/de teste | reais do Diogo |
| Deploy | automático a cada push em `develop` | automático a cada push em `main` |

**Regra de ouro:** dev nunca lê nem escreve dados de produção.

## Fluxo de uma mudança

1. `git checkout develop && git pull`
2. Altere. Escreva/atualize testes ([testes.md](testes.md)).
3. `npx tsc --noEmit` e `npm test` verdes.
4. Commit claro (explique o porquê) e push em `develop` → a Vercel gera o preview, o CI roda.
5. Valide no preview (celular/PWA), com a conta de teste.
6. Validado: abra PR `develop` → `main`. CI verde. Merge = **deploy em produção**.
7. Confirme o deploy no navegador (não com `curl`).

Mudou `firestore.rules`/`storage.rules`? O push não publica regras. Publique no projeto certo:
```bash
npx firebase-tools deploy --only firestore:rules --project dev    # dev primeiro
npx firebase-tools deploy --only firestore:rules --project prod   # só depois de validar
```

## Criar o Firebase de dev (passo único, feito pelo Diogo)

1. Console do Firebase → **Adicionar projeto** → ex.: `focusos-dev`.
2. Ative **Authentication** (mesmos provedores da produção), **Firestore** (modo produção; região `southamerica-east1`) e, se quiser testar anexos, **Storage**.
3. Configurações → **Seus apps** → app Web → copie a config para as variáveis `NEXT_PUBLIC_FIREBASE_*`.
4. Configurações → **Contas de serviço** → gerar chave → `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`. **Não cole no chat.** Vai direto na Vercel.
5. Authentication → Configurações → **Domínios autorizados**: adicione o domínio de preview da Vercel.
6. Informe o **ID do projeto** ao Claude, que então registra os aliases em `.firebaserc`:
   ```json
   { "projects": { "default": "foco-os---produtividade-bfb58", "prod": "foco-os---produtividade-bfb58", "dev": "<id-do-projeto-dev>" } }
   ```
7. Publique as regras no dev (comando acima).

## Variáveis na Vercel (Settings → Environment Variables)

Cada variável tem escopos: **Production**, **Preview**, **Development**. O ambiente dev usa **Preview** (idealmente restrito à branch `develop`).

| Variável | Production | Preview (dev) |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6) | projeto prod | projeto **dev** |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | conta de serviço prod | conta de serviço **dev** |
| `GROQ_API_KEY`, `GOOGLE_AI_API_KEY` | pode repetir | pode repetir |
| `GOOGLE_CALENDAR_CLIENT_ID/SECRET` | iguais | iguais |
| `GOOGLE_CALENDAR_REDIRECT_URI` | URL de prod | URL **do preview** (e cadastrar essa URI no Console do Google) |
| `NEXT_PUBLIC_APP_URL` | URL de prod | URL do preview |

Atenção: preview de branch muda de URL por deploy, a menos que se use o domínio fixo da branch (`focusos-rlvs-git-develop-...vercel.app`). Use esse domínio fixo para OAuth e domínios autorizados.

## Local

`.env.local` apontando para o Firebase de **dev** (não o de prod). Nunca commitado.

## Proteção da `main` (feito pelo Diogo no GitHub)

Settings → Branches → regra para `main`: exigir PR e o check `verify` do CI. Sem isso, nada impede um push direto que publique.

## Estado atual

Ver [pendencias.md](pendencias.md): o Firebase de dev ainda **não existe**; até ser criado, o preview da Vercel usaria os dados de produção (**não valide nada que grave dados num preview antes disso**).
