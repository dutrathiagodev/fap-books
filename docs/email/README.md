# Convite por e-mail: definir a senha (FAP-0087)

Como a pessoa nova entra no sistema: a funcionária cadastra o usuário (`/funcionario/usuarios/novo`), o Supabase envia o e-mail de convite e a pessoa define a própria senha na página `/definir-senha`. Nenhuma senha provisória existe.

## Como funciona

1. `createUser` (`src/services/users.service.ts`) chama `inviteUserByEmail` com `redirectTo` = `<origem do site>/definir-senha`. A origem vem de `NEXT_PUBLIC_SITE_URL` e só vale se estiver na lista de origens permitidas (`src/lib/site-url.ts`: produção, previews da Vercel `fap-books-*.vercel.app` e `localhost`/`127.0.0.1` com porta). Valor fora da lista cai no padrão do ambiente. O navegador nunca escolhe esse endereço.
2. O e-mail (`docs/email/convite.html`) leva a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`.
3. `GET /definir-senha` só confere o **formato** do `token_hash` e do `type` e mostra o formulário. **Não consome o token**: antivírus e leitores de e-mail abrem os links antes da pessoa, e um GET que gastasse o token inutilizaria o convite.
4. Ao enviar o formulário, a Server Action `definePasswordFromInvite` (`src/app/actions/define-password.ts`):
   limite por IP (10 envios / 10 min, `definePasswordLimiter`) → valida a senha (mínimo 8 caracteres, máximo 72 bytes, as duas iguais) → `verifyOtp({ token_hash, type: 'invite' })` → confere que o perfil está **ativo** → `updateUser({ password })` → redireciona para a primeira tela do perfil (`ROLE_LANDING`).
5. Usa o cliente do servidor com cookies (`createSupabaseServerClient`), não a chave secreta.

Só `type=invite` é aceito hoje. `recovery` ("esqueci a senha") entra depois: basta incluí-lo em `SUPPORTED_LINK_TYPES` (`src/domain/auth/invite-token.ts`), criar o modelo de e-mail e trocar os textos da tela.

## O que a pessoa vê

| Situação | Resposta |
| -- | -- |
| Link sem `token_hash`/`type` válidos, expirado ou já usado | "Este link não vale mais" + pedir novo convite à biblioteca (o Supabase não diferencia expirado de usado) |
| Senha curta, longa demais, só espaços ou confirmação diferente | Mensagem no campo; nada é gasto |
| Perfil inativo | "Seu acesso está desativado"; a sessão aberta pelo link é encerrada e a senha não é definida |
| Erro do Supabase ao conferir o link (5xx/rede) | "Não foi possível salvar agora", o link continua valendo |
| Link gasto, mas a senha não foi salva | "Peça um novo convite" (sessão encerrada) |
| Muitas tentativas | Aviso de espera (429 lógico) |

Segurança: nada de token, e-mail ou senha vai para o log (só o código do erro); a página responde com `Cache-Control: private, no-store` e `Referrer-Policy: no-referrer` (`next.config.ts`) e `noindex`.

## Configuração no painel do Supabase (uma vez por projeto)

Projeto `fap-books` (São Paulo).

### 1. Authentication > URL Configuration

- **Site URL**: `https://fap-books.vercel.app`
- **Redirect URLs** (cada endereço que o app usa em `redirectTo` precisa estar aqui, senão o Supabase ignora o `redirectTo` e o e-mail sai com a Site URL):
  - `https://fap-books.vercel.app/**`
  - `https://fap-books-*.vercel.app/**` (previews da Vercel)
  - `http://localhost:*/**` (desenvolvimento, qualquer porta)

### 2. Authentication > Emails > Invite user

- **Subject**: `Você foi convidado para a biblioteca da FAP`
- **Message body**: o conteúdo inteiro de `docs/email/convite.html`.

Atenção: o botão e o link usam `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`. Sem a Redirect URL liberada, `{{ .RedirectTo }}` vira a Site URL e o link quebra.

### 3. Variáveis de ambiente

| Onde | Variável |
| -- | -- |
| Vercel (produção) | `NEXT_PUBLIC_SITE_URL=https://fap-books.vercel.app` (opcional: é o padrão em produção) |
| Vercel (preview) | `NEXT_PUBLIC_SITE_URL` com o endereço do preview, se for testar o convite nele |
| `.env.local` | `NEXT_PUBLIC_SITE_URL=http://localhost:<porta que você usa>` |

Variáveis `NEXT_PUBLIC_` entram na build: mudou na Vercel, faça um novo deploy.

## Como testar

1. Suba o app (`npm run dev`), cadastre um usuário com um e-mail seu em `/funcionario/usuarios/novo`.
2. Abra o e-mail: o link deve ser `<origem>/definir-senha?token_hash=…&type=invite`.
3. Abra o link duas vezes **sem enviar**: continua valendo (o GET não gasta o token).
4. Defina a senha: você cai na primeira tela do perfil. Abrir o mesmo link de novo mostra "Este link não vale mais".

Testes automáticos: `src/domain/auth/*.test.ts`, `src/lib/site-url.test.ts`, `src/app/actions/define-password.test.ts` (Supabase simulado).
