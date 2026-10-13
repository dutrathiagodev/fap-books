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

## Situação dos componentes no Figma

**Prontos, com as variáveis do design system** (página `🧩 Components`):
`Button`, `IconButton`, `Input`, `Checkbox`, `Radio`, `Switch`, `Badge` (6 cores: Gray, Primary, Error, Warning, Success e Blue), `Avatar`, `tab` e `notification`. Os 41 ícones Lucide estão na página `Icons`.

**Ainda não existem** (viraram um card próprio no Trello):
Textarea, Seletor de data, Campo de formulário, `Select`, Tabela, Paginação, Card de livro, Modal, Alerta/Toast, Estado vazio, Skeleton, Estado de erro, Cabeçalho, Menu lateral, Menu do celular, Cabeçalho de página e `Breadcrumb` (o do kit é só um esqueleto).

**Detalhes conhecidos nos que já existem**
- `Checkbox` selecionado: o estado padrão tem fundo azul claro; o ideal é navy com o check branco.
- `Input`: o foco e o erro ainda usam a sombra antiga do kit (`Elevations/03`).
- `Button`: o rótulo ainda não usa o estilo de texto "Menu e Botão".
- Raio 8 px digitado nos botões (não ligado à variável `Radius`).

**Fora do escopo por enquanto**
- Tema escuro desenhado (o do código é provisório).
- Seção de fundamentos (cores, textos, grade e sombras) no topo da página `Components`.

## Como o time deve usar enquanto isso

Nas telas, use os componentes prontos acima e as classes do `globals.css` ([guia de Tailwind](../guias/tailwind.md), seção 3). Para um componente que ainda não existe, monte com os tokens e avise no card, para virar componente depois.
