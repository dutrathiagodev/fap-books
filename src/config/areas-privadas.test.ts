import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { PRIVATE_AREA_HEADERS, PRIVATE_AREA_SOURCES } from "./areas-privadas";

describe("áreas privadas e cache do navegador (FAP-0261)", () => {
  it("cobre as três áreas de usuário logado", () => {
    expect(PRIVATE_AREA_SOURCES.map((s) => s.split("/")[1])).toEqual(["aluno", "professor", "funcionario"]);
  });

  it("proíbe guardar a página no cache", () => {
    const cache = PRIVATE_AREA_HEADERS.find((h) => h.key === "Cache-Control");
    expect(cache?.value).toContain("no-store");
  });

  it("o next.config aplica o no-store em cada área", async () => {
    const rules = await nextConfig.headers!();
    for (const source of PRIVATE_AREA_SOURCES) {
      const rule = rules.find((r) => r.source === source);
      expect(rule, source).toBeDefined();
      expect(rule!.headers).toContainEqual({ key: "Cache-Control", value: "private, no-store, max-age=0" });
    }
  });
});
