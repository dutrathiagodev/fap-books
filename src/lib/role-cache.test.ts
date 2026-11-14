import { describe, expect, it } from "vitest";
import { RoleCache } from "./role-cache";

describe("RoleCache (guarda curta do papel no proxy)", () => {
  it("devolve o papel guardado e nada para quem nunca foi guardado", () => {
    const cache = new RoleCache(10_000, 10, () => 0);
    expect(cache.get("u1")).toBeNull();
    cache.set("u1", "student");
    expect(cache.get("u1")).toBe("student");
    expect(cache.get("u2")).toBeNull();
  });

  it("esquece o papel depois do prazo (a próxima requisição volta ao banco)", () => {
    let now = 0;
    const cache = new RoleCache(10_000, 10, () => now);
    cache.set("u1", "teacher");
    now = 9_999;
    expect(cache.get("u1")).toBe("teacher");
    now = 10_000;
    expect(cache.get("u1")).toBeNull();
  });

  it("um papel novo substitui o antigo e renova o prazo", () => {
    let now = 0;
    const cache = new RoleCache(10_000, 10, () => now);
    cache.set("u1", "student");
    now = 8_000;
    cache.set("u1", "librarian");
    now = 15_000;
    expect(cache.get("u1")).toBe("librarian");
  });

  it("não cresce além do limite: remove os vencidos e, se ainda estiver cheio, recomeça", () => {
    let now = 0;
    const cache = new RoleCache(10_000, 3, () => now);
    cache.set("a", "student");
    cache.set("b", "student");
    now = 5_000;
    cache.set("c", "student");
    now = 11_000; // a e b venceram, c não
    cache.set("d", "student");
    expect(cache.get("a")).toBeNull();
    expect(cache.get("c")).toBe("student");
    expect(cache.get("d")).toBe("student");

    cache.set("e", "student"); // cheio (c, d, e = 3) e nada venceu: ao entrar o quarto, recomeça
    cache.set("f", "student");
    expect(cache.get("c")).toBeNull();
    expect(cache.get("f")).toBe("student");
  });
});
