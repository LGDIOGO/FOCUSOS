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
Auditoria de 2026-10-21. Auth por token sem fallback; preço/plano/uid de pagamento vêm do servidor; regras travam assinatura e `user_id`. **CSP em modo `Report-Only`** (não bloqueia; reafirmado em 2026-10-23 pelo `next.config.js`): não dá para testar as telas logadas aqui, e uma CSP errada quebraria o login. Promover a `Content-Security-Policy` depois de ver o console do preview sem violações. Rate limit em memória (simples) em vez de Redis/Upstash: suficiente para o volume atual; trocar se houver abuso real. Descartado: remover agora os fallbacks de `apiKey`/`projectId` de produção em `lib/firebase/config.ts` (não dá para confirmar que as `NEXT_PUBLIC_*` estão no escopo Production da Vercel; remover às cegas poderia derrubar produção).

## Exclusão de conta mantém `mp_payments`
Ao apagar a conta, `mp_payments` (id do pagamento, plano, data, `user_id`) é exportada mas **não** apagada: é o marcador de idempotência do webhook e base de retenção fiscal. Sem dado sensível. Lista explícita em `RETAINED_COLLECTIONS` (`lib/server/userData.ts`); a política de privacidade já cita a retenção. Texto final: revisão jurídica.

## `refresh_token` do Google Calendar em texto puro (por ora)
Fica em `user_integrations/{uid}.google_calendar.refresh_token` sem criptografia. Motivos: a coleção não tem acesso de cliente (regras negam; só o Admin SDK lê/escreve) e a exportação da conta (`/api/account/export`) remove o campo. Criptografar com chave em variável de ambiente (AES-GCM) exige migração dos tokens existentes e uma nova variável na Vercel: vira item de backlog, não foi implementado. Trade-off: vazamento do banco ou de um backup expõe o acesso à agenda do usuário até ele revogar. Também fica no backlog o `revoke` do token no Google ao desconectar/excluir a conta.

## Fallbacks de `lib/firebase/config.ts` e `lib/firebase/admin.ts` mantidos
O fallback de `projectId` em `admin.ts` e os fallbacks de `config.ts` continuam: não foi confirmado que as `NEXT_PUBLIC_*` estão no escopo Production da Vercel, e remover às cegas poderia derrubar produção. Remover só depois de confirmar as variáveis (ver `pendencias.md`). A `apiKey` web do Firebase é pública por desenho (não é segredo); o risco é de configuração, não de vazamento.

## Erros de rotas: genérico para o cliente, detalhe no log do servidor
Rotas de `app/api/**` não devolvem `err.message` nem títulos de itens do usuário. Detalhe vai para `console.error` (só `error.message`, nunca o objeto inteiro). Validação de entrada em funções puras (`lib/server/validate.ts`).

## Categorias pessoais compartilhadas; Trabalho isolado
Hábitos, Compromissos e Metas usam o mesmo conjunto de categorias (escopos `habits | agenda | goals`). Motivo: o filtro estrito por `type` escondia categorias criadas em outra área ou sem `type`. Trade-off: uma categoria de Hábito aparece em Metas, aceito. Trabalho continua separado, porque tipo e categoria de Trabalho têm outro significado. Ver [modulos.md](modulos.md#categorias).

## Barra inferior com 4 destinos + "Mais"
Resumo, Agenda, Hábitos e Trabalho ficam na barra; o resto vai para o sheet "Mais", junto de Configurações, Modo Foco e Sair. Motivo: alvos de 44px e rótulos legíveis em 390px. Trade-off: Configurações, Sair e Modo Foco ficam a 2 toques, não 1. Ver [modulos.md](modulos.md#navegação).

## `forceDark` temporário em GoalModal e WorkItemModal
Estes dois modais têm tokens fixos escuros (`DARK_TOKENS` em `components/ui/Modal.tsx`) e passam `forceDark` ao `CategoryPicker` e ao sheet de categorias, que seguem o tema por padrão. Trade-off: no tema claro esses modais não seguem o tema. Provisório: sai com a migração para tokens (backlog item 12). Não copiar o padrão para modal novo.

## Token `--text-muted` sobe para 0.5 (escuro) e 0.55 (claro)
Texto secundário tinha opacidade baixa demais (20-40% de branco/preto espalhados pelo código). Centralizado no token `--text-muted` (`app/globals.css`) com valor que chega perto de 4.5:1 de contraste. Telas sempre escuras usam `text-white/60` direto, sem o token. Trade-off: no tema escuro o texto secundário ficou mais claro. Descartado: manter `/20`-`/40` (falha de contraste em celular). Os usos de `text-[var(--text-muted)]/N` são inválidos (armadilha 32).

## Matriz de hábitos: todos os dias no DOM, rolagem ao fim
No celular a matriz abre rolada até o fim (`matrixInitialScrollLeft`), com todos os dias disponíveis. **Substitui** o critério (b) da F5 que pedia no máximo 14 dias sem rolagem horizontal. Motivo: não esconder dias antigos (teste REGRESSÃO) e deixar o dia mais recente visível ao abrir. Trade-off: rolagem horizontal no celular. Testes em `viewState.test.ts`.

## Confirmação inline é o padrão (sem `window.confirm`)
Exclusões e ações destrutivas confirmam dentro da UI (`DeleteButton` para lixeira, `InlineConfirm` para o resto). Motivo: `window.confirm()` retorna `false` na hora no PWA instalado (armadilha 12), e a ação simplesmente não executava. Trade-off: mais código de UI, sem teste automatizado de tela (ver [testes.md](testes.md)). Ao criar ação destrutiva nova, use um dos dois componentes.
