-- Migration: livro com histórico não pode ser excluído (RF-03, card FAP-0020).
-- Empréstimos e itens de reserva pedagógica já bloqueavam a exclusão (on delete restrict).
-- A reserva comum apagava junto com o livro; agora também bloqueia, para ninguém perder a fila sem querer.
-- Quem sai do acervo com histórico é inativado (books.status = 'inactive'), não excluído.

alter table public.reservations
  drop constraint reservations_book_id_fkey,
  add constraint reservations_book_id_fkey
    foreign key (book_id) references public.books (id) on delete restrict;
