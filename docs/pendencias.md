# Pendências e ideias

## Bloqueios (ações do Diogo; Claude não manuseia credenciais)

1. **Google Calendar não conecta em produção.** Falta `FIREBASE_PRIVATE_KEY` (Production) na Vercel. `FIREBASE_CLIENT_EMAIL` e as três `GOOGLE_CALENDAR_*` já existem. Diogo cola o `private_key` da conta de serviço e faz redeploy.
   - Teste sem login, no navegador: `GET /api/integrations/google-calendar/callback?code=x&state=naoexiste`. `msg=invalid_state` = Admin autenticando. Mensagem de credenciais = ainda falta.
   - "Acesso bloqueado" ao autorizar: app OAuth em Testing; adicionar `wronskilg300@gmail.com` em "Usuários de teste".
2. **Rotacionar a chave de serviço antiga do Firebase** (apareceu em terminal/histórico do PowerShell).
3. **Ativar o Firebase Storage** (Storage → Começar, `southamerica-east1`) e então `npx firebase-tools deploy --only storage`. Sem isso, upload de imagem mostra mensagem explicativa.
   - Sem `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, a exclusão de conta apaga a conta sem os arquivos do Storage (só aviso no log). Ver backlog item 15.
4. Diogo organizar rótulos do Trabalho (engrenagem → "Cadastrar os N em uso").
8. **Segurança (2026-10-21), ações do Diogo antes/depois do deploy:**
   - `firestore.rules` **publicadas em produção em 2026-10-23** (regras travam `is_paid`/`subscription_*`/`trial_started_at` e `user_id`). Ainda por verificar à mão: gravar `is_paid: true` pelo console do navegador tem de falhar.
   - Vercel: Diogo disse ter criado `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `WEBHOOK_URL`, `NEXT_PUBLIC_APP_URL` e `PLAN_PRICE_*` (não verificável por Claude). Falta: webhook salvo no painel do Mercado Pago (Modo de produção, evento Pagamentos) e **não existe tela de compra** no app (o checkout não tem chamador). Credenciais do Mercado Pago apareceram em prints na conversa de 2026-10-23: renovar Access Token e Client Secret.
   - Rotacionar o **refresh token OAuth** em `.env.local` (`FIREBASE_OAUTH_REFRESH_TOKEN`) e a chave de serviço antiga; a rota `fix-rules` que o usava foi removida. O `client_secret` que estava no código é o público do Firebase CLI (não é seu), mas continua no histórico git.
   - Conferir o console do preview: violações da CSP (modo Report-Only) antes de promovê-la.
9. **LGPD (fatia 8a), antes de ir para produção [BLOQUEADO: Diogo]:**
   - E-mail de contato LGPD: definido (`digowronski@icloud.com`, constante `CONTACT_PLACEHOLDER` em `components/legal/LegalShell.tsx`). Falta o **prazo de resposta** a titulares.
   - Revisão jurídica de `/privacidade` e `/termos` (rascunho). A faixa "Rascunho" só sai depois dela.
   - Prazo de retenção de `mp_payments` (exportado, não apagado; ver `decisoes.md`).
   - Reautenticação e Storage sem bucket são código, não bloqueio (backlog item 15).

## Infra de qualidade (nova fase)

5. **Firebase de dev** (`focusos-dev-lg`): Firestore, regras, Authentication e variáveis Preview estão prontos ([ambientes.md](ambientes.md)). Falta a chave de serviço (`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`, Preview da `develop`) e, opcionalmente, o Storage (exige Blaze). Confirmar no console do preview que aparece `Project: focusos-dev-lg` antes de gravar dados.
   - Exportar e apagar conta (`/api/account/*`) depende da credencial de serviço no Preview. Sem ela, as rotas devem falhar com 500 `[verificar]`.
6. ~~Proteger a `main`~~ feito (PR + check `verify`).
7. Ampliar a suíte: ver "Próximos testes" em [bugs-corrigidos.md](bugs-corrigidos.md).

## Nunca verificado de ponta a ponta (só dados sintéticos/leitura de código)
Salvar item/rótulo no Firestore pelo modal; arraste de pendências; anotação com histórico; auto-seed em conta nova; envio real ao Google; upload de imagem; exportar e apagar conta (LGPD). Se falhar para o Diogo, investigue pelo relato, não presuma que funciona.

## Ideias não feitas
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.
- Testes de UI (Playwright) e de Firestore (emulador).
