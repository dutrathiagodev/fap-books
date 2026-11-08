// Limite de tentativas por chave (normalmente o IP), em janela fixa e só na memória do servidor.
//
// ATENÇÃO, o que isto É e o que NÃO é: na Vercel cada instância tem a própria memória e várias instâncias rodam ao
// mesmo tempo, então o limite vale POR INSTÂNCIA. Ele barra o abuso comum (um script martelando a busca ou a
// newsletter) e custa zero, mas não é uma garantia global. A garantia global é o WAF da Vercel
// (docs/infra-e-plano-gratuito.md). Este módulo é a segunda camada, não a única.

export interface RateLimitRule {
  // Quantas tentativas cada chave pode fazer dentro da janela.
  limit: number;
  windowMs: number;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

interface Counter {
  count: number;
  resetAt: number;
}

// Teto de chaves guardadas: uma enxurrada de IPs diferentes não pode encher a memória do servidor.
const DEFAULT_MAX_KEYS = 5000;

export function createRateLimiter(rule: RateLimitRule, now: () => number = Date.now, maxKeys = DEFAULT_MAX_KEYS) {
  const counters = new Map<string, Counter>();

  // Tira as janelas que já acabaram; se ainda estiver cheio, tira as mais antigas (o Map guarda a ordem de entrada).
  function makeRoom(current: number) {
    for (const [key, counter] of counters) if (counter.resetAt <= current) counters.delete(key);
    for (const key of counters.keys()) {
      if (counters.size < maxKeys) break;
      counters.delete(key);
    }
  }

  return {
    // Conta uma tentativa da chave e diz se ela ainda pode passar.
    check(key: string): RateLimitResult {
      const current = now();
      const counter = counters.get(key);

      if (!counter || counter.resetAt <= current) {
        if (!counter && counters.size >= maxKeys) makeRoom(current);
        counters.set(key, { count: 1, resetAt: current + rule.windowMs });
        return { allowed: true };
      }

      if (counter.count >= rule.limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((counter.resetAt - current) / 1000)) };
      }
      counter.count += 1;
      return { allowed: true };
    },
  };
}

// IP de quem fez a requisição. Na Vercel o x-forwarded-for é escrito pela própria plataforma (o valor mandado pelo
// navegador é descartado), então o primeiro endereço é confiável. Fora dela, a chave vira "desconhecido": todos
// dividem o mesmo limite, o que é o lado seguro.
export function getClientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "desconhecido";
}

// Aviso amigável em português para a pessoa que passou do limite.
export function tooManyRequestsMessage(retryAfterSeconds: number): string {
  const wait = retryAfterSeconds <= 60 ? "alguns instantes" : `${Math.ceil(retryAfterSeconds / 60)} minutos`;
  return `Muitas tentativas em pouco tempo. Aguarde ${wait} e tente de novo.`;
}
