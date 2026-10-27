# FAP Books — Fluxo de telas de design

Como o time desenha as telas em **sequência**, sem ninguém esperar o outro. Cada pessoa tem um **fluxo**: telas que se conectam entre si, na ordem em que a pessoa usa o sistema. Este documento é a fonte do texto dos cards de design no Trello (cards `Design:`).

## 1. Por que um fluxo por pessoa

Telas soltas, uma para cada pessoa, não têm conexão: cada uma usa componentes e decisões que alguém ainda não terminou. Com um **fluxo por pessoa**, quem desenha a tela 2 já viu a tela 1 (foi ela mesma que fez), e o que sai de um fluxo é só o **molde** (0101), que fica pronto primeiro.

## 2. Quem faz o quê

| Pessoa | Fluxo | Ordem das telas |
|---|---|---|
| Julia | Estrutura e painel | 0101 → 0157 → 0147 |
| Francielio | Acesso e acervo (bibliotecária) | 0105 → 0113 → 0117 |
| Emanuel | Área do aluno e do professor | 0108 → 0213 |
| Breno | Balcão e acompanhamento | 0129 → 0144 → 0149 → 0153 |
| Igor | Usuários e reserva pedagógica | 0121 → 0126 → 0135 → 0138 → 0140 |

Telas já em Awaiting PR ou em andamento (0105, 0121, 0129, 0135) continuam com quem estava; o fluxo prossegue a partir delas.

## 3. Regras para manter a sequência

- **Um fluxo, uma pessoa.** Quem começou o fluxo continua nele; mexer na ordem exige combinar no grupo.
- **Siga a ordem do card.** Cada card diz "tela N de M", a anterior e a próxima. Comece a próxima tela do seu fluxo assim que **entregar** a atual (Awaiting PR), sem esperar o Done.
- **Só o molde bloqueia.** O layout base (0101) é desenhado primeiro, por quem tem o fluxo "Estrutura e painel". Enquanto ele não sai, as demais pessoas usam como referência o "Modelo de tela - Web 1440" que já existe no Figma.
- **Entrega com recado.** Ao entregar uma tela, preencha no card: link do projeto do Stitch, componentes **novos** criados e decisões que a próxima tela herda.
- **Reaproveite, não recrie.** Botão, campo, tabela, card de livro, badge, modal e alertas vêm da página `🧩 Components`. Componente novo só se não existir; avise o time.
- **Cruzamento entre fluxos.** Quando a sua tela usa algo de outro fluxo (ex.: o card de livro do 0108 no 0213), peça o link do Stitch; não espere a aprovação.
- **Dependência no Trello só quando é real.** O "Depende de" segura o card em Backlog até o anterior chegar em Done (depois da QA), o que recriaria a espera. Dentro do mesmo fluxo a ordem é combinada pelo texto do card e pela ordem na lista To Do.
- **Quem passa para o Figma é o Thiago.** O designer entrega o link do projeto do Stitch no card; o Thiago exporta para a página `🖥️ UI web`, dentro do molde, com nome `Tela - <nome> - Web 1440` e `Tela - <nome> - Celular 375`.
- **Dúvida de regra de negócio** (marcada como "a definir"): pergunte no grupo antes de desenhar uma suposição.

## 4. Regras visuais (valem para toda tela)

- Siga `docs/design/stitch/DESIGN.md` (fonte de verdade visual). Nada de valores fora dele.
- Fundo branco, tema claro. Cards com borda `#C0D3ED` e cantos de 12 px; botões e campos com 8 px; grade de 4 px.
- Títulos em Lora SemiBold (H1 36 px nas páginas internas), todo o resto em Inter (corpo 16, botões e menus 14 Medium, legenda 12).
- Um único botão primário navy `#032B5E` por área. Texto secundário `#6B6B6B`, nunca `#8C8C8C`.
- Ícones Lucide, traço 1,5, 16/20/24 px. Estado = cor + ícone + texto (ex.: badge "Atrasado" vermelho com ícone).
- Telas em 1280 (desktop, prioridade), 768 e 375. Todo estado desenhado: padrão, vazio, carregando e erro, mais os específicos da tela.
- Textos em português do Brasil. Datas `dd/mm/aaaa`, moeda `R$ 1,00`.

## 5. Texto padrão para o recado de entrega

Cole no comentário do card ao entregar:

```text
Entrega: [FAP - NNNN] <nome da tela>
Projeto no Stitch: <link>
Componentes novos: <lista ou "nenhum">
Decisões que a próxima tela herda: <lista>
Pendências / dúvidas de regra: <lista ou "nenhuma">
Próxima tela do meu fluxo: [FAP - NNNN]
```

## 6. Telas, uma a uma

### Estrutura e painel — Julia

Molde de todas as telas e a casa da bibliotecária: do layout base ao painel e aos avisos de prazo.

#### [FAP - 0101] Layout base e navegação (desktop e mobile) (tela 1 de 3)

**Perfil:** Todos os perfis  
**Recebe:** Base visual (0098) já entregue em código e no Figma.  
**Entrega:** Tela do molde por perfil (Stitch), para o 0157 e para todas as telas seguintes.

**Deve ter:**
- **Cabeçalho superior** branco (72 px): busca, sino de avisos com contador e menu do usuário (avatar com iniciais, nome, perfil e "Sair").
- **Menu lateral navy** `#032B5E` (240 px) com a logo branca no topo. Itens por perfil: Aluno e Professor: Início, Buscar livros, Meus empréstimos, Minhas reservas, Multas (professor também: Reserva pedagógica). Funcionário: Painel, Acervo, Usuários, Empréstimos, Reservas pedagógicas, Multas, Histórico, Relatórios.
- **Cabeçalho de página**: migalhas de pão, título H1, subtítulo em `#6B6B6B` e a ação principal à direita.
- **Área de conteúdo** com largura máxima de 1280 px, centralizada.
- **Celular**: cabeçalho com logo e botão `menu` que abre uma gaveta lateral navy com os mesmos itens.

**Estados:** Item de menu ativo (fundo `#0D3B6E` e barra clara à esquerda), hover e foco visível; Sino com e sem avisos; Menu da gaveta aberto e fechado; Menu em cada um dos 3 perfis.

**Visual:** O Figma já tem o "Modelo de tela - Web 1440" (Menu lateral, Cabeçalho e Cabeçalho de página): use-o de referência no Stitch e desenhe as variantes por perfil e a versão celular. Esta tela é o **molde**: toda outra tela é desenhada dentro dela.

#### [FAP - 0157] Painel da bibliotecária: visão geral (tela 2 de 3)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Molde do 0101.  
**Entrega:** Tela do painel (Stitch) com a faixa de avisos reservada para o 0147.

**Deve ter:**
- **4 cards de indicador** no topo: Emprestados, Atrasados, Disponíveis e Multas em aberto (número grande em Lora, rótulo em 12 px `#6B6B6B`, ícone de 20 px no canto).
- **Atalhos de operação**: Novo empréstimo (único botão primário), Registrar devolução, Cadastrar livro e Cadastrar usuário (secundários).
- **Lista de pendências**: reservas pedagógicas aguardando aprovação (link para a fila), devoluções de hoje e atrasados, cada um com badge de status.
- **Faixa de avisos de prazo** (a vencer, hoje, atrasado), que o card 0147 detalha.

**Estados:** Carregando (esqueleto nos 4 cards); Sem pendências ("Nenhuma pendência hoje"); Erro ao carregar.

**Regras:** Os indicadores contam livros emprestados, em atraso, disponíveis e multas em aberto.

**Visual:** Desenhar dentro do molde do 0101, com o menu do perfil Funcionário. Card de indicador: sem sombra forte, borda `#C0D3ED`.

#### [FAP - 0147] Avisos de prazo no painel (tela 3 de 3)

**Perfil:** Funcionário (painel) e Aluno/Professor (sino e Início)  
**Recebe:** Painel do 0157 (faixa de avisos).  
**Entrega:** Último card deste fluxo: entregar o link do Stitch e a lista de componentes novos ao time.

**Deve ter:**
- **Lista de avisos agrupada** em A vencer (até 2 dias), Vence hoje e Atrasado. Cada item: pessoa, livro, data de vencimento, dias de atraso, multa acumulada (R$ 1,00 por dia), badge de status e o atalho "Ver empréstimo".
- **Chips de filtro**: Todos, A vencer, Hoje, Atrasados.
- **Visão da pessoa** (aluno e professor): os próprios avisos no sino e um alerta inline no Início, com borda esquerda de 4 px na cor do estado.
- **Canais**: legenda informando que o aviso também sai por e-mail e WhatsApp (o canal WhatsApp ainda está em definição no PRD: não prometer na tela).

**Estados:** Vazio ("Nenhum prazo próximo"); Carregando; Erro; Aviso lido e não lido.

**Regras:** Atenção (âmbar) para a vencer; Erro (vermelho) para atrasado.

**Visual:** Alerta inline: fundo 100 do estado, borda esquerda 4 px, ícone e texto.

### Acesso e acervo (bibliotecária) — Francielio

Entrar no sistema e manter o acervo: login, listagem do acervo e formulário de livro (com importação em lote).

#### [FAP - 0105] Tela de login (tela 1 de 3)

**Perfil:** Todos os perfis  
**Recebe:** Início do fluxo (já em andamento).  
**Entrega:** Tela de login (Stitch) e a definição de a que tela cada perfil chega, para o 0113 e o 0108.

**Deve ter:**
- **Logo** centralizada (cerca de 220 px) e H1 de marca (Lora, 48 px; 36 no celular).
- **Formulário** com largura máxima de 384 px: E-mail e Senha (com botão mostrar/ocultar) e o botão "Entrar" de largura total.
- **Mensagem de erro** abaixo do formulário ("E-mail ou senha incorretos.", com ícone).
- Aviso curto "Não tem acesso? Procure a biblioteca": **não há cadastro público**, as contas são criadas pela bibliotecária.
- Link "Esqueci minha senha": **não consta no PRD**; deixar fora até o time decidir.

**Estados:** Carregando (botão vira "Entrando..." e desabilita); Erro de credenciais; Campo vazio ou inválido; Foco visível em cada campo.

**Regras:** Depois do login, cada perfil vai para a própria área: aluno, professor e funcionário.

**Visual:** Fundo branco, sem imagens decorativas, sem gradiente.

#### [FAP - 0113] Listagem do acervo (bibliotecária) (tela 2 de 3)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Login e molde (Stitch).  
**Entrega:** "Novo livro" e "Editar" abrem o formulário do 0117; "Importar planilha" abre a aba de importação do 0117.

**Deve ter:**
- **Tabela** com Título, Autor, Categoria, Código/ISBN, Quantidade, Disponíveis e Status (badge). Linhas de 56 px, cabeçalho `#EFF4FA`, hover `#DFE9F6`.
- **Barra acima da tabela**: busca, filtros (categoria e status), botão primário "Novo livro" e botão secundário "Importar planilha".
- **Ações por linha**: ver, editar (`pencil`) e excluir (`trash-2`), com tooltip.
- **Paginação** (anterior, números, próxima) e "Mostrando 1–10 de 240".
- **Modal de exclusão** com botão de perigo e confirmação.

**Estados:** Vazio ("Nenhum livro cadastrado" com botão de ação); Sem resultado de busca; Carregando (esqueleto); Erro; Celular: a tabela vira lista de cards.

**Regras:** livro com histórico (empréstimo ou reserva) não é excluído, é **inativado**; desenhar o botão excluir desabilitado com tooltip "Livro com histórico: use Inativar". A exclusão de livro sem histórico pede uma segunda confirmação digitando o nome do livro.

**Visual:** Badges: Disponível (sucesso), Emprestado (informação), Reservado (atenção).

#### [FAP - 0117] Formulário de cadastro e edição de livro (tela 3 de 3)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Listagem do 0113 (ações Novo e Editar).  
**Entrega:** Tela do formulário e da importação (Stitch), para o time de blocos.

**Deve ter:**
- **Formulário** em página com cabeçalho e migalhas, card com largura máxima de 720 px: Título*, Autor*, Categoria* (select), Código/ISBN*, Quantidade* (número), Status e capa opcional (upload).
- **Botões**: "Salvar" (primário) e "Cancelar" (secundário). Modo edição vem preenchido.
- **Aba "Importar planilha"** (cadastro em lote): envio de `.csv` ou `.xlsx`, link para baixar a planilha modelo, resumo do resultado (importados e com erro) e tabela de erros por linha, para corrigir e reenviar.

**Estados:** Erro por campo (borda `#B91C1C`, mensagem de 12 px com ícone); Erro do servidor (alerta inline); Salvando; Sucesso (toast "Livro cadastrado"); Importação: sem erros, com erros, arquivo inválido.

**Regras:** Campos marcados com * são obrigatórios.

**Visual:** Rótulo acima do campo, ajuda em 12 px `#6B6B6B` abaixo.

### Área do aluno e do professor — Emanuel

O que quem pega livro enxerga: pesquisa e detalhe do livro, e a área pessoal (empréstimos, renovação, reservas e multas).

#### [FAP - 0108] Pesquisa de livros e detalhe do livro (tela 1 de 2)

**Perfil:** Aluno e Professor (consulta pública)  
**Recebe:** Login e molde (Stitch), perfil Aluno/Professor.  
**Entrega:** Tela do detalhe (Stitch), que o 0213 reaproveita (card de livro e badge).

**Deve ter:**
- **Busca**: campo grande no topo, filtros em chips (categoria e status) e paginação.
- **Grade de cards de livro**: capa vertical 2:3 (raio 8), título em Lora 18 px, autor em `#6B6B6B`, categoria em chip, badge de disponibilidade e botão "Ver detalhes".
- **Detalhe do livro**: capa grande, título H1, autor, categoria, código/ISBN, "X de Y disponíveis", badge de status e migalhas. Botão "Reservar" quando indisponível (aluno) e "Solicitar reserva pedagógica" (professor).
- Visão do aluno e do professor diferem só no botão de reserva.

**Estados:** Sem resultado ("Nenhum livro encontrado. Tente outro título ou autor."); Carregando (esqueletos dos cards); Erro; Livro disponível, emprestado e reservado.

**Regras:** Status vem em tempo real: disponível, emprestado ou reservado.

**Visual:** Card clicável ganha sombra média no hover.

#### [FAP - 0213] Área do aluno: meus empréstimos, renovação, reservas e multas (tela 2 de 2)

**Perfil:** Aluno e Professor  
**Recebe:** Pesquisa e detalhe do 0108.  
**Entrega:** Fim do fluxo: link do Stitch e lista de componentes novos.

**Deve ter:**
- **Início**: resumo (empréstimos ativos "X de 3", próximo vencimento, multa em aberto) e os avisos de prazo.
- **Meus empréstimos**: lista com livro, retirado em, vence em, dias restantes, badge (Emprestado ou Atrasado), multa acumulada e botão "Renovar" (desabilitado com explicação quando há atraso ou multa).
- **Modal de renovação**: mostra o novo prazo e pede confirmação.
- **Minhas reservas**: livro, estado, data e "Cancelar reserva".
- **Multas**: valor, dias de atraso e status (Em aberto ou Paga), com a nota "Pagamento presencial na biblioteca".
- **Alertas**: "Limite de 3 livros atingido" e "Usuário com multa em aberto: empréstimo bloqueado".

**Estados:** Vazio em cada seção; Carregando; Erro; Renovação bloqueada; Celular: tabelas viram cards.

**Regras:** Prazo padrão 7 dias, limite de 3 livros, multa de R$ 1,00 por dia; sem pagamento online.

**Visual:** Reaproveitar o card de livro, os badges e a tabela do design system.

### Balcão e acompanhamento — Breno

O dia a dia do balcão: empréstimo e devolução, multa gerada, histórico e relatórios.

#### [FAP - 0129] Registro de empréstimo, devolução e renovação (tela 1 de 4)

**Perfil:** Funcionário da biblioteca (balcão)  
**Recebe:** Molde do 0101 (perfil Funcionário).  
**Entrega:** A multa gerada na devolução leva ao 0144: combinar o texto e o atalho.

**Deve ter:**
- **Abas**: Empréstimo, Devolução e Renovação.
- **Empréstimo em passos curtos**: 1) buscar usuário (card com avatar, perfil, empréstimos ativos "X de 3" e pendências); 2) buscar livro (com badge de disponibilidade); 3) resumo com a data de devolução (hoje + 7 dias); 4) confirmar; 5) comprovante com "Novo empréstimo".
- **Devolução**: buscar por livro ou usuário, lista dos empréstimos abertos e "Registrar devolução". Com atraso, mostrar a multa calculada (R$ 1,00 x dias) e o atalho para dar baixa.
- **Renovação**: escolher o empréstimo e confirmar o novo prazo.
- **Alertas visíveis**: limite de 3 livros, usuário com multa em aberto (bloqueia o botão confirmar) e livro indisponível.

**Estados:** Sem resultado na busca; Carregando; Erro; Confirmação concluída (comprovante); Passo bloqueado por pendência.

**Regras:** Prazo 7 dias; limite 3 livros; atraso gera multa de R$ 1,00 por dia.

**Visual:** Operação do balcão: poucos cliques, botão primário sempre no fim do passo.

#### [FAP - 0144] Multas: baixa manual do pagamento (tela 2 de 4)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Devolução com atraso do 0129.  
**Entrega:** Tela da lista e do modal (Stitch); o histórico (0149) mostra a multa de cada empréstimo.

**Deve ter:**
- **Lista de multas**: usuário, livro, dias de atraso, valor (R$), status (badge Em aberto ou Paga) e data do pagamento.
- **Chips de filtro** (Em aberto, Pagas) e busca por usuário.
- **Ação "Dar baixa"** abre um modal: resumo (usuário, valor, dias) e a confirmação "Recebi R$ X presencialmente", com botão primário "Registrar pagamento".
- Depois da baixa, o badge vira Paga e aparece quem registrou e quando.

**Estados:** Vazio ("Nenhuma multa em aberto"); Carregando; Erro; Baixa concluída (toast).

**Regras:** Pagamento é presencial e manual (sem pagamento online). A baixa libera o usuário para novos empréstimos.

**Visual:** Valores em Inter 500 alinhados à direita. Badge Em aberto vermelho e Paga verde, com ícone.

#### [FAP - 0149] Histórico de empréstimos por usuário e por livro (tela 3 de 4)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Lista de multas do 0144 (link para o histórico).  
**Entrega:** Tela da tabela de histórico (Stitch), que o 0153 reaproveita nos relatórios.

**Deve ter:**
- **Duas abas**: Por usuário e Por livro, cada uma com busca.
- **Cabeçalho do resultado** (a pessoa ou o livro) e **tabela cronológica**: livro ou usuário, retirada, vencimento, devolução, status (badge) e multa.
- **Filtros** por período e status, e paginação.

**Estados:** Vazio ("Sem empréstimos registrados"); Carregando; Erro; Empréstimo atrasado e devolvido.

**Regras:** O histórico guarda quem realizou cada ação e quando.

**Visual:** Linhas alternadas em `#EFF4FA` não são necessárias: use borda inferior `#C0D3ED`.

#### [FAP - 0153] Relatórios: atraso, acervo e reservas (tela 4 de 4)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Tabela do histórico do 0149.  
**Entrega:** Fim do fluxo do Breno: link do Stitch e componentes novos.

**Deve ter:**
- **Três abas**: Livros em atraso, Acervo e Reservas pedagógicas.
- **Em atraso**: usuário, livro, dias de atraso e multa acumulada.
- **Acervo**: título, estoque total e quantidade disponível.
- **Reservas pedagógicas**: totais de solicitações, aprovações e recusas, e tabela por período.
- **Filtro de período** (data inicial e final) e **cards de total** no topo de cada aba.

**Estados:** Vazio; Carregando; Erro; Período sem dados.

**Regras:** Relatório de acervo é desejável (P2); atraso e reservas são importantes (P1).

**Visual:** Mesmos tabela, chips e paginação do histórico (0149).

### Usuários e reserva pedagógica — Igor

Cadastro e gestão de usuários, e todo o ciclo da reserva pedagógica: solicitar, registrar presencial e aprovar.

#### [FAP - 0121] Cadastro de usuários (aluno, professor e funcionário) (tela 1 de 5)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Molde do 0101.  
**Entrega:** O formulário é a base da edição no 0126.

**Deve ter:**
- **Seletor de perfil** (Aluno, Professor, Funcionário da biblioteca) que muda os campos.
- **Campos**: Nome*, E-mail* e Telefone (WhatsApp, para os avisos). Funcionário também tem **Cargo*** (ex.: chefe da biblioteca, auxiliar). Outros campos: confirmar com o time.
- **Botões**: "Salvar" (primário) e "Cancelar".

**Estados:** Erro por campo; Salvando; Sucesso (toast); E-mail já cadastrado.

**Regras:** Cada perfil recebe as regras do próprio perfil (aluno e professor: 7 dias e 3 livros; reserva pedagógica só professor).

**Visual:** Mesmo formulário e componentes do cadastro de livro (0117).

#### [FAP - 0126] Listagem, edição e inativação de usuários (tela 2 de 5)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Formulário do 0121.  
**Entrega:** Tela da listagem e do modal (Stitch), para o time de blocos.

**Deve ter:**
- **Tabela**: Nome, E-mail, Perfil (badge), Cargo (funcionários), Status (Ativo ou Inativo) e empréstimos ativos.
- **Barra**: busca, filtros por perfil e status, botão primário "Novo usuário".
- **Ações por linha**: editar (reaproveita o formulário do 0121) e inativar (botão de perigo).
- **Modal de inativação**: "Inativar impede novos empréstimos e mantém o histórico", com Cancelar e confirmação.

**Estados:** Vazio; Sem resultado de busca; Carregando; Erro; Usuário inativo (linha esmaecida com badge).

**Regras:** Inativar não apaga: o histórico fica.

**Visual:** Mesma tabela do acervo (0113), para o time reaproveitar o bloco.

#### [FAP - 0135] Solicitar reserva pedagógica (professor) (tela 3 de 5)

**Perfil:** Professor  
**Recebe:** Pesquisa e detalhe (botão Solicitar reserva pedagógica).  
**Entrega:** A solicitação entra na fila do 0140; o 0138 repete o fluxo no balcão.

**Deve ter:**
- **Formulário**: seleção de um ou mais livros (busca e lista dos escolhidos), data de início do uso e **prazo de posse em dias (máximo 30)**. Campo "Disciplina" opcional (confirmar com o time).
- **Resumo** antes de enviar e botão "Enviar solicitação".
- **Alerta informativo**: "A reserva precisa ser aprovada pela bibliotecária". Link "Prefere solicitar no balcão?".
- **Minhas reservas pedagógicas**: lista com status (Aguardando aprovação, Aprovada, Recusada com a justificativa) e "Renovar" ao fim do prazo.

**Estados:** Prazo acima de 30 dias (erro); Livro indisponível no período; Enviado (toast e vai para a lista); Carregando; Vazio.

**Regras:** Solicitação antecipada; renovar exige nova aprovação.

**Visual:** Badges: Aguardando (atenção), Aprovada (sucesso), Recusada (erro).

#### [FAP - 0138] Registrar reserva pedagógica presencial (tela 4 de 5)

**Perfil:** Funcionário da biblioteca  
**Recebe:** Solicitação do 0135.  
**Entrega:** Origem "Presencial" aparece na fila do 0140: combinar o badge.

**Deve ter:**
- **Passos**: 1) buscar o professor; 2) escolher os livros; 3) definir o prazo (máximo 30 dias); 4) registrar.
- **Resumo** e botão primário "Registrar solicitação".
- A solicitação **entra na mesma fila de aprovação** do 0140, com a origem marcada como "Presencial" (badge).

**Estados:** Professor não encontrado; Prazo acima de 30 dias; Livro indisponível; Registrado (toast); Carregando.

**Regras:** A aprovação continua sendo sempre da bibliotecária ou chefe.

**Visual:** Reaproveite os componentes do 0135: muda só quem preenche.

#### [FAP - 0140] Fila de aprovação de reservas pedagógicas (tela 5 de 5)

**Perfil:** Funcionário da biblioteca (chefe ou auxiliar)  
**Recebe:** Solicitações do 0135 e do 0138.  
**Entrega:** Fim do fluxo do Igor: link do Stitch e componentes novos.

**Deve ter:**
- **Lista de pendentes**: professor, livros, período, prazo em dias, origem (Online ou Presencial), data da solicitação e tipo (Nova ou Renovação).
- **Ações**: "Aprovar" (primário) e "Recusar" (perigo, abre modal com **justificativa obrigatória**).
- **Painel de detalhe** com a disponibilidade dos livros no período pedido, para ver conflitos.
- **Chips**: Pendentes, Aprovadas, Recusadas.

**Estados:** Vazio ("Nenhuma solicitação pendente"); Carregando; Erro; Conflito de disponibilidade; Aprovada e recusada.

**Regras:** Renovação exige nova aprovação. A decisão registra quem decidiu e quando.

**Visual:** Badges de origem e de tipo em pílula; Aprovar sempre o único botão primário da linha.

## 7. Pontos em aberto

- Excluir livro com empréstimo ativo (0113): regra a definir.
- Esqueci minha senha (0105): não está no PRD.
- Canal WhatsApp dos avisos (0147): mecanismo ainda em definição.
- Campos extras do cadastro de usuário (0121) e "Disciplina" na reserva pedagógica (0135): confirmar com o time.
