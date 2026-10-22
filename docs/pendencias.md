# Pendências e ideias

## Bloqueios (ações do Diogo; Claude não manuseia credenciais)

1. **Google Calendar não conecta em produção.** Falta `FIREBASE_PRIVATE_KEY` (Production) na Vercel. `FIREBASE_CLIENT_EMAIL` e as três `GOOGLE_CALENDAR_*` já existem. Diogo cola o `private_key` da conta de serviço e faz redeploy.
   - Teste sem login, no navegador: `GET /api/integrations/google-calendar/callback?code=x&state=naoexiste`. `msg=invalid_state` = Admin autenticando. Mensagem de credenciais = ainda falta.
   - "Acesso bloqueado" ao autorizar: app OAuth em Testing; adicionar `wronskilg300@gmail.com` em "Usuários de teste".
2. **Rotacionar a chave de serviço antiga do Firebase** (apareceu em terminal/histórico do PowerShell).
3. **Ativar o Firebase Storage** (Storage → Começar, `southamerica-east1`) e então `npx firebase-tools deploy --only storage`. Sem isso, upload de imagem mostra mensagem explicativa.
4. Diogo organizar rótulos do Trabalho (engrenagem → "Cadastrar os N em uso").

## Infra de qualidade (nova fase)

5. **Criar o Firebase de dev** e configurar variáveis Preview na Vercel ([ambientes.md](ambientes.md)). Enquanto não existir, **não valide escrita de dados num preview**.
6. **Proteger a `main` no GitHub** exigindo PR + check `verify`.
7. Ampliar a suíte: ver "Próximos testes" em [bugs-corrigidos.md](bugs-corrigidos.md).

## Nunca verificado de ponta a ponta (só dados sintéticos/leitura de código)
Salvar item/rótulo no Firestore pelo modal; arraste de pendências; anotação com histórico; auto-seed em conta nova; envio real ao Google; upload de imagem. Se falhar para o Diogo, investigue pelo relato, não presuma que funciona.

## Ideias não feitas
- Google Calendar de duas vias (webhook + renovação de canal a cada 7 dias).
- Campo SKU/produto nos itens de Trabalho.
- Limpeza das branches antigas (`claude/*`, `feature/*`): só quando o Diogo pedir.
- Testes de UI (Playwright) e de Firestore (emulador).
