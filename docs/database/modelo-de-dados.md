# Modelo de dados

O banco do FAP Books é simples: **7 tabelas** que vêm direto dos requisitos do [PRD](../prd.md). Cada mudança no banco é uma *migration* em `supabase/migrations/`.

## As tabelas

| Tabela | O que guarda | Requisitos |
| -- | -- | -- |
| `profiles` | Cada pessoa: nome, e-mail, papel (`student`, `teacher` ou `librarian`), cargo e se está ativa | RF-06 a RF-09 |
| `books` | O acervo: título, autor, categoria, código, quantidade e status | RF-01 a RF-05 |
| `loans` | Empréstimos: livro, pessoa, prazo, devolução e renovações | RF-10 a RF-12, RF-14, RF-21 |
| `fines` | A multa de um empréstimo atrasado, em centavos, e a baixa manual | RF-22, RF-23 |
| `reservations` | Reserva de livro indisponível (aluno) | RF-13 |
| `pedagogical_reservations` | Pedido do professor: início, dias (1 a 30) e decisão da bibliotecária | RF-16 a RF-20 |
| `pedagogical_reservation_books` | Quais livros entram em cada reserva pedagógica | RF-16 |
| `audit_logs` | Quem fez o quê e quando (só acrescenta, nunca edita) | Requisito de auditoria |

## Como as tabelas se ligam

```text
profiles ──< loans >── books
   │           │
   │           └── fines
   ├──< reservations >── books
   ├──< pedagogical_reservations >──< pedagogical_reservation_books >── books
   └──< audit_logs
```

`A ──< B` quer dizer que uma linha de A pode ter várias linhas em B.

## Quem pode fazer o quê (RLS)

| | Aluno | Professor | Funcionário da biblioteca |
| -- | -- | -- | -- |
| Ver o acervo | sim | sim | sim |
| Cadastrar ou editar livros | não | não | **sim** |
| Ver empréstimos e multas | só os seus | só os seus | **todos** |
| Registrar empréstimo, devolução e multa | não | não | **sim** |
| Reservar livro | para si | para si | todos |
| Pedir reserva pedagógica | não | **sim, as suas** | todas |
| Aprovar ou recusar reserva pedagógica | não | não | **sim** |
| Ler a auditoria | não | não | **sim** |

Quem decide isso é o **RLS** do banco: mesmo que alguém tente burlar a tela, o banco recusa.

## O que fica no banco e o que fica no código

| No banco | No código (`src/domain`, com teste) |
| -- | -- |
| Prazo da reserva pedagógica entre 1 e 30 dias | Limite de 5 livros por pessoa |
| Quantidade de livros nunca negativa | Prazo padrão de 7 dias |
| Quem pode ver e escrever em cada tabela | Cálculo da multa (R$ 1,00 por dia) |
| O papel de cada pessoa nunca vem do cadastro | Se o livro está disponível (quantidade menos empréstimos em aberto) |

## Pontos ainda em aberto

- **Como a bibliotecária cadastra um aluno novo?** Hoje o perfil nasce quando a pessoa cria a conta. Cadastrar por outra pessoa exige criar o usuário de login pelo servidor, com a chave secreta. Vamos decidir isso junto com a tela de cadastro de usuários (`FAP - 0029`).
- **Notificações** (WhatsApp, e-mail) ainda não têm tabela: dependem da definição do mecanismo de envio (PRD, seção 13).

## Como testar as migrations sem tocar no banco real

Precisa do Docker. As regras de acesso são testadas num Postgres comum que simula o Supabase:

```bash
docker run -d --name fapdb -e POSTGRES_PASSWORD=x postgres:17
docker exec -i fapdb psql -U postgres -q < supabase/tests/00-simula-supabase.sql
for f in supabase/migrations/*.sql; do docker exec -i fapdb psql -U postgres -q -v ON_ERROR_STOP=1 < $f; done
docker exec -i fapdb psql -U postgres -q < supabase/tests/01-regras-de-acesso.sql 2>&1 | grep -E "PASS|FAIL"
docker rm -f fapdb
```

Todas as linhas devem mostrar `PASS`.
