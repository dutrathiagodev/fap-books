import type { UserRole } from "@/types/profile";

// Papel de quem está logado, guardado por poucos segundos na memória do servidor, só para o proxy.ts (FAP-0267).
// O proxy consultava o perfil no banco a cada página; com a mesma pessoa abrindo várias páginas seguidas, quase todas
// essas consultas eram repetidas. A guarda é curta e só vale para ROTEAR (para onde mandar a pessoa): toda página
// confere o perfil de novo, sem cache, em requireRole. Por isso uma conta desativada ou com papel trocado é barrada
// pela própria página no mesmo instante; o proxy só pode errar o destino do redirecionamento por até TTL segundos.
// Só papéis encontrados são guardados: perfil ausente ou inativo sempre vai ao banco.
export const ROLE_CACHE_TTL_MS = 10_000;
export const ROLE_CACHE_MAX_ENTRIES = 1_000;

export class RoleCache {
  private readonly entries = new Map<string, { role: UserRole; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number = ROLE_CACHE_TTL_MS,
    private readonly maxEntries: number = ROLE_CACHE_MAX_ENTRIES,
    private readonly now: () => number = Date.now,
  ) {}

  get(userId: string): UserRole | null {
    const entry = this.entries.get(userId);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(userId);
      return null;
    }
    return entry.role;
  }

  set(userId: string, role: UserRole): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(userId)) this.prune();
    this.entries.set(userId, { role, expiresAt: this.now() + this.ttlMs });
  }

  // Remove o que venceu; se ainda estiver cheio, recomeça do zero (o limite existe para a memória não crescer sem fim).
  private prune(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) this.entries.clear();
  }
}

export const proxyRoleCache = new RoleCache();
