import { createRateLimiter } from "./rate-limit";

// Limites por IP das rotas públicas ou de alto custo (FAP-0231). Guardados em módulo para valerem durante toda a
// vida da instância do servidor. Veja a ressalva em rate-limit.ts: o limite é por instância.

// Pesquisa de livros: 60 pesquisas por minuto cobre digitar, filtrar e paginar sem incomodar quem usa de verdade.
export const searchLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

// Inscrição na newsletter: 5 por 10 minutos por IP. Ninguém se inscreve mais que isso; robôs sim.
export const newsletterLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
