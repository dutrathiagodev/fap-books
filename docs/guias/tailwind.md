# Guia de Tailwind CSS

Documentação oficial: https://tailwindcss.com/docs (use a barra de busca: ela é muito boa).

## O que é

Tailwind é um jeito de **estilizar usando classes prontas direto no HTML**, em vez de escrever arquivos de CSS separados.

> Analogia: em vez de pedir "uma estante azul, com 30 cm de largura", você monta a estante escolhendo peças prontas: `azul` + `30cm` + `bordas arredondadas`. Cada peça é uma classe.

```tsx
<button className="px-6 py-3 bg-brand text-on-brand rounded-md">Salvar</button>
```

Lido em voz alta: *padding horizontal 6, padding vertical 3, fundo navy, texto branco, bordas bem arredondadas*.

## 1. As classes que você mais vai usar

| Para quê | Classe | Exemplo |
| -- | -- | -- |
| Espaço interno | `p-4`, `px-4`, `py-2` | `p-4` = 1rem (16px) em todos os lados |
| Espaço externo | `m-4`, `mt-2`, `mb-4` | `mt-2` = margem no topo |
| Espaço entre filhos | `gap-4` | Usado com `flex` ou `grid` |
| Cor do texto | `text-white`, `text-gray-600` | |
| Cor de fundo | `bg-white`, `bg-gray-100` | |
| Tamanho do texto | `text-sm`, `text-xl`, `text-3xl` | |
| Peso do texto | `font-light`, `font-bold` | |
| Bordas | `border`, `rounded-lg`, `rounded-full` | |
| Sombra | `shadow`, `shadow-md` | |
| Largura e altura | `w-full`, `h-24`, `min-h-screen` | |

A escala de números segue múltiplos de 4px: `p-1` = 4px, `p-2` = 8px, `p-4` = 16px, `p-8` = 32px.

## 2. Layout com Flexbox

`flex` coloca os filhos **lado a lado**; `flex-col`, **um embaixo do outro**.

```tsx
// src/components/BookRow.tsx
export function BookRow() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
      <span>Dom Casmurro</span>
      <span className="text-sm text-gray-600">Disponível</span>
    </div>
  );
}
```

- `items-center` alinha os filhos no meio na vertical.
- `justify-between` empurra um para cada ponta.
- `gap-4` dá 16px entre eles.

Centralizar uma coisa na tela inteira: `flex flex-col items-center justify-center min-h-screen`.

## 3. Cores e tokens do FAP Books

As cores, fontes, raios e sombras do projeto já são **nomes prontos** no `src/app/globals.css`. Use os nomes, **não** valores soltos como `bg-[#032B5E]`.

| Para quê | Classe | Valor |
| -- | -- | -- |
| Fundo da página | `bg-page` | branco |
| Fundo de cards | `bg-surface` | branco |
| Fundo suave | `bg-subtle` | navy 50 |
| Botão principal | `bg-brand` / `hover:bg-brand-hover` | navy 900 / navy 700 |
| Texto em cima do botão | `text-on-brand` | branco |
| Texto principal | `text-ink` | navy 950 |
| Texto secundário | `text-ink-muted` | cinza `#6B6B6B` |
| Borda comum | `border-line` | navy 200 |
| Borda de campo | `border-line-strong` | cinza `#8C8C8C` |
| Foco | `ring-focus` | navy 500 |
| Estados | `text-success-700 bg-success-100`, e o mesmo com `warning`, `danger`, `info` | |
| Escala completa | `bg-navy-50` até `bg-navy-950` | |

- **Raios:** `rounded-md` (8 px) em botões e campos, `rounded-lg` (12 px) em cards e modais.
- **Sombras:** `shadow-sm`, `shadow-md` e `shadow-lg`.
- **Fontes:** o texto já é Inter. Títulos `h1`, `h2` e `h3` já saem em Lora. Tamanhos: `text-h1-brand` (48, login), `text-h1` (36), `text-h2` (28) e `text-h3` (22).
- **Cinza `#8C8C8C`** só em bordas e ícones. Para texto use `text-ink-muted`, que tem contraste suficiente.

> Os valores vêm do Figma (coleções `Color`, `Spacing` e `Radius`) e estão em `docs/design/tokens/`. Mudou no Figma, muda aqui.

## 4. Estados: hover e foco

Coloque o estado antes da classe, com `:`

```tsx
<button className="bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 transition-colors">
  Entrar
</button>
```

- `hover:` quando o mouse passa por cima.
- `focus:` quando o campo ou botão está selecionado (importante para acessibilidade: não tire o indicador de foco sem colocar outro).
- `disabled:` quando está desativado, por exemplo `disabled:opacity-50`.

## 5. Responsivo: celular e computador

O Tailwind é **mobile first**: a classe sem prefixo vale para o celular, e os prefixos aplicam em telas maiores.

```tsx
// src/components/ResponsiveGrid.tsx
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
```

- Celular: 1 coluna.
- `md:` (a partir de ~768px): 2 colunas.
- `lg:` (a partir de ~1024px): 4 colunas.

O PRD exige que o sistema funcione no computador **e** no celular. Teste sempre nos dois (no navegador: F12 e o ícone de celular).

## 6. Como o Tailwind está ligado neste projeto

O arquivo `src/app/globals.css` começa com:

```css
@import "tailwindcss";
```

É o que liga o Tailwind 4. Você **não** precisa de arquivo `tailwind.config` para o básico. Importe o `globals.css` uma vez no `layout.tsx` (já está feito).

## Erros comuns

| Sintoma | Causa | Solução |
| -- | -- | -- |
| A classe não faz nada | Erro de digitação (`bg-bule`) | Confira o nome na documentação |
| Classe montada com texto (`` `text-${cor}-500` ``) não funciona | O Tailwind só enxerga classes escritas por inteiro | Escreva cada classe completa |
| O layout quebra no celular | Só testou no computador | Use `md:` e `lg:` e teste a tela estreita |
| Classe gigante e ilegível | Tudo no mesmo elemento | Quebre em componentes menores |

## Dicas de quem trabalha com Tailwind

1. **Extensão do VS Code:** Tailwind CSS IntelliSense. Ela sugere classes e mostra o CSS de cada uma ao passar o mouse.
2. **Não decore classes.** Pesquise na documentação: "padding", "flex", "grid".
3. **Componente em vez de copiar e colar.** Se a mesma lista de classes aparece três vezes, crie um componente (como o `Button`).
4. **Pense em espaço antes de cor.** Boa tela é espaçamento consistente: use a escala (`p-4`, `gap-4`, `mt-8`) e não valores soltos.
5. **Contraste.** Texto cinza claro em fundo branco é difícil de ler. Teste.
6. **Mobile first.** Faça o celular primeiro e depois adapte para telas maiores.

## No FAP Books

- Paleta, fontes e botões seguem o design do Figma (cards de **Design**). Os nomes estão no `globals.css` e na seção 3 deste guia.
- Cada **Bloco** de tela vira um componente com Tailwind, fiel ao frame do Figma.
