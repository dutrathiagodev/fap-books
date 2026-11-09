import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// O mesmo atalho "@/..." do tsconfig, para testar arquivos que importam por ele (ex.: os serviços).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
