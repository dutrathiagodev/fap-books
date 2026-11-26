import { describe, expect, it } from "vitest";
import type { LoanRecord } from "@/types/loan-record";
import { cacheKeyFor, parseCachedRecords, serializeRecords } from "./loan-record-cache";

const record: LoanRecord = {
  id: "4f9c1a52-7d1c-4b53-9a3e-0d9a1c2b3e4f",
  bookTitle: "Dom Casmurro",
  author: "Machado de Assis",
  readerName: "Maria Souza",
  category: "Romance",
  loanedOn: "2026-11-10",
  dueOn: "2026-11-20",
  returnedOn: null,
};

describe("cacheKeyFor", () => {
  it("separa as pessoas pela chave", () => {
    expect(cacheKeyFor("a")).not.toBe(cacheKeyFor("b"));
    expect(cacheKeyFor("a")).toContain("a");
  });
});

describe("parseCachedRecords", () => {
  it("devolve o que foi salvo", () => {
    expect(parseCachedRecords(serializeRecords([record, { ...record, id: "2", returnedOn: "2026-11-21" }]))).toHaveLength(2);
  });

  it("sem nada salvo, lista vazia", () => {
    expect(parseCachedRecords(null)).toEqual([]);
    expect(parseCachedRecords("")).toEqual([]);
  });

  it("JSON quebrado ou de outro formato vira lista vazia", () => {
    expect(parseCachedRecords("{nao e json")).toEqual([]);
    expect(parseCachedRecords('{"a":1}')).toEqual([]);
    expect(parseCachedRecords('"texto"')).toEqual([]);
  });

  it("descarta só o registro inválido", () => {
    const raw = JSON.stringify([record, { ...record, id: "x", dueOn: "2026-13-40" }, { id: "y" }, null, 3]);
    expect(parseCachedRecords(raw)).toEqual([record]);
  });
});
