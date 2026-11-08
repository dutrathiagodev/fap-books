# Multas: cálculo e baixa manual

Cards FAP-0059 (cálculo, RF-22), FAP-0061 (baixa manual, RF-23) e a tela FAP-0093 (`/funcionario/multas`).

## Regra de cálculo

- **R$ 1,00 por dia de atraso** (`fine_cents_per_day()` no banco = 100; `FINE_PER_DAY_CENTS` em `src/domain/fines/fine-rules.ts`).
- **Dias de atraso** = dias corridos entre o **dia do prazo** e o **dia da devolução** (ou de hoje, se o livro ainda não voltou), contados no calendário de **Brasília** (`America/Sao_Paulo`).
  - Devolver no dia do prazo, a qualquer hora, não é atraso. O dia seguinte já é 1 dia (R$ 1,00), mesmo que tenham passado só alguns minutos.
- Valor = dias de atraso × R$ 1,00. Sem atraso, não existe multa. Há no máximo uma multa por empréstimo (`fines.loan_id` único).

## Quem calcula (a mesma conta em três lugares)

| Onde | Para que |
| -- | -- |
| `return_loan` (migration 20261108100200) | Grava a multa na devolução com atraso; o valor final fica fechado. |
| `scripts/agendadas/multas-por-atraso.sql` (tarefa diária) | Cria e atualiza a multa dos empréstimos **ainda em aberto**, que cresce um dia por dia. Nunca altera multa já paga. |
| `calculateFine` em `src/domain/fines/fine-rules.ts` | Mesma conta no código, para a tela e para os testes. |

Os três usam `(data no fuso de Brasília)::date − (prazo no fuso de Brasília)::date`. O teste `supabase/tests/04-pagar-multa.sql` confere o banco (0, 1, 5 e 8 dias) e `fine-rules.test.ts` confere o código com os mesmos casos, incluindo a virada de dia em UTC e a virada de mês e de ano.

## Casos excepcionais (feriados, recessos, fim de semana)

**Hoje não há desconto**: sábado, domingo, feriado e recesso escolar contam como dia de atraso, porque o regulamento citado no PRD não prevê exceção e a tarefa diária conta dias corridos. Está testado (`fine-rules.test.ts`) para ninguém "corrigir" isso sem perceber.

Se a biblioteca quiser perdoar esses dias, é **decisão do dono** e mexe em três lugares: `return_loan`, a tarefa diária e `calculateDaysLate`. O caminho mais simples é uma tabela de dias sem contagem (`library_closed_days`) consultada pelas três. Enquanto isso, a bibliotecária resolve o caso isolado no balcão (por exemplo, não cobrando a multa), mas o sistema ainda não tem "perdoar multa"; essa função não existe e não foi pedida.

## Baixa manual (RF-23)

- O pagamento é **presencial e manual**; não existe pagamento online.
- A função `public.pay_fine(p_fine_id, p_idempotency_key)` (migration `20261108150000_pay_fine.sql`) é a única forma de gravar a baixa: só bibliotecária (`is_librarian()`), grava `paid_at` e `paid_by`, registra `fine_paid` na auditoria só com ids e usa `claim_action_key` (clique duplo e nova tentativa valem uma vez).
- Multa inexistente: erro `fine_not_found`. Multa já paga: nada muda (continuam valendo o autor e a data da primeira baixa, sem auditoria duplicada).
- Depois da baixa, `create_loan` e `renew_loan` deixam de bloquear o usuário por essa multa.

## Tela

`src/app/funcionario/multas`: lista (usuário, livro, atraso, valor, status, registro), chips Todas / Em aberto / Pagas, busca por nome ou matrícula, modal "Dar baixa" com a confirmação "Recebi R$ X presencialmente", toast de sucesso, estados vazio, carregando e erro. Todo acesso exige `requireRole("librarian")` (página e Server Action) e toda consulta tem `.limit()` ou `.range()`.
