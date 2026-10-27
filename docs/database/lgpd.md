# Proteção de dados (LGPD)

Card `FAP - 0011` · requisito não funcional do [PRD](../prd.md) (seção 7). Levantamento feito em 27/10/2026 a partir das migrations, do código e do workflow de backup. Não é parecer jurídico. As decisões da seção 6 são o padrão adotado no projeto acadêmico; o que a FAP precisa confirmar está marcado.

## 1. Que dados pessoais o sistema guarda

| Onde | Dado | Para que serve | De quem |
| -- | -- | -- | -- |
| `auth.users` (login do Supabase) | e-mail, senha (guardada só como hash) | entrar no sistema | todos |
| `profiles` | nome completo, e-mail, perfil (aluno, professor, funcionário), cargo, ativo ou não | mostrar o nome, decidir o que a pessoa pode fazer | todos |
| `loans` | quem pegou qual livro, quando, prazo, devolução, renovações, quem registrou | controlar empréstimos | alunos e professores |
| `fines` | multa por atraso, valor em centavos, data do pagamento, quem deu baixa | cobrar atrasos | alunos e professores |
| `reservations` | quem reservou qual livro e em que fila | reserva de livro indisponível | alunos |
| `pedagogical_reservations` | professor, período, dias, situação, quem decidiu | reserva pedagógica | professores |
| `audit_logs` | quem fez a ação, qual ação, em qual registro e detalhes livres (`details`) | rastreabilidade | quem usa o sistema |

Não há CPF, telefone, endereço, matrícula, data de nascimento nem foto. Isso já cumpre o princípio de coletar só o necessário. Livros e capas (`books`, bucket `book-covers`) não têm dado pessoal.

Os dados de teste usam e-mails `@fapbooks.test` e livros fictícios. O repositório é público e **não contém dado pessoal real**. O mapeamento `scripts/usuarios.json` traz só usuários do GitHub e ids do Trello da equipe, sem e-mail.

## 2. Quem acessa o quê (revisão das regras de RLS)

Todas as tabelas têm RLS ligado e permissões mínimas. Conferido nas migrations:

| Tabela | Aluno e professor | Funcionário (bibliotecária) |
| -- | -- | -- |
| `profiles` | lê só o próprio; **não edita** nada | lê, cadastra e edita todos |
| `loans`, `fines` | leem só os próprios; não escrevem | tudo |
| `reservations` | lê as próprias; cria a própria (sempre como "waiting") | tudo |
| `pedagogical_reservations` e seus livros | professor lê as próprias e cria como "pending"; só a bibliotecária decide | tudo |
| `audit_logs` | não lê; **grava** registro em nome de si mesmo | lê tudo; ninguém edita ou apaga (sem `update` e `delete`) |
| `books` | lê todos os livros | lê e escreve |

Pontos positivos:
- O papel da pessoa nunca vem do que ela digita no cadastro (`handle_new_user` cria sempre como aluno).
- As funções `is_librarian` e `is_teacher` têm `search_path` vazio e só usuário logado executa; considera só perfis ativos.
- A chave secreta do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) não é usada no código hoje, só a chave pública, que o RLS limita.
- Empréstimos e multas usam `on delete restrict`: não se apaga uma pessoa que tem histórico, o que protege a rastreabilidade.

### Pontos a corrigir ou decidir

1. **`audit_logs_insert_own` é aberta demais.** Qualquer pessoa logada pode gravar o registro que quiser em seu nome, com `action` e `details` livres. Dois riscos: poluir a auditoria e gravar dado pessoal em `details`. Quando o card 0010 for feito, a gravação deveria ficar num serviço do servidor, e `details` só pode guardar ids, nunca nome, e-mail ou texto digitado.
2. **A pessoa não corrige os próprios dados.** Hoje só a bibliotecária edita `profiles`. Para atender o direito de correção, o pedido vai pela bibliotecária (ou se cria uma edição restrita ao próprio nome, no futuro).
3. **Todo funcionário vê todos os perfis, empréstimos e multas.** Para uma biblioteca pequena é aceitável (é a função dele), mas vale restringir o perfil de funcionário a quem precisa e manter `active = false` para quem sair.
4. **Backup guarda tudo, inclusive `auth.users`.** Ele sai **criptografado** (AES-256) e fica 30 dias como artefato do GitHub, que provavelmente armazena fora do Brasil (a confirmar). Seria uma transferência internacional de dado criptografado; a senha (`BACKUP_PASSPHRASE`) nunca fica no repositório. O projeto acadêmico aceita esse risco (seção 6); em uso real, a FAP decide se aceita ou muda o destino do backup.

## 3. Dados pessoais em logs

- O código não escreve logs hoje (nenhum `console.*` em `src/`) e `audit_logs` ainda não é gravada por ninguém.
- A tela de login mostra só "E-mail ou senha incorretos", nunca o erro bruto do banco.
- **Regra para quando o 0010 for feito:** `audit_logs` guarda quem (`actor_id`), qual ação e qual registro (`entity`, `entity_id`). **Não** guardar nome, e-mail, senha nem texto livre em `details`. Esse critério só fecha de verdade quando a auditoria existir.
- Os logs da Vercel e do Supabase (acesso e erro) também são logs: não imprimir dado pessoal em mensagem de erro.

## 4. Onde os dados ficam (operadores)

| Serviço | Dado | Observação |
| -- | -- | -- |
| Supabase (banco e login) | todos os dados acima | região **Brasil (São Paulo)**, plano gratuito |
| Vercel (hospedagem do site) | acessos e logs de requisição | **a verificar:** região das funções e contrato |
| GitHub Actions (backup) | arquivo criptografado do banco | 30 dias; provavelmente fora do Brasil (a confirmar); ver ponto 4 acima |
| Trello e Figma | **nenhum dado de usuário final** | só tarefas e telas do time |

## 5. Direitos dos titulares e o que o sistema já faz

| Direito | Situação |
| -- | -- |
| Acesso aos próprios dados | a pessoa vê o próprio perfil, empréstimos, multas e reservas |
| Correção | só pela bibliotecária (ver ponto 2) |
| Eliminação | o sistema **inativa** em vez de apagar (RF-09); o histórico impede apagar de vez. O caso de pedido de eliminação está na seção 6 |
| Informação clara sobre o uso | **ainda não existe** aviso de privacidade no sistema nem na landing |

## 6. Decisões adotadas no projeto

O FAP Books é um trabalho acadêmico. Por isso adotamos regras **genéricas e prudentes**, seguindo a LGPD, e deixamos marcado o que a FAP precisa confirmar se o sistema for usado de verdade. Sem validação da instituição, nada disto é decisão oficial dela.

| Tema | O que adotamos | Confirmar com a FAP? |
| -- | -- | -- |
| **Finalidade** | Só o serviço de biblioteca: empréstimo, devolução, multa e reserva. Os dados não servem para outro fim | não |
| **Base legal** | Execução do serviço de biblioteca para o aluno ou professor (art. 7º, V) e interesse legítimo da instituição no controle do acervo (art. 7º, IX) | sim |
| **Menores de idade** | **Há estudantes menores de 18 anos (ensino médio).** O tratamento dos dados deles é feito **no melhor interesse do menor** (art. 14): só os dados mínimos, texto do aviso em linguagem simples e o responsável legal pode pedir acesso, correção ou eliminação em nome do menor. Não usamos dado de menor para marketing nem para qualquer fim fora da biblioteca. A base legal é a mesma da biblioteca, e a FAP confirma se exige também o consentimento de um responsável | sim |
| **Guarda** | Empréstimos, multas e reservas: **5 anos** depois da última movimentação da pessoa. Conta de quem sai: fica **inativa**. Auditoria (só ids): 5 anos. Backup: 30 dias | sim |
| **Apagamento** | Passado o prazo, **anonimizar** (trocar nome e e-mail por um código) em vez de apagar, porque o histórico impede apagar de vez. Antes disso, só a pedido e se não houver multa em aberto | sim |
| **Direitos do titular** | O pedido vai por e-mail à biblioteca; a bibliotecária executa e responde em até **15 dias**. Canal provisório: **`privacidade@fapbooks.example`** (e-mail genérico de exemplo; a FAP troca pelo real) | sim |
| **Encarregado (DPO)** | É a pessoa que a instituição indica para ser o canal entre ela, os titulares dos dados e a ANPD (LGPD, art. 5º, VIII). **A FAP ainda precisa indicar quem é**; até lá, o contato é o canal acima. Não achamos o nome em fonte pública | sim |
| **Backup** | Mantido como está (criptografado, 30 dias). O risco de o GitHub guardar fora do Brasil é registrado e aceito no projeto acadêmico | sim, se for produção |
| **Incidente de segurança** | Avisar logo o responsável da biblioteca. A comunicação à ANPD e aos titulares é da FAP (a regulamentação fala em 3 dias úteis; confirmar a regra vigente) | sim |
| **Aviso de privacidade** | Texto-base abaixo; entra na landing e no login depois de ter design | só o texto |

### Medidas de segurança já em vigor

- Acesso por perfil com RLS em todas as tabelas e permissões mínimas.
- Senhas guardadas só como hash pelo Supabase; o papel da pessoa nunca vem do cadastro.
- Conexão protegida (HSTS) e cabeçalhos de segurança no site (`X-Frame-Options`, CSP parcial, `nosniff`).
- Chave secreta do banco fora do navegador e do Git; repositório com varredura de segredos e Dependabot ligados.
- Backup diário criptografado; restauração testada.
- Login sem mensagem de erro bruta; nenhum log com dado pessoal.
- Dados de menores: nenhuma coleta além do que os adultos já têm; nada de CPF, telefone, endereço nem foto.

### Texto-base do aviso de privacidade (rascunho)

> **Como usamos seus dados.** O FAP Books guarda seu nome, e-mail e o histórico dos seus empréstimos, reservas e multas, só para a biblioteca controlar o acervo e atender você. Só você e a equipe da biblioteca veem esses dados. Guardamos por até 5 anos depois da sua última movimentação e depois os tornamos anônimos. Para ver, corrigir ou pedir a eliminação dos seus dados, escreva para privacidade@fapbooks.example. Se você tem menos de 18 anos, seu pai, mãe ou responsável também pode fazer esse pedido por você.

## 7. O que o card 0011 pede e como está

| Critério do card | Situação |
| -- | -- |
| Acesso mínimo necessário por perfil | levantado e conferido; falta o ajuste da política de auditoria (seção 2, ponto 1), que entra com o card 0010 |
| Regras de RLS revisadas | revisadas em 27/10; achados na seção 2 |
| Sem dados pessoais em logs | hoje não há logs; a regra está na seção 3 e se confirma quando a auditoria (0010) existir |
| Regra de guarda e apagamento | **definida na seção 6** (padrão do projeto acadêmico; a FAP confirma se for usar de verdade) |
