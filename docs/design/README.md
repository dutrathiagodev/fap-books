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
- **Fluxo de telas:** [fluxo-de-telas.md](fluxo-de-telas.md) (quem desenha o quê, em que ordem, e como manter a sequência).
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

## Situação (2026-10-27)

- **Design system fechado** (card `0098`, aprovado pelo dono): variáveis, estilos de texto e de sombra, ícones e a página `🧩 Components` (botão, campo, caixa de seleção, opção, interruptor, selo, avatar, abas, chip de filtro, aviso, card de indicador, passos e envio de arquivo).
- **Telas no Figma** (página `🖥️ UI web`): cada frame leva o título do card do Trello e fica numa seção por autor. As seções seguem a ordem do fluxo, da esquerda para a direita: Landing page, hover e foco dos botões, layout base (0101, com os estados vazio e carregamento do 0104), sidebar, Francielio (0105 a 0117), Emanuel (0108 e 0213), Igor (0121), Breno (0144 a 0153), cadastro (0204) e telas escuras (0205). Ao criar uma seção nova, encaixe-a nessa ordem.
- **Modo escuro:** as telas do sistema têm versão escura na seção "Telas escuras" (card `0205`), com uma coleção de variáveis própria, porque o plano gratuito do Figma permite só um modo por coleção.
- **Falta desenhar:** telas do Igor (0126, 0135, 0138, 0140) e da Julia (0157, 0147). Depois delas vem a revisão final do Figma (0209), que também cobre a versão escura dessas telas.
- **Código:** `AppShell` segue o layout base aprovado no Figma (card `0101`): menu lateral navy por perfil, cabeçalho de 72 px com sino e menu do usuário, gaveta no celular e `PageHeader` (cards `0102` e `0103`). Os estados vazio, carregamento e esqueleto (card `0104`) vieram depois do desenho. O login usa os tokens (card `0013`). Itens de menu sem tela aparecem desativados até o card da tela ser entregue.
- **Regra do time:** design primeiro, código depois. Bloco ou tela sem frame no Figma é desenhado antes de ser construído.
- **Referências:** [wireframes](referencias/) e o [guia visual do Stitch](stitch/DESIGN.md) com o [prompt](stitch/prompt-stitch.md).

## O que falta

- Telas dos outros cards de design (cada pessoa entrega o link do Stitch e o dono leva para o Figma).
- Tema escuro desenhado.
