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


---

# Aviso de prazo por e-mail (RF-24; cards 0236, 0062, 0064)

O sistema avisa por e-mail, automaticamente, o aluno ou professor que tem livro emprestado.

## Quando avisa

Contando em dias do calendário de Brasília, só para empréstimo **em aberto**:

| Situação | Quando | Assunto |
| -- | -- | -- |
| `due_soon` (a vencer) | faltam 1 ou 2 dias para o prazo | Devolução em breve: "Livro" vence em dd/mm/aaaa |
| `due_today` (vence hoje) | o prazo é hoje | O livro "Livro" vence hoje |
| `overdue` (atrasado) | o prazo já passou | O livro "Livro" está atrasado (com dias de atraso e a multa de R$ 1,00 por dia) |

Cada situação é avisada **uma vez** por empréstimo e prazo (chave única `loan_id + kind + due_on` em `loan_email_notices`). Renovou? O prazo mudou e a nova data pode ser avisada. Só recebe quem tem perfil ativo, e-mail e **não desligou** a preferência (próxima seção).

## Como funciona

1. **GitHub Actions** (`.github/workflows/avisos-vencimento.yml`): todo dia às 08:00 de Brasília (e por "Run workflow") faz `POST https://fap-books.vercel.app/api/cron/avisos-vencimento` com `Authorization: Bearer <CRON_SECRET>`.
2. **Rota** (`src/app/api/cron/avisos-vencimento/route.ts`): só aceita POST com o segredo certo (comparação em tempo constante; sem `CRON_SECRET` de pelo menos 32 caracteres a rota fica fechada). Responde só contadores (`mode`, `selected`, `sent`, `failed`, `notRecorded`).
3. **Banco** (`claim_loan_email_notices`, migration `20261113200000`): escolhe e **reserva** em lote (no máximo 50 por execução, teto técnico de 100) os avisos pendentes. Só a chave secreta do servidor (`service_role`) executa; a tabela não tem policy (RLS fechado).
4. **Serviço** (`src/services/loan-notices.service.ts`): monta o e-mail (`src/domain/notices/loan-notice.ts`: logo, dados da biblioteca, link da área da pessoa, como não receber mais) e envia pelo provedor (`src/services/email/email-provider.ts`). Só depois do "ok" do provedor chama `finish_loan_email_notice`, que grava `sent_at` e o registro na auditoria (`loan_notice_sent`, só ids).
5. **Falha de envio** não marca como enviado: a próxima execução (pelo menos 1 hora depois) tenta de novo, até **3 tentativas**. O envio leva a chave de idempotência do aviso (o Resend ignora repetição por 24 horas), então um "enviou mas não conseguiu gravar" não vira e-mail duplicado.

**Por que uma rota e não um script no workflow?** A chave do Resend e a chave secreta do Supabase ficam só na Vercel, e o GitHub só guarda um segredo novo e pequeno (`CRON_SECRET`). O e-mail e o nome das pessoas nunca passam pelo runner nem pelo log do Actions. O mesmo código TypeScript é testado e reaproveita o montador do e-mail. O custo é uma rota pública (POST), protegida pelo segredo e pela regra de POST da Vercel.

## Provedor de e-mail (trocável)

`getEmailProvider()` escolhe pelo ambiente:

| Situação | Provedor |
| -- | -- |
| Sem `RESEND_API_KEY`, ou `EMAIL_PROVIDER=dry-run` | **dry-run**: não envia nada. A tarefa só **simula** (`mode: "simulacao"`): conta quantos avisos seriam enviados, sem reservar nem marcar nenhum. Nada se perde: quando a chave entrar, tudo que está pendente é enviado |
| `RESEND_API_KEY` e `EMAIL_FROM` | **Resend** (`fetch`, sem SDK) |
| `RESEND_API_KEY` sem `EMAIL_FROM` | erro de configuração (a rota responde 500 e nada é enviado) |

Plano grátis do Resend: **100 e-mails por dia** (confirme na página de preços). Por isso o lote é de 50 e o teto de 100.

## Preferência de não receber (LGPD)

- Coluna `profiles.email_notices` (padrão `true`). Só a própria pessoa muda, pela função `set_my_email_notices(boolean)`, que grava `profile_updated` na auditoria (só o id).
- Tela "Avisos por e-mail": `/aluno/avisos`, `/professor/avisos` e `/funcionario/avisos`, pelo menu do usuário (canto superior direito). Todo e-mail traz o link para ela. Tela mínima, com os componentes existentes; o frame de design dela está no card de design aberto para isso.
- O e-mail de aviso é uma comunicação do serviço que a pessoa usa (lembrete do próprio empréstimo), por isso o padrão é receber, com saída fácil. Guarda só o necessário: e-mail e nome vêm de `profiles`; nada de texto do e-mail é guardado.

## O que o dono precisa configurar

1. **Resend**: criar conta grátis, verificar o remetente/domínio (próxima seção) e criar uma API key.
2. **Vercel** (Settings > Environment Variables, Production; depois novo deploy):
   - `RESEND_API_KEY` = a chave do Resend
   - `EMAIL_FROM` = `Biblioteca FAP <avisos@seudominio>` (remetente verificado)
   - `CRON_SECRET` = uma sequência aleatória de 32+ caracteres (`openssl rand -hex 32`)
3. **GitHub** (Settings > Secrets and variables > Actions): `CRON_SECRET` com **o mesmo valor** da Vercel.
4. **Banco**: aplicar a migration `20261113200000_loan_email_notices.sql` (`supabase db push --linked --include-all`, depois do dry-run) **antes** de fazer o deploy do código.
5. **Teste**: rode o workflow *Avisos de vencimento por e-mail* à mão. Sem as chaves do Resend o resumo mostra `"mode":"simulacao"`; com elas, `"mode":"envio"` e os e-mails chegam. Para um teste seguro, cadastre um empréstimo com prazo para hoje em nome de um e-mail seu.

Testes automáticos: `src/domain/notices/loan-notice.test.ts`, `src/services/loan-notices.service.test.ts`, `src/services/email/email-provider.test.ts`, `src/lib/cron-auth.test.ts` e o SQL `supabase/tests/07-avisos-por-email.sql` (seleção em lote, idempotência, tentativas, permissões e preferência).

---

# Provedor com domínio próprio no lugar do Gmail provisório (card 0259, depende do dono)

Hoje o e-mail do Supabase Auth (convite, e no futuro "esqueci a senha") sai por uma conta Gmail provisória: limite baixo e risco de cair no spam. Nada disto foi alterado em produção; é o roteiro para o dono:

1. Criar a conta em **resend.com** (plano grátis, sem cartão).
2. **Domains > Add domain**: informe um domínio ou subdomínio da faculdade (ex.: `biblioteca.fap.edu.br`; quem administra o DNS é a TI da FAP). Região: `sa-east-1` (São Paulo), se oferecida.
3. O Resend mostra os registros DNS. Peça à TI para criar no DNS do domínio: o **SPF** (TXT), o **DKIM** (TXT ou CNAME) e, se quiser, o **DMARC** (TXT `_dmarc`, comece com `p=none`). Clique em **Verify** até ficar *Verified*.
4. **API Keys > Create API key** (permissão "Sending access", restrita ao domínio). Guarde o valor: ele aparece uma vez.
5. Coloque a chave onde cada parte a usa (nunca no Git nem em chat):
   - Vercel: `RESEND_API_KEY` e `EMAIL_FROM` (aviso de prazo, seção acima).
   - Supabase Auth (convite): **Authentication > Emails > SMTP Settings > Enable custom SMTP**: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a mesma API key, remetente = o mesmo de `EMAIL_FROM`, nome = `Biblioteca FAP`.
6. **Teste de entrega** (aceite do card): envie o convite para um aluno e um professor de teste e confira que chegou na caixa de entrada (não no spam) e que o cabeçalho "Autenticação" do Gmail mostra SPF, DKIM e DMARC como *pass*.
7. Depois de validar, apague a senha de app do Gmail provisório.

Enquanto isso não for feito, o aviso de prazo fica em modo simulação e o convite continua pelo Gmail.
