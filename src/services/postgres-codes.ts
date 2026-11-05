// Códigos de erro do Postgres e do PostgREST que os serviços traduzem em motivos conhecidos (o erro bruto nunca sai).

// "Já existe": violação de unicidade (código do livro, e-mail da newsletter).
export const UNIQUE_VIOLATION = "23505";

// "Ainda é usado por outra tabela" (empréstimo, reserva ou reserva pedagógica).
export const FOREIGN_KEY_VIOLATION = "23503";

// Página além do fim da lista (PostgREST).
export const RANGE_NOT_SATISFIABLE = "PGRST103";
