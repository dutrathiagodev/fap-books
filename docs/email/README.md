# Convite por e-mail: definir a senha (FAP-0087)

Como a pessoa nova entra no sistema: a funcionária cadastra o usuário (`/funcionario/usuarios/novo`), o Supabase envia o e-mail de convite e a pessoa define a própria senha na página `/definir-senha`. Nenhuma senha provisória existe.

## Como funciona

1. `createUser` (`src/services/users.service.ts`) chama `inviteUserByEmail` com `redirectTo` = `<origem do site>/definir-senha`. A origem vem de `NEXT_PUBLIC_SITE_URL` e só vale se estiver na lista de origens permitidas (`src/lib/site-url.ts`: produção, previews da Vercel `fap-books-*.vercel.app` e `localhost`/`127.0.0.1` com porta). Valor fora da lista cai no padrão do ambiente. O navegador nunca escolhe esse endereço.
2. O e-mail (`docs/email/convite.html`) leva a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`.
3. `GET /definir-senha` só confere o **formato** do `token_hash` e do `type` e mostra o formulário. **Não consome o token**: antivírus e leitores de e-mail abrem os links antes da pessoa, e um GET que gastasse o token inutilizaria o convite.
4. Ao enviar o formulário, a Server Action `definePasswordFromInvite` (`src/app/actions/define-password.ts`):
   limite por IP (10 envios / 10 min, `definePasswordLimiter`) → valida a senha (mínimo 8 caracteres, máximo 72 bytes, as duas iguais) → `verifyOtp({ token_hash, type: 'invite' })` → confere que o perfil está **ativo** → `updateUser({ password })` → redireciona para a primeira tela do perfil (`ROLE_LANDING`).
5. Usa o cliente do servidor com cookies (`createSupabaseServerClient`), não a chave secreta.

A mesma página serve a **redefinição de senha** (FAP-0265): `type=recovery` está em `SUPPORTED_LINK_TYPES` (`src/domain/auth/invite-token.ts`), o formulário troca os textos ("Redefina sua senha", "Redefinir senha e entrar") e a Server Action confere o token com o mesmo tipo (`verifyOtp({ token_hash, type: 'recovery' })`). O e-mail é `docs/email/recuperar-senha.html` (link `{{ .SiteURL }}/definir-senha?token_hash={{ .TokenHash }}&type=recovery`). Ainda **não existe** a tela "Esqueci minha senha" no login: por enquanto a recuperação é disparada pelo painel do Supabase (Authentication > Users > Send password recovery) e pede design antes de código.

## O que a pessoa vê

| Situação | Resposta |
| -- | -- |
| Link sem `token_hash`/`type` válidos, expirado ou já usado | "Este link não vale mais" + pedir novo link à biblioteca (o Supabase não diferencia expirado de usado) |
| Senha curta, longa demais, só espaços ou confirmação diferente | Mensagem no campo; nada é gasto |
| Perfil inativo | "Seu acesso está desativado"; a sessão aberta pelo link é encerrada e a senha não é definida |
| Erro do Supabase ao conferir o link (5xx/rede) | "Não foi possível salvar agora", o link continua valendo |
| Link gasto, mas a senha não foi salva | "Peça um novo link" (sessão encerrada) |
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

### 2b. Authentication > Emails > Reset password

- **Subject**: `Redefinir sua senha na biblioteca da FAP`
- **Message body**: o conteúdo inteiro de `docs/email/recuperar-senha.html`.

Aqui o link usa `{{ .SiteURL }}` (e não `{{ .RedirectTo }}`) porque o "Send password recovery" do painel não manda destino. Sem este modelo, o Supabase usa o padrão em inglês, que leva o link para a página inicial do site.

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
5. **Falha de envio** não marca como enviado: a próxima execução (pelo menos 1 hora depois) tenta de novo, até **3 tentativas**. O envio pelo Resend leva a chave de idempotência do aviso (repetição ignorada por 24 horas); pelo SMTP não há essa proteção (veja a observação abaixo).

**Por que uma rota e não um script no workflow?** A senha do provedor de e-mail e a chave secreta do Supabase ficam só na Vercel, e o GitHub só guarda um segredo novo e pequeno (`CRON_SECRET`). O e-mail e o nome das pessoas nunca passam pelo runner nem pelo log do Actions. O mesmo código TypeScript é testado e reaproveita o montador do e-mail. O custo é uma rota pública (POST), protegida pelo segredo e pela regra de POST da Vercel.

## Provedor de e-mail (trocável, tudo gratuito)

`getEmailProvider()` (`src/services/email/email-provider.ts`) escolhe pela variável `EMAIL_PROVIDER` (`dry-run`, `smtp` ou `resend`). Vazia: usa `smtp` se houver `SMTP_HOST`, senão `resend` se houver `RESEND_API_KEY`, senão `dry-run`. Configuração incompleta do provedor escolhido é erro (a rota responde 500 e nada é enviado).

| Provedor | Variáveis (Vercel) | Custo e limite | Limitações honestas (confirme nas páginas de cada serviço, que mudam) |
| -- | -- | -- | -- |
| **dry-run** (padrão e dos testes) | nenhuma | grátis | Não envia nada. A tarefa só **simula** (`mode: "simulacao"`): conta quantos avisos seriam enviados, sem reservar nem marcar nenhum; quando um provedor real entrar, tudo que está pendente é enviado |
| **smtp** com **Gmail** + senha de app | `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASSWORD` (senha de app), `EMAIL_FROM` | grátis, cerca de 500 e-mails por dia | Exige verificação em duas etapas na conta para gerar a senha de app. O remetente tem de ser o próprio Gmail (o Google reescreve outro). Como sai dos servidores do Google, SPF e DKIM do `gmail.com` valem e a entrega costuma ser boa, mas o endereço é `@gmail.com`, o que parece menos oficial. Use uma conta só da biblioteca, nunca uma pessoal |
| **smtp** com **Brevo** | `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER` (login SMTP do Brevo), `SMTP_PASSWORD` (chave SMTP), `EMAIL_FROM` | grátis, cerca de 300 e-mails por dia | O remetente é verificado por e-mail (sem domínio). Sem domínio próprio, o SPF/DKIM é do Brevo e não do endereço do remetente: usando um `@gmail.com` como remetente, parte dos provedores pode mandar para o spam. O plano grátis põe um rodapé do Brevo |
| **resend** (opcional) | `RESEND_API_KEY`, `EMAIL_FROM` | grátis, 100 e-mails por dia | **Sem domínio verificado só envia para o e-mail do dono da conta** (remetente `onboarding@resend.dev`): serve para testar, não para avisar alunos. Para avisar todo mundo exige domínio próprio |

**Recomendação sem custo para uma biblioteca pequena: SMTP com uma conta Gmail da biblioteca e senha de app.** É a única opção grátis que entrega para qualquer aluno sem domínio, tem folga no limite (50 por execução, 1 execução por dia) e boa reputação de entrega. Brevo é a alternativa se não puder usar Gmail. Domínio próprio (SPF/DKIM do remetente da faculdade) é uma **melhoria opcional futura** que dá o remetente "oficial" e a melhor entrega; nada aqui exige comprar nada.

Observação: SMTP não tem chave de idempotência (o Resend tem). Se o e-mail sair e o banco falhar ao registrar, a nova tentativa pode repetir o aviso. É raro e o limite de 3 tentativas contém o efeito.

## Preferência de não receber (LGPD)

- Coluna `profiles.email_notices` (padrão `true`). Só a própria pessoa muda, pela função `set_my_email_notices(boolean)`, que grava `profile_updated` na auditoria (só o id).
- Tela "Avisos por e-mail": `/aluno/avisos`, `/professor/avisos` e `/funcionario/avisos`, pelo menu do usuário (canto superior direito). Todo e-mail traz o link para ela. Tela mínima, com os componentes existentes; o frame de design dela está no card de design aberto para isso.
- O e-mail de aviso é uma comunicação do serviço que a pessoa usa (lembrete do próprio empréstimo), por isso o padrão é receber, com saída fácil. Guarda só o necessário: e-mail e nome vêm de `profiles`; nada de texto do e-mail é guardado.

## O que o dono precisa configurar (nada pago)

1. **Conta Gmail só da biblioteca** com verificação em duas etapas; em Segurança > Senhas de app, criar uma senha de app (16 letras). Alternativa: Brevo (tabela acima).
2. **Vercel** (Settings > Environment Variables, Production; depois novo deploy): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<o Gmail>`, `SMTP_PASSWORD=<senha de app>`, `EMAIL_FROM=Biblioteca FAP <o Gmail>` e `CRON_SECRET` (32+ caracteres aleatórios, `openssl rand -hex 32`).
3. **GitHub** (Settings > Secrets and variables > Actions): `CRON_SECRET` com **o mesmo valor** da Vercel.
4. **Banco**: aplicar a migration `20261113200000_loan_email_notices.sql` (`supabase db push --linked --include-all`, depois do dry-run) **antes** do deploy do código.
5. **Teste**: rode o workflow *Avisos de vencimento por e-mail* à mão. Sem provedor o resumo mostra `"mode":"simulacao"`; com ele, `"mode":"envio"` e os e-mails chegam. Para um teste seguro, cadastre um empréstimo com prazo para hoje em nome de um e-mail seu e confira, rodando duas vezes, que só chega um.

Testes automáticos: `src/domain/notices/loan-notice.test.ts`, `src/services/loan-notices.service.test.ts`, `src/services/email/email-provider.test.ts` (dry-run, SMTP e Resend, sem enviar nada), `src/lib/cron-auth.test.ts` e o SQL `supabase/tests/07-avisos-por-email.sql` (seleção em lote, idempotência, tentativas, permissões e preferência).

---

# Trocar o SMTP provisório do Supabase Auth (card 0259; sem custo)

Hoje o e-mail do Supabase Auth (convite) sai por uma conta Gmail provisória. Nada disto foi alterado em produção. A decisão do dono é **não pagar nada** (nem domínio), então o roteiro é gratuito:

1. **Melhor opção sem custo:** manter o SMTP do Gmail, mas com a **conta Gmail dedicada da biblioteca** (a mesma do aviso de prazo), senha de app e nome "Biblioteca FAP". Em Authentication > Emails > SMTP Settings: host `smtp.gmail.com`, porta `465`, usuário e senha de app dessa conta, remetente o próprio Gmail. Limite do Gmail: cerca de 500 por dia, de sobra para convites.
2. **Alternativa grátis:** Brevo (300 por dia, remetente verificado por e-mail): host `smtp-relay.brevo.com`, porta `587`. Sem domínio próprio, pode ir para o spam (veja a tabela acima).
3. O **Resend grátis sem domínio não serve** para convidar usuários (só envia para o e-mail do dono da conta).
4. **Teste de entrega** (aceite do card): enviar o convite a um aluno e a um professor de teste e conferir que chegou na caixa de entrada (não no spam).
5. **Melhoria opcional futura:** domínio próprio da faculdade com SPF e DKIM (a TI da FAP cria os registros DNS) dá remetente oficial e a melhor entrega, com qualquer um dos provedores. Só vale se a faculdade já tiver o domínio; não exige compra.
