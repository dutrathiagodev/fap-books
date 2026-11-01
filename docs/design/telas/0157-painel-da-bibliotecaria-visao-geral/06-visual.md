# [FAP - 0157] Painel da bibliotecária: visão geral

Card do Trello: https://trello.com/c/JIFPkDHt
Tela: **painel da bibliotecária: visão geral**.

## Como deve ser (visual)

- Desenhar dentro do molde do 0101, com o menu do perfil Funcionário.
- Card de indicador: sem sombra forte, borda `#C0D3ED`.
- Siga `docs/design/stitch/DESIGN.md` (fonte de verdade visual). Nada de valores fora dele.
- Fundo branco, tema claro. Cards com borda `#C0D3ED` e cantos de 12 px; botões e campos com 8 px; grade de 4 px.
- Títulos em Lora SemiBold (H1 36 px nas páginas internas), todo o resto em Inter (corpo 16, botões e menus 14 Medium, legenda 12).
- Um único botão primário navy `#032B5E` por área. Texto secundário `#6B6B6B`, nunca `#8C8C8C`.
- Ícones Lucide, traço 1,5, 16/20/24 px. Estado = cor + ícone + texto (ex.: badge "Atrasado" vermelho com ícone).
- Telas em 1280 (desktop, prioridade), 768 e 375. Todo estado desenhado: padrão, vazio, carregando e erro, mais os específicos da tela.
- Textos em português do Brasil. Datas `dd/mm/aaaa`, moeda `R$ 1,00`.
