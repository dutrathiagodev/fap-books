Crie um layout completo para um sistema web de gestão e empréstimo de livros da biblioteca de uma faculdade, com visual institucional, limpo e confiável.

O nome do produto é: FAP Books.
Instituição: Biblioteca da Faculdade Adventista do Paraná (FAP).

Siga à risca o arquivo DESIGN.md (design system do FAP Books). Ele define cores, fontes, espaçamento, cantos, sombras, ícones e componentes. Não invente valores fora dele. Todas as telas, as atuais e as futuras, devem usar exatamente o mesmo padrão visual para manter a continuidade.

Objetivo do sistema:
Digitalizar e centralizar o fluxo da biblioteca, hoje feito de forma manual: cadastro do acervo, cadastro de alunos, professores e funcionários, empréstimos, devoluções, renovações, reservas, reserva pedagógica de professores, controle de prazos e multas por atraso. O produto une uma área de consulta ao acervo (para alunos e professores) e uma área administrativa para a bibliotecária.

Estilo visual:
- Visual institucional, sério, limpo e acolhedor. Ferramenta de trabalho, não um jogo.
- Identidade azul navy com muito branco.
- Fundo branco, tema claro apenas (não crie tema escuro).
- Cards com borda fina azul-clara e cantos de 12 px.
- Botões e campos com cantos de 8 px.
- Títulos em fonte serifada Lora (SemiBold), todo o resto em Inter.
- Ícones Lucide com traço de 1,5 px.
- Bastante espaço em branco, grade de 4 px.
- Prioridade para web e desktop (balcão da biblioteca). O celular deve funcionar bem, mas é secundário.
- Telas de referência: desktop 1280, tablet 768 e celular 375.
- Sem gradientes, sem emojis, sem ilustrações infantis, sem XP, vidas ou medalhas.

Paleta (oficial, do Figma):
- Navy principal da marca: #032B5E (botão primário, menu lateral)
- Navy de superfícies e destaques: #0D3B6E
- Hover do botão primário: #154A8E
- Escala navy: 50 #EFF4FA, 100 #DFE9F6, 200 #C0D3ED, 300 #90B3DF, 400 #598DCF, 500 #3075CF, 600 #215DAB, 700 #154A8E, 800 #0D3B6E, 900 #032B5E, 950 #031730
- Texto principal: #031730
- Texto secundário: #6B6B6B (nunca usar #8C8C8C em texto)
- Bordas e ícones discretos: #8C8C8C
- Borda padrão: #C0D3ED
- Link e foco: #3075CF
- Fundo da página e dos cards: #FFFFFF
- Fundo sutil: #EFF4FA. Item selecionado: #DFE9F6
- Sucesso: fundo #DCFCE7, texto #15803D
- Atenção: fundo #FEF3C7, texto #B45309
- Erro: fundo #FEE2E2, texto #B91C1C
- Informação: fundo #E0F2FE, texto #0369A1

Tipografia:
- H1 36/44 px (páginas internas) e 48/56 px (login), H2 28/36, H3 22/30, todos em Lora SemiBold
- Corpo 16 px Inter
- Menus e botões 14 px Inter Medium
- Legenda 12 px Inter

Logo:
Use a logo do FAP Books (livro aberto estilizado unido à letra "A", com "FAP" em cima e "BOOKS" embaixo), em navy #032B5E sobre fundo claro e branca sobre fundo navy. Use no cabeçalho, no menu lateral e, grande, no login. Não distorcer nem recolorir.

Público-alvo e perfis:
- Aluno: consulta o acervo, vê seus empréstimos, prazos e multas, renova e reserva livros.
- Professor: o mesmo do aluno, mais a reserva pedagógica de livros para uma disciplina (até 30 dias).
- Funcionário da biblioteca (bibliotecária ou chefe): administra tudo, num painel exclusivo.

Crie as seguintes telas:

1. Tela de login

Elementos:
- Fundo branco, conteúdo centralizado, largura máxima de 384 px
- Logo grande no topo (cerca de 220 px de largura)
- Campo "E-mail"
- Campo "Senha" com botão de mostrar/ocultar
- Botão primário navy, largura total: "Entrar"
- Estado de erro: mensagem "E-mail ou senha incorretos." em vermelho abaixo do botão
- Estado de carregamento: botão com o texto "Entrando..." desabilitado
- Sem cadastro público: as contas são criadas pela bibliotecária

2. Layout base e navegação (desktop e celular)

Desktop:
- Menu lateral navy #032B5E de 240 px, logo branca no topo, itens em branco, item ativo com fundo #0D3B6E
- Cabeçalho branco com campo de busca, ícone de sino (avisos) e menu do usuário (avatar com iniciais, nome e perfil)
- Área de conteúdo com título H1, subtítulo em cinza e ação principal à direita

Celular:
- Cabeçalho com logo e botão de menu que abre uma gaveta lateral navy

Menu por perfil:
- Aluno: Início, Buscar livros, Meus empréstimos, Minhas reservas, Multas
- Professor: os mesmos do aluno, mais Reserva pedagógica
- Funcionário: Painel, Acervo, Usuários, Empréstimos, Reservas pedagógicas, Multas, Histórico, Relatórios

Inclua também os estados vazio (ícone, título, frase e botão de ação) e carregamento (skeleton).

3. Painel da bibliotecária: visão geral

Título: "Painel"
Subtítulo: "Resumo da biblioteca hoje."

Elementos:
- 4 cards de indicador: Livros emprestados (128), Atrasados (14), Disponíveis (1.842), Multas em aberto (R$ 96,00)
- Atalhos de operação: Novo empréstimo, Registrar devolução, Cadastrar livro, Cadastrar usuário
- Bloco "Avisos de prazo" com três grupos: A vencer, Vence hoje, Atrasado
- Lista de pendências: reservas pedagógicas aguardando aprovação e devoluções em atraso, cada item com badge de status e botão de ação

4. Pesquisa de livros (aluno e professor)

Título: "Buscar livros"

Elementos:
- Campo de busca grande no topo: "Busque por título, autor, categoria ou código"
- Filtros: Categoria e Status (Disponível, Emprestado, Reservado)
- Grade de cards de livro: capa, título, autor, categoria, badge de disponibilidade e botão "Ver detalhes"
- Paginação
- Estado sem resultado: "Nenhum livro encontrado. Tente outro título ou autor."

5. Detalhe do livro

Elementos:
- Migalhas de pão
- Capa grande à esquerda
- Título, autor, categoria, ISBN/código, quantidade total e quantidade disponível
- Badge de status em tempo real
- Botão primário: "Reservar" (quando indisponível)
- Histórico resumido de empréstimos do livro (visível só para a bibliotecária)

6. Listagem do acervo (bibliotecária)

Título: "Acervo"

Elementos:
- Botão primário "Cadastrar livro" e botão secundário "Importar planilha (Excel/CSV)"
- Busca e filtros acima da tabela
- Tabela: capa pequena, título, autor, categoria, código/ISBN, quantidade, status (badge), ações (editar e excluir)
- Paginação com "Mostrando 1–10 de 240"
- Modal de exclusão: "Excluir este livro?" com explicação, botão secundário "Cancelar" e botão de perigo "Excluir"

7. Formulário de cadastro e edição de livro

Elementos:
- Campos: Título, Autor, Categoria (select), Código/ISBN, Quantidade, Status
- Upload de capa
- Botão primário "Salvar" e secundário "Cancelar"
- Erros de validação nos campos
- Modo edição com o mesmo layout e título "Editar livro"
- Feedback de sucesso: toast "Livro salvo com sucesso."

8. Cadastro de usuários (aluno, professor, funcionário)

Elementos:
- Seletor de perfil no topo (três opções: Aluno, Professor, Funcionário da biblioteca)
- Formulário muda conforme o perfil: nome, e-mail, telefone/WhatsApp, matrícula (aluno), disciplina (professor), cargo (funcionário: chefe da biblioteca, auxiliar de biblioteca)
- Botão primário "Cadastrar"

9. Listagem, edição e inativação de usuários

Elementos:
- Tabela: avatar com iniciais, nome, perfil, e-mail, status (ativo/inativo), ações
- Filtros por perfil e status, busca por nome
- Modais de edição e de inativação (com confirmação)

10. Registro de empréstimo, devolução e renovação (balcão)

Elementos:
- Abas: Empréstimo, Devolução, Renovação
- Passo 1: buscar usuário (nome ou matrícula), mostrar card com perfil, livros em posse (ex.: 3 de 5) e situação
- Passo 2: buscar livro (título ou código)
- Passo 3: resumo com usuário, livro e prazo de devolução (7 dias, com a data)
- Alertas de limite e atraso: "Limite de 5 livros atingido" e "Usuário com multa em aberto: empréstimo bloqueado"
- Botão primário "Confirmar empréstimo"
- Tela de comprovante com os dados e botão "Imprimir"

11. Solicitar reserva pedagógica (professor)

Elementos:
- Seleção de um ou mais livros (busca e lista dos escolhidos)
- Campos: data de início, prazo de uso em dias (máximo 30), disciplina e observação
- Aviso informativo: "A reserva será confirmada após aprovação da bibliotecária."
- Botão primário "Enviar solicitação" e tela de confirmação

12. Registrar reserva pedagógica presencial (bibliotecária)

Elementos:
- Formulário rápido: professor (busca), livros, data de início, prazo (máx. 30 dias)
- Botão primário "Registrar reserva" e confirmação

13. Fila de aprovação de reservas pedagógicas (bibliotecária)

Elementos:
- Lista de solicitações com professor, livros, período e badge de status (Aguardando, Aprovada, Recusada)
- Filtro por status
- Detalhe da solicitação em painel lateral ou página
- Botões "Aprovar" (primário) e "Recusar" (perigo), com campo de justificativa obrigatório ao recusar
- Inclui pedidos de renovação

14. Multas: baixa manual do pagamento (bibliotecária)

Elementos:
- Lista de multas em aberto: usuário, livro, dias de atraso, valor (R$ 1,00 por dia)
- Total em aberto no topo
- Modal "Registrar pagamento": confirma usuário e valor, botão primário "Dar baixa"
- Badge: Em aberto (erro) e Paga (sucesso)

15. Meus empréstimos (aluno e professor)

Elementos:
- Lista dos livros em posse com data de retirada, prazo, dias restantes e badge (No prazo, Vence hoje, Atrasado)
- Botão "Renovar" em cada item
- Faixa de aviso se houver multa
- Aba "Histórico"

16. Histórico de empréstimos por usuário e por livro

Elementos:
- Abas: Por usuário e Por livro
- Busca e filtro por período
- Tabela cronológica: data de retirada, devolução, status

17. Relatórios

Elementos:
- Abas: Livros em atraso, Acervo, Reservas pedagógicas
- Filtros no topo
- Tabela de resultados e botões "Exportar PDF" e "Exportar CSV"

18. Base visual (página de guia)

Uma página que mostra, em um só lugar, as cores, a tipografia, os botões, os campos, os badges, os alertas, a tabela, o modal e os ícones do design system, usando exatamente os valores acima.

Componentes importantes:
- Botão primário, secundário, texto e perigo
- Campos de formulário com foco e erro
- Cards de livro e cards de indicador
- Badges de status
- Tabela com paginação
- Modal de confirmação
- Alertas e avisos inline, toast
- Menu lateral e cabeçalho
- Abas e chips de filtro
- Estados vazio e carregamento
- Avatar com iniciais
- Layout responsivo

Regras de experiência:
- O aluno e o professor consultam o acervo, veem seus empréstimos e renovam.
- A bibliotecária opera tudo no balcão: busca usuário, busca livro, confirma, imprime o comprovante.
- Prazo padrão de empréstimo: 7 dias. Limite: 5 livros por usuário.
- Multa de R$ 1,00 por dia de atraso, quitada presencialmente, com baixa manual.
- Usuário com atraso ou multa em aberto fica bloqueado para novo empréstimo.
- A reserva pedagógica é só do professor, com prazo de até 30 dias e aprovação da bibliotecária.
- Todo estado tem cor, ícone e texto (nunca só cor).
- Ações destrutivas sempre pedem confirmação em modal.
- Datas em dd/mm/aaaa e valores em reais.

Exemplos de dados para popular a interface:

Livros:
1. Dom Casmurro, Machado de Assis, Literatura brasileira, Disponível
2. Introdução à Teologia Sistemática, Wayne Grudem, Teologia, Emprestado
3. Fundamentos de Metodologia Científica, Marconi e Lakatos, Metodologia, Reservado
4. O Conflito dos Séculos, Ellen G. White, Religião, Disponível
5. Algoritmos: Teoria e Prática, Thomas Cormen, Computação, Disponível
6. Anatomia Humana, Henry Gray, Saúde, Emprestado

Usuários:
1. Mariana Souza, Aluna, matrícula 2024.01.0123
2. Prof. Carlos Almeida, Professor, Direito
3. Ana Paula Ribeiro, Funcionária, Chefe da biblioteca
4. Lucas Ferreira, Aluno, matrícula 2023.02.0456, com multa em aberto

Crie o layout com aparência de produto institucional real, pronto para ser apresentado à biblioteca da FAP e para continuar sendo expandido com novas telas no mesmo padrão visual.

O resultado deve parecer um sistema de biblioteca acadêmica moderno, sóbrio e confiável, com a identidade navy do FAP Books aplicada de forma consistente em todas as telas.
