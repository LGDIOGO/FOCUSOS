# Decisões de arquitetura

Formato: decisão → por quê → o que foi descartado.

## Recorrência unificada em `occursOn`
Havia três cópias divergentes (hábitos, eventos, Trabalho), cada uma com furos diferentes. Unificadas em `lib/utils/recurrence.ts`. Usa `differenceInCalendar*` (não escorrega com fuso). **Não criar outra cópia.** Blindada por testes.

## Google Calendar: sincronização de UMA via (app → Google)
Duas vias exigem webhook e renovação do canal a cada 7 dias: complexidade e pontos de falha. O que se cria no Google não volta, de propósito. Séries viram **um** evento recorrente (RRULE), não uma cópia por dia. Item sem horário ganha 1h alocada nos vãos, sem sobrepor. Descartado: duas vias (reavaliar se virar necessidade real).

## Consultas Firestore com um único `where`
`where('user_id','==',uid)` + filtro no cliente evita índices compostos (criar índice é passo manual e quebra em ambiente novo, como o dev). Trade-off: lê mais docs; aceitável no volume atual.

## Categorias numa coleção só (`categories`) com escopo
Cinco escopos: `habits | agenda | goals | work_type | work_category`. Mais simples que cinco coleções. Trade-off: todo consumidor precisa filtrar (`useCategories('escopo')`).

## Trabalho: `marketplace` é o nome legado da categoria
Mantido para não migrar dados. `kind` guarda o nome do tipo; valores antigos em inglês são traduzidos na exibição por `kindLabel`.

## Trabalho: carry-over com status na data original
Pendência não respondida reaparece nos dias seguintes (janela de 60 dias), mas o log fica na data original. Em recorrentes, só a ocorrência mais recente em aberto é arrastada.

## IA: cascata de modelos
`lib/ai/models.ts` tem listas ordenadas; se um modelo for aposentado, tenta o próximo. Groq primário, Gemini fallback.

## Dev/prod separados com Firebase próprio para dev
Para validar sem risco aos dados reais. Ver [ambientes.md](ambientes.md). Descartados: mesmo Firebase (dev poderia corromper dados reais); só local (não testa PWA/celular).

## Bug vira teste de regressão
Ver [testes.md](testes.md). Objetivo: eliminar o "um passo à frente, dois para trás".

## Testes só de lógica pura por ora
Barato, rápido e estável. UI e Firestore real ficam de fora até valer o custo (emulador, Playwright). Preferir extrair regra de negócio para `lib/utils/`.

## Segurança: falhar fechado, servidor decide
Auditoria de 2026-10-21. Auth por token sem fallback; preço/plano/uid de pagamento vêm do servidor; regras travam assinatura e `user_id`. **CSP em modo `Report-Only`** (não bloqueia): não dá para testar as telas logadas aqui, e uma CSP errada quebraria o login. Promover a `Content-Security-Policy` depois de ver o console do preview sem violações. Rate limit em memória (simples) em vez de Redis/Upstash: suficiente para o volume atual; trocar se houver abuso real. Descartado: remover agora os fallbacks de `apiKey`/`projectId` de produção em `lib/firebase/config.ts` (não dá para confirmar que as `NEXT_PUBLIC_*` estão no escopo Production da Vercel; remover às cegas poderia derrubar produção).

## Exclusão de conta mantém `mp_payments`
Ao apagar a conta, `mp_payments` (id do pagamento, plano, data, `user_id`) é exportada mas **não** apagada: é o marcador de idempotência do webhook e base de retenção fiscal. Sem dado sensível. Lista explícita em `RETAINED_COLLECTIONS` (`lib/server/userData.ts`); a política de privacidade já cita a retenção. Texto final: revisão jurídica.
