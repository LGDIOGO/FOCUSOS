# FocusOS

App de produtividade pessoal: hábitos, agenda, metas, trabalho, finanças, estudos e um assistente de IA.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Firebase (Auth, Firestore, Storage) · TanStack Query · Groq + Gemini.

**Produção:** https://focusos-rlvs.vercel.app · **Repositório:** https://github.com/LGDIOGO/FOCUSOS

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
# preencha o .env.local (veja os comentários no .env.example)
npm run dev                  # http://localhost:3000
```

Sem o `.env.local` preenchido o app abre, mas login, IA e Google Calendar não funcionam.
O `.env.local` **nunca** vai para o git.

Antes de subir qualquer mudança (o build da Vercel **pula** a checagem de tipos, então erros passam batido):

```bash
npx tsc --noEmit     # tipos
npm test             # vitest — suíte de regressão (ver docs/testes.md)
```

## Fluxo de trabalho

Documentação completa em [`docs/`](docs/README.md) (ambientes, testes, armadilhas, decisões, bugs corrigidos).

- Desenvolva em **`develop`** (ambiente de dev/preview); só vai para `main` depois de validado. Ver [`docs/ambientes.md`](docs/ambientes.md).
- Produção: **`main`**. **Todo push para `main` faz deploy automático na Vercel.**
- Não use `vercel --prod` pela CLI: o push já publica, e o token da CLI expira.
- ⚠️ **Cuidado com `sync.bat` / `git-sync.sh`.** Eles fazem `git add .` + commit "Sync: Auto Update"
  + push direto na `main`. Como push na `main` publica, isso manda para produção **tudo o que
  estiver na pasta, sem revisão** — é daí que vêm os commits do autor "FocusOS Auto-Sync".
  Prefira commitar à mão, com `git status` e `git diff` antes.
- Mudou `firestore.rules` ou `storage.rules`? O push **não** publica regras. Rode:
  ```bash
  npx firebase-tools deploy --only firestore:rules
  npx firebase-tools deploy --only storage
  ```

## Estrutura

```
app/(app)/dashboard/   páginas: agenda, habits, goals, trabalho, finance, study, ia, insights...
app/api/               rotas de servidor (IA, integrações, API pública v1, webhooks)
components/            UI; dashboard/ tem os modais e componentes de cada módulo
lib/hooks/             acesso a dados (React Query + Firestore), um arquivo por domínio
lib/utils/             lógica pura: recurrence.ts, calendarScheduling.ts, googleCalendar.ts...
lib/ai/models.ts       lista ordenada de modelos de IA com fallback
firestore.rules        regras de segurança do banco
storage.rules          regras do Storage (anexos do Trabalho)
focusos-mcp/           servidor MCP auxiliar (instale com npm install dentro da pasta)
```

## Coisas que valem saber

- **Recorrência** tem uma única implementação: `lib/utils/recurrence.ts` (`occursOn`).
  Hábitos, compromissos, trabalho e Google Calendar usam ela. Não crie outra cópia.
- **Categorias** vivem numa coleção só (`categories`), separadas pelo campo `type`:
  `habits | agenda | goals | work_type | work_category`. Use `useCategories('escopo')` para filtrar.
- **Modelos de IA** são aposentados de tempos em tempos. Edite as listas em `lib/ai/models.ts`;
  a cascata tenta o próximo sozinha.
- **Google Calendar** exige `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` no servidor,
  além das três variáveis `GOOGLE_CALENDAR_*`.
- **Anexos de imagem** (Trabalho) exigem o Firebase Storage ativado no Console (botão "Começar").
- O symlink `claude/` e a pasta `.claude/` são do Claude Code e ficam fora do git e do deploy
  (`.gitignore` e `.vercelignore`).
