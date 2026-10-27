# Design system do FAP Books

O design system vive no **Figma** (arquivo "FAP BOOKS - Gestão para Biblioteca") e é espelhado no código. Quem mexe em tela usa os **nomes** abaixo, nunca valores soltos.

## Decisões

| Tema | Decisão |
| -- | -- |
| Fontes | **Lora** nos títulos (SemiBold), **Inter** no resto |
| Texto | Corpo 16 px, menus e botões 14 px (Medium), legenda 12 px |
| Títulos | H1 48 px (login/capa), H1 36 px (páginas internas), H2 28 px, H3 22 px |
| Cores | Escala navy 50 a 950 (marca: `#032B5E` e `#0D3B6E`) |
| Texto secundário | `#6B6B6B` (contraste 5,3:1). `#8C8C8C` só em bordas e ícones |
| Estados | Sucesso, atenção, erro e informação (texto 700 e fundo 100) |
| Cantos | 8 px em botões e campos, 12 px em cards e modais |
| Espaçamento | Grade de 4 px |
| Telas | Celular 375, tablet 768 e desktop 1280 |
| Ícones | Lucide, 16/20/24 px, traço 1,5 |
| Tema | Claro primeiro. O escuro vem depois |

## Onde está cada coisa

- **Figma:** variáveis `Color`, `Spacing` e `Radius`, estilos de texto e de sombra, e 41 ícones Lucide como componentes (página `Icons`).
- **Código:** `src/app/globals.css` (tokens), `src/app/layout.tsx` (fontes) e `src/components` (componentes).
- **Valores em arquivo:** `docs/design/tokens/` (`cores-v2.json`, `espacamento.json`, `raios.json`).
- **Como usar as classes:** [guia de Tailwind](../guias/tailwind.md), seção 3.

## Como usar um ícone

Os mesmos ícones do Figma (página `Icons`, componentes `lucide/<nome>`) existem no código com o mesmo nome, pela biblioteca `lucide-react`:

```tsx
import { BookOpen } from "lucide-react";

<BookOpen size={20} strokeWidth={1.5} aria-hidden="true" />
```

- Tamanhos: 16, 20 ou 24 px. Traço sempre 1,5.
- Cor: herda do texto. Use `className="text-ink-muted"` para mudar.
- Ícone sozinho num botão precisa de `aria-label` no botão. Ícone ao lado de texto leva `aria-hidden="true"`.
- O nome no Figma `lucide/book-open` vira `BookOpen` no código.

## O que falta

- Componentes de interface no Figma (botão, campo, tabela, modal e os outros).
- Tema escuro desenhado.
