# Design System — FAP Books

Sistema de gestão e empréstimo de livros da Biblioteca da Faculdade Adventista do Paraná (FAP). Este arquivo é a fonte de verdade visual para o Stitch. Toda tela nova, de qualquer perfil, segue estas regras. Nunca invente valores fora daqui.

## 1. Visão geral

**Personalidade:** institucional, acadêmica, séria e confiável, mas acolhedora. É uma ferramenta de trabalho: o aluno consulta rápido e a bibliotecária opera no balcão o dia inteiro. A identidade é azul navy com muito branco, títulos em serifa (Lora) e texto em sans-serif (Inter).

**Sensação desejada:** calma, organizada, legível. Interface limpa, com bastante espaço em branco, sem decoração gratuita. Nada de neon, gradientes chamativos, ilustrações infantis ou emojis.

**Idioma da interface:** português do Brasil, tom direto e respeitoso. Datas no formato `dd/mm/aaaa`, moeda `R$ 1,00`.

**Perfis (cada um com seu menu):**
- **Aluno:** consulta o acervo, vê seus empréstimos, prazos e multas, renova e reserva.
- **Professor:** o mesmo do aluno, mais a reserva pedagógica (até 30 dias).
- **Funcionário da biblioteca (bibliotecária):** painel administrativo, acervo, usuários, empréstimos e devoluções, multas, fila de aprovação, relatórios.

**Prioridade de plataforma:** web e desktop primeiro (balcão da biblioteca). O celular também funciona e precisa ficar bom, mas é secundário. Tema **claro** apenas. O tema escuro ainda não foi desenhado: não crie.

## 2. Logo

- Símbolo: livro aberto estilizado combinado com a letra "A", com o texto **FAP BOOKS** em caixa alta e peso forte (a imagem inteira lê "FAP" grande em cima, "BOOKS" embaixo).
- Cor no tema claro: navy `#032B5E` sobre fundo branco. Sobre fundo navy: branca.
- Proporção do arquivo: 1033 × 715 (largura × altura). Nunca distorcer.
- Use a logo no cabeçalho (altura pequena, uns 32 a 40 px), na tela de login (grande, centralizada, uns 220 px de largura) e no menu lateral.
- Não recolorir, não pôr sombra, não colocar sobre foto sem uma camada navy.

## 3. Cores

### 3.1 Escala navy (marca)

| Token | Hex | Uso típico |
| -- | -- | -- |
| navy-50 | `#EFF4FA` | Fundo sutil de seções, linhas alternadas de tabela, faixas |
| navy-100 | `#DFE9F6` | Item selecionado, hover de linha, chip neutro |
| navy-200 | `#C0D3ED` | Borda padrão de cards, campos e divisores |
| navy-300 | `#90B3DF` | Ícones decorativos, foco suave |
| navy-400 | `#598DCF` | Hover de link |
| navy-500 | `#3075CF` | Links, anel de foco, ícones de ação |
| navy-600 | `#215DAB` | Intermediário |
| navy-700 | `#154A8E` | Hover do botão principal |
| navy-800 | `#0D3B6E` | Superfícies de destaque (cabeçalho escuro, banners) |
| navy-900 | `#032B5E` | **Cor da marca.** Botão principal, menu lateral, títulos de destaque |
| navy-950 | `#031730` | Texto principal |

### 3.2 Cinzas

| Token | Hex | Uso |
| -- | -- | -- |
| gray-600 | `#6B6B6B` | Texto secundário (contraste 5,3:1 sobre branco) |
| gray-500 | `#8C8C8C` | **Só** bordas fortes e ícones. Nunca para texto |

### 3.3 Estados (texto em 700, fundo em 100)

| Estado | Fundo | Texto | Quando |
| -- | -- | -- | -- |
| Sucesso | `#DCFCE7` | `#15803D` | Devolvido, pago, aprovado, disponível |
| Atenção | `#FEF3C7` | `#B45309` | A vencer, reservado, pendente de aprovação |
| Erro | `#FEE2E2` | `#B91C1C` | Atrasado, multa em aberto, recusado, erro de formulário |
| Informação | `#E0F2FE` | `#0369A1` | Emprestado, avisos neutros, dicas |

### 3.4 Cores de uso (nomes semânticos, é com estes que se pinta a tela)

| Papel | Valor | Observação |
| -- | -- | -- |
| page | `#FFFFFF` | Fundo da página |
| surface | `#FFFFFF` | Cards, modais, campos |
| subtle | `#EFF4FA` | Fundo de áreas secundárias |
| selected | `#DFE9F6` | Item ativo ou selecionado |
| brand | `#032B5E` | Ação principal |
| brand-hover | `#154A8E` | Hover da ação principal |
| ink (texto principal) | `#031730` | Títulos e corpo |
| ink-muted (texto secundário) | `#6B6B6B` | Legendas, rótulos auxiliares |
| on-brand | `#FFFFFF` | Texto sobre navy |
| link | `#3075CF` | Links |
| line (borda padrão) | `#C0D3ED` | Cards, campos, divisores |
| line-strong | `#8C8C8C` | Borda de campo em destaque |
| focus | `#3075CF` | Anel de foco de 2 px |

**Regras de cor:**
- O navy `#032B5E` é a única cor de ação principal. Use no máximo **um** botão primário por área.
- Estado nunca depende só de cor: sempre acompanha ícone e texto ("Atrasado", "Devolvido").
- Texto secundário é `#6B6B6B`. Nunca use `#8C8C8C` em texto.
- Sem preto puro (`#000`). O "preto" do sistema é `#031730`.

## 4. Tipografia

- **Títulos:** Lora, peso SemiBold (600). Só em H1, H2 e H3.
- **Todo o resto:** Inter. Corpo em Regular (400), menus e botões em Medium (500).

| Estilo | Fonte | Tamanho / linha | Uso |
| -- | -- | -- | -- |
| H1 marca | Lora 600 | 48 / 56 px | Login e capa |
| H1 | Lora 600 | 36 / 44 px | Título de página interna |
| H2 | Lora 600 | 28 / 36 px | Seção |
| H3 | Lora 600 | 22 / 30 px | Subseção, título de card e de modal |
| Corpo | Inter 400 | 16 px | Texto corrido, campos, tabelas |
| Menu e botão | Inter 500 | 14 px | Itens de menu, botões, abas, rótulos de campo |
| Legenda | Inter 400 | 12 px | Ajuda, metadados, data, contadores |

No celular, reduza H1 para 28 a 32 px e mantenha o resto.

## 5. Espaçamento e grade

Grade de **4 px**. Valores permitidos: 4, 8, 12, 16, 24, 32, 48, 64.

- Espaço entre campos de um formulário: 16.
- Padding interno de card: 24 (desktop) e 16 (celular).
- Espaço entre seções da página: 48 ou 64.
- Largura máxima do conteúdo: 1280 px, centralizado.
- Telas de referência: **celular 375, tablet 768, desktop 1280**.

## 6. Cantos e sombras

| Elemento | Raio |
| -- | -- |
| Botões e campos | 8 px |
| Cards, modais, painéis | 12 px |
| Chips pequenos, checkbox | 4 px |
| Avatar, badge de status, pílula | totalmente redondo (9999) |

Sombras (cor base navy-950, nunca preta):
- **sm:** `0 1px 2px rgba(3,23,48,0.10)` — campos e cards em repouso
- **md:** `0 4px 8px rgba(3,23,48,0.12)` — cards com hover, menus suspensos
- **lg:** `0 12px 24px rgba(3,23,48,0.16)` — modais e popovers

Prefira borda de 1 px (`#C0D3ED`) a sombra forte. Superfícies planas e limpas.

## 7. Ícones

- Biblioteca: **Lucide**. Nenhuma outra.
- Tamanhos: 16, 20 ou 24 px. Traço sempre **1,5 px**.
- Cor herda do texto. Em ação, `#3075CF`. Decorativo, `#8C8C8C`.
- Ícone ao lado de texto: decorativo. Ícone sozinho no botão: precisa de rótulo acessível (tooltip).
- Sugestões: `book-open`, `book`, `library`, `search`, `user`, `users`, `calendar`, `clock`, `bell`, `alert-triangle`, `check-circle`, `x-circle`, `plus`, `pencil`, `trash-2`, `filter`, `download`, `upload`, `log-out`, `menu`, `chevron-down`, `chevron-right`, `layout-dashboard`, `repeat` (renovar), `undo-2` (devolver), `receipt` (multa).

## 8. Componentes

### Botão
- **Primário:** fundo `#032B5E`, texto branco, Inter 500 14 px, raio 8, padding 12 × 24 (altura ~44), hover `#154A8E`. Ocupa a largura toda em formulários e no celular.
- **Secundário:** fundo branco, borda `#C0D3ED` 1 px, texto `#032B5E`, hover fundo `#EFF4FA`.
- **Texto (link):** sem fundo, texto `#3075CF`, sublinhado no hover.
- **Perigo:** fundo `#FEE2E2`, texto `#B91C1C`, borda `#B91C1C` só em ações destrutivas (excluir, inativar). Confirma sempre em modal.
- **Desabilitado:** 50% de opacidade, cursor bloqueado.
- **Carregando:** texto muda ("Entrando...") e o botão fica desabilitado.
- Foco: anel de 2 px `#3075CF` com 2 px de espaço.

### Campo de formulário
- Rótulo acima, Inter 500 14 px. Campo: fundo branco, borda `#C0D3ED` (ou `#8C8C8C` quando em destaque), raio 8, padding 12 × 16, texto 16 px.
- Foco: borda e anel `#3075CF`.
- Erro: borda `#B91C1C`, mensagem abaixo em 12 px `#B91C1C` com ícone. Ex.: "E-mail ou senha incorretos."
- Ajuda: 12 px `#6B6B6B` abaixo do campo.
- Variações: texto, e-mail, senha (com botão mostrar/ocultar), número, data, select, busca (ícone `search` à esquerda), textarea, upload de capa.

### Card
- Fundo branco, borda `#C0D3ED`, raio 12, padding 24, sombra sm. Hover clicável: sombra md.
- **Card de livro:** capa vertical (proporção 2:3, raio 8), título em Lora 18 px (H3 menor), autor em `#6B6B6B`, categoria em chip, badge de disponibilidade, botão "Ver detalhes".
- **Card de indicador (painel):** número grande em Lora, rótulo em 12 px `#6B6B6B`, ícone no canto em 20 px. Ex.: Emprestados, Atrasados, Disponíveis, Multas em aberto.

### Badge de status (pílula)
Fundo 100 + texto 700 do estado, 12 px Medium, padding 4 × 12, com ícone de 16 px.
- Disponível → sucesso. Emprestado → informação. Reservado → atenção. Atrasado → erro. Devolvido → sucesso. Aguardando aprovação → atenção. Recusada → erro. Multa paga → sucesso. Multa em aberto → erro.

### Tabela
- Cabeçalho com fundo `#EFF4FA`, texto Inter 500 14 px. Linhas com borda inferior `#C0D3ED`. Hover `#DFE9F6`. Altura de linha 56 px.
- Ações por linha à direita (ícones `pencil`, `trash-2`, `repeat`), com tooltip.
- Acima: busca + filtros + botão primário "Novo". Abaixo: paginação (anterior, números, próxima) e "Mostrando 1–10 de 240".
- Celular: a tabela vira lista de cards empilhados.

### Modal
- Fundo da camada `rgba(3,23,48,0.5)`. Painel branco, raio 12, sombra lg, largura 480 a 560 px, padding 24.
- Título H3 (Lora), texto, rodapé com **Cancelar** (secundário) à esquerda do botão de confirmação. Exclusão usa botão de perigo.
- Fecha com X, Esc e clique fora (exceto em ações destrutivas).

### Alertas e avisos (inline)
Faixa com fundo 100 do estado, borda esquerda de 4 px na cor 700, ícone, título em Medium e texto. Ex.: "Limite de 5 livros atingido", "Usuário com multa em aberto: empréstimo bloqueado".

### Toast
Canto superior direito, mesmo visual do alerta, some em 5 s.

### Navegação
- **Desktop:** menu lateral navy `#032B5E` (240 px) com logo branca no topo, itens em branco 14 px Medium, item ativo com fundo `#0D3B6E` e barra clara à esquerda. Cabeçalho superior branco com busca, sino de avisos e menu do usuário (avatar + nome + perfil).
- **Celular:** cabeçalho com logo e botão `menu` que abre gaveta lateral navy. Ações principais em botão fixo na base quando fizer sentido.
- **Menu por perfil:**
  - Aluno/Professor: Início, Buscar livros, Meus empréstimos, Minhas reservas, Multas. (Professor: + Reserva pedagógica.)
  - Funcionário: Painel, Acervo, Usuários, Empréstimos, Reservas pedagógicas, Multas, Histórico, Relatórios.
- Migalhas de pão em páginas de detalhe.

### Abas, filtros e chips
Abas com sublinhado de 2 px navy na ativa. Chips de filtro com raio total, fundo `#EFF4FA`, ativo `#DFE9F6` com borda `#032B5E`.

### Estados vazios e carregamento
- **Vazio:** ícone Lucide grande (48 px, `#90B3DF`), título H3, uma frase, botão de ação. Ex.: "Nenhum livro encontrado. Tente outro título ou autor."
- **Carregando:** esqueleto (skeleton) em `#DFE9F6` pulsando, no formato do conteúdo.

### Avatar
Círculo, iniciais em Inter 500 sobre `#DFE9F6` com texto `#032B5E`, tamanhos 32 e 40 px.

## 9. Padrões de tela

- **Página interna:** menu lateral + cabeçalho + título H1 (36 px) com subtítulo em `#6B6B6B` + ação principal à direita + conteúdo em cards.
- **Login:** fundo branco, logo centralizada (220 px), formulário com largura máxima 384 px, campos E-mail e Senha, botão "Entrar" de largura total, mensagem de erro abaixo. Sem cadastro público: contas são criadas pela bibliotecária.
- **Painel da bibliotecária:** 4 cards de indicador no topo, atalhos de operação (Novo empréstimo, Registrar devolução, Cadastrar livro, Cadastrar usuário), lista de pendências e avisos de prazo (a vencer, hoje, atrasado).
- **Busca de livros:** campo grande no topo, filtros (categoria, status), grade de cards de livro, paginação.
- **Operação de balcão (empréstimo/devolução):** fluxo em passos curtos: buscar usuário → buscar livro → resumo com prazo de devolução (7 dias) → confirmar → comprovante. Alertas de limite (5 livros) e atraso visíveis antes de confirmar.

## 10. Regras de negócio que aparecem na interface

- Prazo padrão de empréstimo: **7 dias**. Limite: **5 livros** simultâneos por usuário.
- Multa: **R$ 1,00 por dia de atraso**. Pagamento presencial, baixa manual pela bibliotecária (sem pagamento online).
- Usuário com atraso ou multa em aberto fica **bloqueado** para novo empréstimo.
- Reserva pedagógica: só professor, com solicitação antecipada, prazo escolhido por ele (**máximo 30 dias**), aprovação ou recusa (com justificativa) pela bibliotecária. Renovação exige nova aprovação.
- Status do livro: disponível, emprestado, reservado.
- Avisos de prazo por WhatsApp, e-mail e painel.

## 11. Acessibilidade

- Contraste mínimo AA (4,5:1 no texto). Texto secundário `#6B6B6B`, nunca mais claro.
- Alvos de toque de pelo menos 44 × 44 px no celular.
- Foco sempre visível (anel `#3075CF` de 2 px).
- Campos com rótulo visível. Erro com texto, não só cor.
- Respeitar `prefers-reduced-motion`. Animações curtas (150 a 200 ms).

## 12. Faça e não faça

**Faça**
- Fundo branco, cards com borda `#C0D3ED` e cantos de 12 px.
- Um único botão primário navy por área.
- Títulos em Lora, o resto em Inter.
- Ícones Lucide com traço 1,5.
- Estados sempre com cor + ícone + texto.
- Reaproveitar os componentes acima ao criar uma tela nova.

**Não faça**
- Não use outras cores de marca (verde, roxo, laranja) nem gradientes.
- Não use texto em `#8C8C8C`.
- Não use raio fora de 4, 8, 12 ou total.
- Não use outra fonte, nem Lora em texto corrido.
- Não use emojis, ilustrações infantis ou elementos de jogo (XP, vidas, medalhas).
- Não desenhe tema escuro.
- Não invente espaçamentos fora da grade de 4 px.
