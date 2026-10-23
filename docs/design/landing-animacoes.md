# Landing page: interações e animações para o código

O protótipo no Figma (página `UI web`, fluxo "Landing page (claro)") cobre só o que o Figma consegue simular. Este documento diz o que o código deve fazer em cada ponto, incluindo o que o Figma não mostra.

Regras gerais: valem as cores, raios e espaços de [`globals.css`](../../src/app/globals.css) e do [design system](README.md). Toda animação respeita `prefers-reduced-motion: reduce` (nesse caso, sem movimento: a mudança é instantânea).

## No protótipo do Figma

| Interação | Figma | Código |
|---|---|---|
| Links do menu (Início, Quem somos, Recursos, Acervo, Novidades, Contato) | Rola até a seção | Âncoras (`#id`) com `scroll-behavior: smooth` e `scroll-margin-top` igual à altura do cabeçalho (80 px) |
| Quero acesso, "Conheça o FAP Books", "Conheça o nosso acervo" | Rola até a seção | Mesmo comportamento das âncoras |
| Botão de voltar ao topo (seta) | Rola até o cabeçalho | `window.scrollTo({ top: 0, behavior: "smooth" })`. Aparece só depois de rolar 400 px |
| Botão de acessibilidade | Abre o painel por cima da página | Painel com `role="dialog"`, `aria-modal="false"` e foco no primeiro controle. Fecha com `Esc`, clique fora ou no próprio botão |
| Perguntas frequentes | Abre e fecha cada pergunta (variantes Fechada e Aberta) | Botão com `aria-expanded` e `aria-controls`. Ícone troca de seta para baixo para seta para cima. Altura anima em 200 ms. Várias perguntas podem ficar abertas |

## Só no código (o Figma não anima)

- **Contadores da faixa de números** (7 dias, 5 livros, 30 dias, R$ 1,00): contam de 0 até o valor em 1,2 s, uma única vez, quando a faixa entra 50 % na tela (`IntersectionObserver`). Sem movimento, mostram o valor final.
- **Hover dos cards** (Perfis, Novidades): sobem 2 px, a borda vai para `link` e a sombra para `shadow-md`, em 150 ms.
- **Hover e foco dos botões**: fundo vai para `brand-hover` (primário) ou `selected` (secundário), em 150 ms. O foco visível usa `focus` com contorno de 2 px.
- **Abas de "Nossos recursos"** (Busca no acervo, Empréstimos, Reservas, Painel): troca o texto e a imagem com fade de 150 ms. A aba ativa usa o fundo `brand`.
- **Menu do celular**: abre em gaveta pela esquerda em 200 ms, com fundo escurecido que fecha ao clicar.

## Modo escuro

Os mesmos movimentos valem no escuro. A troca de tema não anima (corte seco), para não piscar.

## O que ainda não existe no Figma

- Hover de cards e botões como variantes.
- Abas de recursos como variantes.
- Menu do celular da landing.
