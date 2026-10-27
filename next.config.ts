import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as rotas. O HSTS já vem da Vercel.
// A política de conteúdo abaixo é a parte que não depende de nonce: impede o site de ser embutido em outro
// (clickjacking), bloqueia plugins e fixa para onde os formulários podem enviar. Uma política completa para
// scripts exige nonce e renderização dinâmica em todas as páginas, o que conflita com o cache atual.
const cabecalhosDeSeguranca = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
