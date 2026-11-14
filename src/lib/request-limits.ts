import { createRateLimiter } from "./rate-limit";

// Limites por IP das rotas públicas ou de alto custo (FAP-0231). Guardados em módulo para valerem durante toda a
// vida da instância do servidor. Veja a ressalva em rate-limit.ts: o limite é por instância.

// Pesquisa de livros: 60 pesquisas por minuto cobre digitar, filtrar e paginar sem incomodar quem usa de verdade.
export const searchLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

// Inscrição na newsletter: 5 por 10 minutos por IP. Ninguém se inscreve mais que isso; robôs sim.
export const newsletterLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

// Definir a senha pelo convite: 10 envios por 10 minutos por IP. Sobra para errar a senha algumas vezes; chutar tokens não.
export const definePasswordLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

// Pedir o link "Esqueci minha senha" (FAP-0266). Cada pedido envia um e-mail, então o limite é mais apertado que o das outras rotas.
// Por IP: 5 pedidos a cada 10 minutos (sobra para errar o e-mail). Por e-mail: 3 por hora, para ninguém encher a caixa de entrada
// de uma pessoa nem esgotar a cota de envios do Supabase. As duas chaves valem para qualquer e-mail digitado (existente ou não),
// então o aviso de limite não revela se a conta existe.
export const forgotPasswordIpLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
export const forgotPasswordEmailLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60_000 });
