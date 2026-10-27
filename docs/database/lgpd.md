# Proteção de dados (LGPD)

Card `FAP - 0011` · requisito não funcional do [PRD](../prd.md) (seção 7). Levantamento feito em 27/10/2026 a partir das migrations, do código e do workflow de backup. Não é parecer jurídico: os pontos marcados com **Decisão** precisam do responsável da biblioteca ou da FAP.

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
4. **Backup guarda tudo, inclusive `auth.users`.** Ele sai **criptografado** (AES-256) e fica 30 dias como artefato do GitHub, que provavelmente armazena fora do Brasil (a confirmar). Seria uma transferência internacional de dado criptografado; a senha (`BACKUP_PASSPHRASE`) nunca fica no repositório. **Decisão:** a FAP aceita esse armazenamento? Se não, mudar o destino do backup.

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
| Eliminação | o sistema **inativa** em vez de apagar (RF-09); o histórico impede apagar de vez. É preciso definir o caso de pedido de eliminação (ver Decisão abaixo) |
| Informação clara sobre o uso | **ainda não existe** aviso de privacidade no sistema nem na landing |

## 6. Decisões pendentes (com o responsável da biblioteca/FAP)

1. **Tempo de guarda e apagamento.** Proposta para discutir (não decidida): manter empréstimos e multas por um prazo definido depois que a pessoa deixa a instituição (por exemplo, até 5 anos para fins de controle do acervo) e, depois disso, **anonimizar** em vez de apagar (trocar nome e e-mail por um código), já que `on delete restrict` impede apagar quem tem histórico. Definir quem pede e quem executa.
2. **Base legal e encarregado (DPO).** Confirmar com a FAP qual é a base legal (por exemplo, execução do serviço de biblioteca) e quem é o encarregado pelos dados.
3. **Aviso de privacidade.** Decidir o texto e onde aparece (rodapé da landing e tela de login). Isso precisa de design antes do código.
4. **Backup fora do Brasil.** Aceitar ou trocar o destino (ver ponto 4 da seção 2).

## 7. O que o card 0011 pede e como está

| Critério do card | Situação |
| -- | -- |
| Acesso mínimo necessário por perfil | levantado e conferido; um ajuste a fazer na auditoria (ponto 1) |
| Regras de RLS revisadas | revisadas nesta data; achados na seção 2 |
| Sem dados pessoais em logs | hoje não há logs; a regra fica escrita na seção 3 e se confirma quando a auditoria (0010) existir |
| Regra de guarda e apagamento | proposta na seção 6, **depende do responsável** |
