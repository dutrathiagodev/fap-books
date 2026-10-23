# Modelo de dados

O banco do FAP Books é simples: **7 tabelas** que vêm direto dos requisitos do [PRD](../prd.md). Cada mudança no banco é uma *migration* em `supabase/migrations/`.

## As tabelas

| Tabela | O que guarda | Requisitos |
| -- | -- | -- |
| `profiles` | Cada pessoa: nome, e-mail, papel (`student`, `teacher` ou `librarian`), cargo e se está ativa | RF-06 a RF-09 |
| `books` | O acervo: título, autor, categoria, código, quantidade, status e capa (opcional) | RF-01 a RF-05 |
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

## Categorias do acervo

A coluna `category` é texto livre (o PRD não fixa uma lista). Os filtros das telas do Figma (cards 0108, 0113 e 0117) usam estas sete categorias, e o seed já usa só elas:

| Categoria | Exemplo no seed |
| -- | -- |
| Literatura brasileira | Dom Casmurro |
| Computação | Algoritmos: Teoria e Prática |
| Saúde | Anatomia Humana |
| Teologia | Introdução à Teologia Sistemática |
| Religião | O Conflito dos Séculos |
| Metodologia | Fundamentos de Metodologia Científica |
| Direito | Curso de Direito Constitucional |

Se o time decidir outra lista, é só mudar o seed e os filtros da tela; o banco aceita qualquer texto.

## Capa do livro

- A coluna `books.cover_url` guarda o endereço público da capa. É **opcional**: sem ela, a tela mostra o placeholder do design system.
- As imagens ficam no bucket **`book-covers`** do Storage (público para leitura; JPG, PNG ou WebP, até 2 MB). Só a bibliotecária envia, troca ou apaga arquivos. A regra está na migration `add_book_cover`.
- Nome do arquivo: o código do livro, por exemplo `T-001.jpg`. O endereço fica `<url do projeto>/storage/v1/object/public/book-covers/T-001.jpg`.
- O envio pela tela é o bloco `FAP - 0119` (upload de capa), que ainda não foi construído. Enquanto isso, as capas de teste são enviadas pelo painel do Supabase (**Storage > book-covers > Upload**), e depois se preenche a coluna com um `update` no SQL Editor:

```sql
update public.books
set cover_url = 'https://<id-do-projeto>.supabase.co/storage/v1/object/public/book-covers/' || code || '.jpg'
where code in ('T-001', 'T-002', 'T-010', 'T-014', 'T-016', 'T-017', 'T-018', 'T-019');
```

## Dados de teste

O arquivo `supabase/seed.sql` cria 20 livros (códigos `T-001` a `T-020`) com títulos, autores e categorias **iguais aos das telas do Figma**, e, se já existir um aluno cadastrado, 3 empréstimos de exemplo (um em dia, um devolvido e um atrasado). Os livros são reais; os empréstimos e as pessoas são fictícios.

Pode rodar mais de uma vez: o livro com o mesmo código é **atualizado** para os dados do seed (mantém o mesmo `id`, então os empréstimos continuam valendo), e os empréstimos não são duplicados.

Como rodar (só quem tem acesso ao banco, e **só com dados de teste**):

1. No painel do Supabase, abra o **SQL Editor** do projeto `fap-books`.
2. Cole o conteúdo de `supabase/seed.sql` e clique em **Run**.
3. Para ver os empréstimos de exemplo, crie antes os usuários de teste (card `0186`) e rode o seed de novo.

Para testar num Postgres local (sem tocar no banco real), rode o seed depois das migrations, como na seção acima.
