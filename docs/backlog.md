# Backlog

Mantido pelo `gerente-produto`. Máx. 15 itens abertos. Tamanho: P/M/G. Ordem = prioridade.
`[BLOQUEADO: Diogo]` = depende de credencial, console de terceiros ou decisão dele.

## Abertos

1. **Extrair a regra "só hoje altera a ofensiva" do `useHabits` para função pura e testar** — M. Bug já ocorreu 3 vezes (status vazando entre dias). Pronto quando: função em `lib/utils/` + testes `REGRESSÃO:` cobrindo marcar data passada/futura sem alterar hoje; `useHabits` usa a função.
2. **Extrair o carry-over (arraste) do Trabalho para função pura e testar** — M. Janela de 60 dias; em recorrentes só a ocorrência mais recente em aberto. Hoje sem teste.
3. **Testes da conversão de ciclos de Finanças para mensal** — P. Semanal/quinzenal/anual; o bug de somar valor de face já ocorreu.
4. **Testes da cascata de modelos de IA (`lib/ai/models.ts`) com cliente simulado** — M. Quatro endpoints já caíram com 500 por modelo aposentado.
5. **Banners de erro do `FirestoreDiagnostic`: botão de fechar e não cobrir o relógio** — P. Hoje são fixos e sem fechar.
6. **Auditoria de segurança estática** (`firestore.rules`, `storage.rules`, `app/api/admin/*`, fallbacks de `lib/firebase/config.ts` que apontam para produção) — M. Rodar `/auditoria seguranca`.
7. **Auditoria de UX do primeiro uso (conta nova)**: estados vazios de Resumo, Hábitos, Trabalho — M. Rodar `/auditoria ux`.
8. **Levantamento comercial** (`docs/comercial.md`): lacunas para vender, planos, LGPD (exportar/apagar dados, termos, privacidade) — M. Rodar `/auditoria comercial`.
9. **Testes de UI com Playwright nos fluxos críticos (login, criar hábito, marcar dia)** contra o preview de dev — G. Exige conta de teste e variáveis; avaliar custo/benefício.
10. **Emulador do Firestore para testar hooks que leem/gravam** — G.
11. **Terceiro ambiente (staging)**, separado do dev e da produção — M. Decidir se vale com um só usuário.
12. **Chave de serviço do Firebase de dev** no Preview da `develop` (Google Calendar e rotas de servidor no preview) — P. `[BLOQUEADO: Diogo]`
13. **Ativar Storage em produção** e publicar `storage.rules` — P. `[BLOQUEADO: Diogo]` (ver `pendencias.md`).
14. **`FIREBASE_PRIVATE_KEY` na Vercel (Production)** para o Google Calendar conectar — P. `[BLOQUEADO: Diogo]`
15. **Rotacionar a chave de serviço antiga do Firebase** — P. `[BLOQUEADO: Diogo]`

## Ideias (sem prioridade)
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.

## Concluídos
Ver `docs/bugs-corrigidos.md` e o histórico do git.
