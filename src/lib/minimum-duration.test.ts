import { describe, expect, it, vi } from "vitest";
import { withMinimumDuration } from "./minimum-duration";

describe("withMinimumDuration", () => {
  it("espera só o que falta para completar o piso", async () => {
    let agora = 1000;
    const sleep = vi.fn(async (ms: number) => {
      agora += ms;
    });
    const result = await withMinimumDuration(
      1500,
      async () => {
        agora += 400;
        return "ok";
      },
      () => agora,
      sleep,
    );
    expect(result).toBe("ok");
    expect(sleep).toHaveBeenCalledWith(1100);
  });

  it("não espera se a operação já passou do piso", async () => {
    let agora = 0;
    const sleep = vi.fn(async () => {});
    await withMinimumDuration(
      1500,
      async () => {
        agora += 2000;
      },
      () => agora,
      sleep,
    );
    expect(sleep).not.toHaveBeenCalled();
  });
});
