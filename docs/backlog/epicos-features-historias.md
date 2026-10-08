# FAP Books — Épicos, Features e Histórias de Usuário

Fonte: PRD v0.3. Título dos cards no formato `[FAP - 0001] - o que é`, numeração sequencial na ordem de leitura. Prioridade: **P0** = Must have, **P1** = Should have, **P2** = Could have.

Hierarquia no Trello: Épico → Feature → História. Cada item vira um card. Todo card tem uma tag de tipo (`ÉPICO`, `FEATURE`, `HISTÓRIA`) e a tag do épico a que pertence (`EP: <nome>`), para filtrar um módulo inteiro. Histórias têm também prioridade (`P0`–`P2`) e tags de organização (área, tipo, perfil).

## [FAP - 0001] - Fundação e Plataforma  `ÉPICO` `P0`

Base técnica, acesso, conformidade e identidade visual sobre as quais todos os módulos são construídos.
Tags: `ÉPICO`, `EP: Fundação e Plataforma`, `infra`

### [FAP - 0002] - Setup do projeto  `FEATURE`

Projeto Next.js + Supabase pronto para o time desenvolver.  (pai: [FAP - 0001])
Tags: `FEATURE`, `EP: Fundação e Plataforma`

#### [FAP - 0003] - Configurar projeto Next.js com Supabase  `HISTÓRIA` `RNF` `P0`

> Como desenvolvedor, quero o projeto Next.js integrado ao Supabase com ambiente local configurado, para que o time trabalhe sobre a mesma base.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P0`, `infra` · Pai: [FAP - 0002]

Critérios de aceite:
- App sobe localmente
- Variáveis em .env, nunca commitadas
- README com passo a passo de setup

#### [FAP - 0004] - Criar esquema inicial do banco em migrations  `HISTÓRIA` `RNF` `P0`

> Como desenvolvedor, quero o esquema inicial do banco versionado em migrations (livros, usuários, empréstimos, reservas, multas), para evoluir o banco com segurança.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P0`, `banco` · Pai: [FAP - 0002]

Critérios de aceite:
- Migrations versionadas no repositório
- RLS habilitado nas tabelas
- Aplicação limpa a partir de banco vazio

#### [FAP - 0005] - Configurar CI (lint e build) nos PRs  `HISTÓRIA` `RNF` `P1`

> Como desenvolvedor, quero um pipeline de CI (lint + build) nos PRs, para barrar código quebrado antes de ir para a develop e a main.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P1`, `infra` · Pai: [FAP - 0002]

Critérios de aceite:
- CI roda em todo PR
- Falha de lint ou build bloqueia o merge

### [FAP - 0006] - Autenticação e controle de acesso  `FEATURE`

Login e permissões distintas para aluno, professor e funcionário.  (pai: [FAP - 0001])
Tags: `FEATURE`, `EP: Fundação e Plataforma`

#### [FAP - 0007] - Fazer login no sistema  `HISTÓRIA` `RNF` `P0`

> Como usuário, quero entrar no sistema com minhas credenciais, para acessar minha área.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P0`, `auth` · Pai: [FAP - 0006]

Critérios de aceite:
- Login e logout funcionando
- Sessão protegida
- Mensagens de erro claras

#### [FAP - 0008] - Aplicar permissões por perfil  `HISTÓRIA` `RNF` `P0`

> Como administrador, quero que aluno, professor e funcionário da biblioteca tenham permissões distintas, para que cada um acesse apenas o que lhe cabe.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P0`, `auth`, `api` · Pai: [FAP - 0006]

Critérios de aceite:
- Rotas e APIs protegidas por perfil
- Funcionário possui cargo (ex.: chefe, auxiliar)
- Acesso indevido retorna erro de autorização

### [FAP - 0009] - Auditoria e LGPD  `FEATURE`

Rastreabilidade das ações e proteção dos dados pessoais.  (pai: [FAP - 0001])
Tags: `FEATURE`, `EP: Fundação e Plataforma`

#### [FAP - 0010] - Registrar auditoria das ações  `HISTÓRIA` `RNF` `P1`

> Como bibliotecária, quero que empréstimo, devolução, renovação, reserva e reserva pedagógica registrem quem fez e quando, para ter rastreabilidade.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P1`, `infra`, `banco` · Pai: [FAP - 0009]

Critérios de aceite:
- Log de auditoria com usuário, ação e data/hora
- Log não pode ser editado pela aplicação

#### [FAP - 0011] - Proteger dados conforme a LGPD  `HISTÓRIA` `RNF` `P1`

> Como titular dos dados, quero que meus dados sejam protegidos conforme a LGPD, para garantir minha privacidade.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P1`, `infra` · Pai: [FAP - 0009]

Critérios de aceite:
- Acesso mínimo necessário por perfil
- Sem dados pessoais em logs
- Regras de RLS revisadas

### [FAP - 0012] - Interface base e identidade visual  `FEATURE`

Layout responsivo com a identidade FAP Books.  (pai: [FAP - 0001])
Tags: `FEATURE`, `EP: Fundação e Plataforma`

#### [FAP - 0013] - Criar interface responsiva com a identidade FAP Books  `HISTÓRIA` `RNF` `P1`

> Como usuário, quero uma interface responsiva (desktop e celular) com a identidade FAP Books, para usar no balcão e no celular.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P1`, `tela` · Pai: [FAP - 0012]

Critérios de aceite:
- Paleta do PRD (navy #032B5E)
- Layout base responsivo
- Telas seguem o Figma (página UI web)

### [FAP - 0014] - Operação e backup  `FEATURE`

Continuidade do serviço e recuperação de dados.  (pai: [FAP - 0001])
Tags: `FEATURE`, `EP: Fundação e Plataforma`

#### [FAP - 0015] - Realizar backup periódico do banco  `HISTÓRIA` `RNF` `P1`

> Como responsável técnico, quero backup periódico do banco, para recuperar os dados em caso de falha.

Tags: `HISTÓRIA`, `EP: Fundação e Plataforma`, `P1`, `infra`, `banco` · Pai: [FAP - 0014]

Critérios de aceite:
- Backup automático agendado
- Procedimento de restauração documentado

## [FAP - 0016] - Acervo  `ÉPICO` `P0`

Cadastro, importação, consulta e disponibilidade dos livros da biblioteca.
Tags: `ÉPICO`, `EP: Acervo`, `acervo`

### [FAP - 0017] - Cadastro e gestão do acervo  `FEATURE`

Manter o catálogo de livros atualizado.  (pai: [FAP - 0016])
Tags: `FEATURE`, `EP: Acervo`

#### [FAP - 0018] - Cadastrar um livro manualmente  `HISTÓRIA` `RF-01` `P0`

> Como bibliotecária, quero cadastrar um livro manualmente (título, autor, categoria, código/ISBN, quantidade, status), para manter o estoque organizado.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `tela`, `bibliotecaria` · Pai: [FAP - 0017]

Critérios de aceite:
- Campos obrigatórios validados
- Livro aparece na consulta após salvar

#### [FAP - 0019] - Editar os dados de um livro cadastrado  `HISTÓRIA` `RF-03` `P0`

> Como bibliotecária, quero editar os dados de um livro cadastrado, para corrigir informações.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `tela`, `bibliotecaria` · Pai: [FAP - 0017]

Critérios de aceite:
- Edição persiste e é auditada

#### [FAP - 0020] - Excluir um livro cadastrado  `HISTÓRIA` `RF-03` `P0`

> Como bibliotecária, quero excluir um livro cadastrado, para remover itens que saíram do acervo.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `tela`, `bibliotecaria` · Pai: [FAP - 0017]

Critérios de aceite:
- Confirmação antes de excluir
- Regra para livro com empréstimo ativo: a definir com o time

### [FAP - 0021] - Importação em lote  `FEATURE`

Migração inicial do acervo via planilha.  (pai: [FAP - 0016])
Tags: `FEATURE`, `EP: Acervo`

#### [FAP - 0022] - Importar livros em lote por planilha  `HISTÓRIA` `RF-02` `P0`

> Como bibliotecária, quero importar livros em lote por planilha (Excel/CSV), para migrar o acervo inicial sem digitar um a um.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `funcionalidade`, `bibliotecaria` · Pai: [FAP - 0021]

Critérios de aceite:
- Aceita .csv e .xlsx
- Modelo de planilha disponível para download
- Livros importados aparecem no acervo

#### [FAP - 0023] - Ver quais linhas da planilha falharam e por quê  `HISTÓRIA` `RF-02` `P1`

> Como bibliotecária, quero ver quais linhas da planilha falharam e por quê, para corrigir e reenviar. (derivada do RF-02)

Tags: `HISTÓRIA`, `EP: Acervo`, `P1`, `acervo`, `funcionalidade` · Pai: [FAP - 0021]

Critérios de aceite:
- Relatório de erros por linha
- Linhas válidas não são perdidas

### [FAP - 0024] - Consulta e disponibilidade  `FEATURE`

Busca pública e status em tempo real.  (pai: [FAP - 0016])
Tags: `FEATURE`, `EP: Acervo`

#### [FAP - 0025] - Pesquisar livros por título, autor, categoria ou código  `HISTÓRIA` `RF-04` `P0`

> Como aluno ou professor, quero pesquisar livros por título, autor, categoria ou código, para encontrar o que preciso.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `tela`, `aluno`, `professor` · Pai: [FAP - 0024]

Critérios de aceite:
- Busca por qualquer um dos 4 critérios
- Resultado rápido mesmo com estoque grande

#### [FAP - 0026] - Ver se um livro está disponível, emprestado ou reservado em tempo real  `HISTÓRIA` `RF-05` `P0`

> Como usuário, quero ver se um livro está disponível, emprestado ou reservado em tempo real, para saber se consigo pegá-lo.

Tags: `HISTÓRIA`, `EP: Acervo`, `P0`, `acervo`, `funcionalidade` · Pai: [FAP - 0024]

Critérios de aceite:
- Status atualiza após empréstimo, devolução e reserva

## [FAP - 0027] - Usuários  `ÉPICO` `P0`

Cadastro e gestão de alunos, professores e funcionários da biblioteca.
Tags: `ÉPICO`, `EP: Usuários`, `usuarios`

### [FAP - 0028] - Cadastro de usuários  `FEATURE`

Vincular corretamente cada empréstimo e aplicar a regra de cada perfil.  (pai: [FAP - 0027])
Tags: `FEATURE`, `EP: Usuários`

#### [FAP - 0029] - Cadastrar alunos  `HISTÓRIA` `RF-06` `P0`

> Como bibliotecária, quero cadastrar alunos, para vincular empréstimos a eles.

Tags: `HISTÓRIA`, `EP: Usuários`, `P0`, `usuarios`, `tela`, `bibliotecaria` · Pai: [FAP - 0028]

Critérios de aceite:
- Aluno recebe o perfil e as regras de aluno

#### [FAP - 0030] - Cadastrar professores  `HISTÓRIA` `RF-07` `P0`

> Como bibliotecária, quero cadastrar professores, para aplicar a regra de reserva pedagógica.

Tags: `HISTÓRIA`, `EP: Usuários`, `P0`, `usuarios`, `tela`, `bibliotecaria` · Pai: [FAP - 0028]

Critérios de aceite:
- Professor recebe o perfil e as regras de professor

#### [FAP - 0031] - Cadastrar funcionários da biblioteca com cargo  `HISTÓRIA` `RF-08` `P0`

> Como administrador, quero cadastrar funcionários da biblioteca com cargo, para controlar quem opera o sistema.

Tags: `HISTÓRIA`, `EP: Usuários`, `P0`, `usuarios`, `tela`, `bibliotecaria` · Pai: [FAP - 0028]

Critérios de aceite:
- Campo de cargo obrigatório (ex.: chefe, auxiliar)

### [FAP - 0032] - Gestão de cadastro  `FEATURE`

Manter os cadastros atualizados.  (pai: [FAP - 0027])
Tags: `FEATURE`, `EP: Usuários`

#### [FAP - 0033] - Editar o cadastro de um usuário  `HISTÓRIA` `RF-09` `P1`

> Como bibliotecária, quero editar o cadastro de um usuário, para corrigir dados.

Tags: `HISTÓRIA`, `EP: Usuários`, `P1`, `usuarios`, `tela`, `bibliotecaria` · Pai: [FAP - 0032]

Critérios de aceite:
- Edição persiste e é auditada

#### [FAP - 0034] - Inativar um usuário  `HISTÓRIA` `RF-09` `P1`

> Como bibliotecária, quero inativar um usuário, para impedir novos empréstimos sem perder o histórico.

Tags: `HISTÓRIA`, `EP: Usuários`, `P1`, `usuarios`, `tela`, `bibliotecaria` · Pai: [FAP - 0032]

Critérios de aceite:
- Usuário inativo não consegue emprestar
- Histórico preservado

## [FAP - 0035] - Empréstimos e Devoluções  `ÉPICO` `P0`

Fluxo de empréstimo, devolução, renovação e reserva de livros.
Tags: `ÉPICO`, `EP: Empréstimos e Devoluções`, `emprestimos`

### [FAP - 0036] - Registro de empréstimo  `FEATURE`

Emprestar livros respeitando as regras do perfil.  (pai: [FAP - 0035])
Tags: `FEATURE`, `EP: Empréstimos e Devoluções`

#### [FAP - 0037] - Registrar o empréstimo de um livro a um usuário  `HISTÓRIA` `RF-10` `P0`

> Como bibliotecária, quero registrar o empréstimo de um livro a um usuário, para saber quem está com cada livro.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P0`, `emprestimos`, `funcionalidade`, `bibliotecaria` · Pai: [FAP - 0036]

Critérios de aceite:
- Empréstimo vinculado a usuário e livro
- Prazo padrão de 7 dias
- Status do livro passa a emprestado

#### [FAP - 0038] - Limitar empréstimos a 5 livros por usuário  `HISTÓRIA` `RF-14` `P0`

> Como bibliotecária, quero que o sistema limite a 5 livros emprestados por usuário, para aplicar a regra da biblioteca.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P0`, `emprestimos`, `funcionalidade` · Pai: [FAP - 0036]

Critérios de aceite:
- 6º empréstimo é bloqueado com mensagem clara

#### [FAP - 0039] - Bloquear novo empréstimo para usuário com atraso ou multa em aberto  `HISTÓRIA` `RF-15` `P1`

> Como bibliotecária, quero bloquear novo empréstimo para usuário com atraso ou multa em aberto, para reduzir inadimplência.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P1`, `emprestimos`, `funcionalidade` · Pai: [FAP - 0036]

Critérios de aceite:
- Bloqueio ativo enquanto houver pendência
- Liberado após devolução e baixa da multa

### [FAP - 0040] - Devolução  `FEATURE`

Dar baixa nos empréstimos.  (pai: [FAP - 0035])
Tags: `FEATURE`, `EP: Empréstimos e Devoluções`

#### [FAP - 0041] - Registrar a devolução de um livro  `HISTÓRIA` `RF-11` `P0`

> Como bibliotecária, quero registrar a devolução de um livro, para liberá-lo e fechar o empréstimo.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P0`, `emprestimos`, `funcionalidade`, `bibliotecaria` · Pai: [FAP - 0040]

Critérios de aceite:
- Status do livro volta a disponível
- Multa calculada se houver atraso

### [FAP - 0042] - Renovação  `FEATURE`

Estender o prazo do empréstimo.  (pai: [FAP - 0035])
Tags: `FEATURE`, `EP: Empréstimos e Devoluções`

#### [FAP - 0043] - Renovar um empréstimo  `HISTÓRIA` `RF-12` `P1`

> Como aluno, quero renovar um empréstimo, para ficar mais tempo com o livro.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P1`, `emprestimos`, `funcionalidade`, `aluno` · Pai: [FAP - 0042]

Critérios de aceite:
- Novo prazo calculado
- Renovação auditada

### [FAP - 0044] - Reserva de livro indisponível  `FEATURE`

Entrar na fila de um livro emprestado.  (pai: [FAP - 0035])
Tags: `FEATURE`, `EP: Empréstimos e Devoluções`

#### [FAP - 0045] - Reservar um livro indisponível  `HISTÓRIA` `RF-13` `P1`

> Como aluno, quero reservar um livro indisponível, para pegá-lo quando for devolvido.

Tags: `HISTÓRIA`, `EP: Empréstimos e Devoluções`, `P1`, `emprestimos`, `funcionalidade`, `aluno` · Pai: [FAP - 0044]

Critérios de aceite:
- Reserva aparece no meu painel
- Status do livro mostra reservado

## [FAP - 0046] - Reserva Pedagógica  `ÉPICO` `P0`

Fluxo formal de reserva de livros por professores para uso em disciplina.
Tags: `ÉPICO`, `EP: Reserva Pedagógica`, `reserva-pedagogica`

### [FAP - 0047] - Solicitação de reserva pedagógica  `FEATURE`

Professor pede com antecedência, online ou presencialmente.  (pai: [FAP - 0046])
Tags: `FEATURE`, `EP: Reserva Pedagógica`

#### [FAP - 0048] - Solicitar online a reserva pedagógica de um ou mais livros  `HISTÓRIA` `RF-16` `P0`

> Como professor, quero solicitar online a reserva pedagógica de um ou mais livros, para garantir a disponibilidade na minha disciplina.

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P0`, `reserva-pedagogica`, `tela`, `professor` · Pai: [FAP - 0047]

Critérios de aceite:
- Solicitação entra na fila de aprovação

#### [FAP - 0049] - Registrar uma reserva pedagógica pedida presencialmente  `HISTÓRIA` `RF-16` `P0`

> Como bibliotecária, quero registrar uma reserva pedagógica pedida presencialmente, para atender o professor no balcão.

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P0`, `reserva-pedagogica`, `tela`, `bibliotecaria` · Pai: [FAP - 0047]

Critérios de aceite:
- Mesmo fluxo de aprovação da solicitação online

#### [FAP - 0050] - Definir o prazo de posse dos livros  `HISTÓRIA` `RF-18` `P0`

> Como professor, quero definir o prazo de posse dos livros (máximo 30 dias), para planejar o uso em sala.

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P0`, `reserva-pedagogica`, `funcionalidade`, `professor` · Pai: [FAP - 0047]

Critérios de aceite:
- Prazo acima de 30 dias é rejeitado

### [FAP - 0051] - Aprovação de reserva pedagógica  `FEATURE`

Bibliotecária decide sobre as solicitações.  (pai: [FAP - 0046])
Tags: `FEATURE`, `EP: Reserva Pedagógica`

#### [FAP - 0052] - Aprovar ou recusar uma reserva pedagógica  `HISTÓRIA` `RF-17` `P0`

> Como bibliotecária ou chefe, quero aprovar ou recusar uma reserva pedagógica, para controlar o uso do acervo. (a fila fica no painel: ver Painel)

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P0`, `reserva-pedagogica`, `funcionalidade`, `bibliotecaria` · Pai: [FAP - 0051]

Critérios de aceite:
- Decisão registrada com autor e data
- Professor é informado da decisão

### [FAP - 0053] - Devolução e renovação da reserva  `FEATURE`

Encerrar ou estender o período de uso.  (pai: [FAP - 0046])
Tags: `FEATURE`, `EP: Reserva Pedagógica`

#### [FAP - 0054] - Registrar a devolução dos livros após o período didático  `HISTÓRIA` `RF-19` `P0`

> Como bibliotecária, quero registrar a devolução dos livros após o período didático, para encerrar a reserva.

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P0`, `reserva-pedagogica`, `funcionalidade`, `bibliotecaria` · Pai: [FAP - 0053]

Critérios de aceite:
- Livros voltam a disponível

#### [FAP - 0055] - Renovar a reserva ao final do prazo, mediante nova aprovação  `HISTÓRIA` `RF-20` `P1`

> Como professor, quero renovar a reserva ao final do prazo, mediante nova aprovação, para continuar usando os livros.

Tags: `HISTÓRIA`, `EP: Reserva Pedagógica`, `P1`, `reserva-pedagogica`, `funcionalidade`, `professor` · Pai: [FAP - 0053]

Critérios de aceite:
- Renovação passa pela fila de aprovação

## [FAP - 0056] - Prazos, Multas e Notificações  `ÉPICO` `P0`

Controle automático de prazo e multa, e avisos aos usuários.
Tags: `ÉPICO`, `EP: Prazos, Multas e Notificações`, `multas,notificacoes`

### [FAP - 0057] - Cálculo de prazo e multa  `FEATURE`

Regras automáticas, sem controle manual.  (pai: [FAP - 0056])
Tags: `FEATURE`, `EP: Prazos, Multas e Notificações`

#### [FAP - 0058] - Calcular prazo de devolução automaticamente  `HISTÓRIA` `RF-21` `P0`

> Como bibliotecária, quero que o prazo de devolução seja calculado automaticamente (7 dias, ou o definido na reserva pedagógica), para não depender de controle manual.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P0`, `multas`, `funcionalidade` · Pai: [FAP - 0057]

Critérios de aceite:
- Prazo correto por tipo de empréstimo

#### [FAP - 0059] - Calcular multa por atraso automaticamente  `HISTÓRIA` `RF-22` `P0`

> Como bibliotecária, quero que a multa por atraso seja calculada automaticamente (R$ 1,00 por dia), para não depender de contas manuais.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P0`, `multas`, `funcionalidade` · Pai: [FAP - 0057]

Critérios de aceite:
- Valor = dias de atraso x R$ 1,00
- Casos excepcionais (feriados, recessos) tratados ou documentados

### [FAP - 0060] - Quitação de multas  `FEATURE`

Registro do pagamento presencial.  (pai: [FAP - 0056])
Tags: `FEATURE`, `EP: Prazos, Multas e Notificações`

#### [FAP - 0061] - Registrar a baixa manual do pagamento da multa  `HISTÓRIA` `RF-23` `P0`

> Como bibliotecária, quero registrar a baixa manual do pagamento da multa, para liberar o usuário.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P0`, `multas`, `tela`, `bibliotecaria` · Pai: [FAP - 0060]

Critérios de aceite:
- Baixa registrada com autor e data
- Pagamento online fora do escopo

### [FAP - 0062] - Notificações de prazo  `FEATURE`

Avisos de vencimento e atraso.  (pai: [FAP - 0056])
Tags: `FEATURE`, `EP: Prazos, Multas e Notificações`

#### [FAP - 0063] - Ver avisos de prazo no painel do sistema  `HISTÓRIA` `RF-24` `P1`

> Como usuário, quero ver avisos de prazo no painel do sistema, para me organizar.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P1`, `notificacoes`, `tela` · Pai: [FAP - 0062]

Critérios de aceite:
- Aviso para prazo próximo e vencido

#### [FAP - 0064] - Receber aviso de prazo por e-mail  `HISTÓRIA` `RF-24` `P1`

> Como usuário, quero receber aviso de prazo por e-mail, para ser lembrado fora do sistema.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P1`, `notificacoes`, `api` · Pai: [FAP - 0062]

Critérios de aceite:
- Envio automático por e-mail

#### [FAP - 0065] - Receber aviso de prazo por WhatsApp  `HISTÓRIA` `RF-24` `P1`

> Como usuário, quero receber aviso de prazo por WhatsApp, para ser lembrado no canal que mais uso.

Tags: `HISTÓRIA`, `EP: Prazos, Multas e Notificações`, `P1`, `notificacoes`, `api` · Pai: [FAP - 0062]

Critérios de aceite:
- BLOQUEADA: definir mecanismo (API oficial do WhatsApp Business ou outro)

## [FAP - 0066] - Histórico e Relatórios  `ÉPICO` `P0`

Visibilidade completa da operação para a bibliotecária.
Tags: `ÉPICO`, `EP: Histórico e Relatórios`, `relatorios`

### [FAP - 0067] - Histórico de empréstimos  `FEATURE`

Rastrear quem pegou o quê.  (pai: [FAP - 0066])
Tags: `FEATURE`, `EP: Histórico e Relatórios`

#### [FAP - 0068] - Consultar o histórico de empréstimos por usuário  `HISTÓRIA` `RF-25` `P0`

> Como bibliotecária, quero consultar o histórico de empréstimos por usuário, para saber o que cada pessoa já pegou.

Tags: `HISTÓRIA`, `EP: Histórico e Relatórios`, `P0`, `relatorios`, `tela`, `bibliotecaria` · Pai: [FAP - 0067]

Critérios de aceite:
- Lista cronológica com datas e status

#### [FAP - 0069] - Consultar o histórico de empréstimos por livro  `HISTÓRIA` `RF-26` `P0`

> Como bibliotecária, quero consultar o histórico de empréstimos por livro, para saber por quem ele passou.

Tags: `HISTÓRIA`, `EP: Histórico e Relatórios`, `P0`, `relatorios`, `tela`, `bibliotecaria` · Pai: [FAP - 0067]

Critérios de aceite:
- Lista cronológica com datas e status

### [FAP - 0070] - Relatórios  `FEATURE`

Visões consolidadas.  (pai: [FAP - 0066])
Tags: `FEATURE`, `EP: Histórico e Relatórios`

#### [FAP - 0071] - Gerar relatório de livros em atraso  `HISTÓRIA` `RF-27` `P1`

> Como bibliotecária, quero um relatório de livros em atraso, para cobrar as devoluções.

Tags: `HISTÓRIA`, `EP: Histórico e Relatórios`, `P1`, `relatorios`, `tela`, `bibliotecaria` · Pai: [FAP - 0070]

Critérios de aceite:
- Lista de atrasados com usuário e dias de atraso

#### [FAP - 0072] - Gerar relatório de acervo  `HISTÓRIA` `RF-28` `P2`

> Como bibliotecária, quero um relatório de acervo (estoque e quantidade disponível por título), para acompanhar o estoque.

Tags: `HISTÓRIA`, `EP: Histórico e Relatórios`, `P2`, `relatorios`, `tela`, `bibliotecaria` · Pai: [FAP - 0070]

Critérios de aceite:
- Estoque e disponível por título

#### [FAP - 0073] - Gerar relatório de reservas pedagógicas  `HISTÓRIA` `RF-29` `P1`

> Como bibliotecária, quero um relatório de reservas pedagógicas (solicitações, aprovações e recusas), para acompanhá-las.

Tags: `HISTÓRIA`, `EP: Histórico e Relatórios`, `P1`, `relatorios`, `tela`, `bibliotecaria` · Pai: [FAP - 0070]

Critérios de aceite:
- Totais por status e período

## [FAP - 0074] - Painel da Bibliotecária  `ÉPICO` `P0`

Área administrativa única para o dia a dia da biblioteca.
Tags: `ÉPICO`, `EP: Painel da Bibliotecária`, `painel-admin`

### [FAP - 0075] - Visão geral  `FEATURE`

Resumo da operação.  (pai: [FAP - 0074])
Tags: `FEATURE`, `EP: Painel da Bibliotecária`

#### [FAP - 0076] - Exibir visão geral da operação  `HISTÓRIA` `RF-30` `P1`

> Como bibliotecária, quero uma visão geral com livros emprestados, atrasados e disponíveis, para acompanhar a operação.

Tags: `HISTÓRIA`, `EP: Painel da Bibliotecária`, `P1`, `painel-admin`, `tela`, `bibliotecaria` · Pai: [FAP - 0075]

Critérios de aceite:
- Indicadores atualizados

### [FAP - 0077] - Gestão operacional  `FEATURE`

Operar tudo em um só lugar.  (pai: [FAP - 0074])
Tags: `FEATURE`, `EP: Painel da Bibliotecária`

#### [FAP - 0078] - Gerenciar empréstimos, devoluções, renovações e reservas pelo painel  `HISTÓRIA` `RF-31` `P0`

> Como bibliotecária, quero gerenciar empréstimos, devoluções, renovações e reservas pelo painel, para agilizar o atendimento.

Tags: `HISTÓRIA`, `EP: Painel da Bibliotecária`, `P0`, `painel-admin`, `tela`, `bibliotecaria` · Pai: [FAP - 0077]

Critérios de aceite:
- Fluxos acessíveis no painel
- Acesso restrito a funcionários

### [FAP - 0079] - Fila de aprovação  `FEATURE`

Reservas pedagógicas pendentes.  (pai: [FAP - 0074])
Tags: `FEATURE`, `EP: Painel da Bibliotecária`

#### [FAP - 0080] - Exibir fila de aprovação de reservas pedagógicas  `HISTÓRIA` `RF-32` `P0`

> Como bibliotecária ou chefe, quero uma fila de aprovação das reservas pedagógicas e renovações solicitadas, para decidir sobre elas.

Tags: `HISTÓRIA`, `EP: Painel da Bibliotecária`, `P0`, `painel-admin`, `tela`, `bibliotecaria` · Pai: [FAP - 0079]

Critérios de aceite:
- Lista pendentes com aprovar/recusar

---
Totais: 8 épicos, 25 features, 47 histórias (80 itens).
