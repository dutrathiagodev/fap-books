# [FAP - 0138] Registrar reserva pedagógica presencial

Card do Trello: https://trello.com/c/WfItRsz2
Tela: **registrar reserva pedagógica presencial**.

## Como deve ser (visual)

- Reaproveite os componentes do 0135: muda só quem preenche.
- Siga `docs/design/stitch/DESIGN.md` (fonte de verdade visual). Nada de valores fora dele.
- Fundo branco, tema claro. Cards com borda `#C0D3ED` e cantos de 12 px; botões e campos com 8 px; grade de 4 px.
- Títulos em Lora SemiBold (H1 36 px nas páginas internas), todo o resto em Inter (corpo 16, botões e menus 14 Medium, legenda 12).
- Um único botão primário navy `#032B5E` por área. Texto secundário `#6B6B6B`, nunca `#8C8C8C`.
- Ícones Lucide, traço 1,5, 16/20/24 px. Estado = cor + ícone + texto (ex.: badge "Atrasado" vermelho com ícone).
- Telas em 1280 (desktop, prioridade), 768 e 375. Todo estado desenhado: padrão, vazio, carregando e erro, mais os específicos da tela.
- Textos em português do Brasil. Datas `dd/mm/aaaa`, moeda `R$ 1,00`.
