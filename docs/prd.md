# FAP Books — PRD (Product Requirements Document)

Sistema de gestão e empréstimo de livros da Biblioteca da Faculdade Adventista do Paraná (FAP).

> **Este é o documento base do projeto.** O PRD é a ideia central do FAP Books e deve ser seguido. Ele é um **documento vivo**: pode mudar com o tempo, mas toda mudança passa por Pull Request e é registrada no [Histórico de mudanças](#histórico-de-mudanças) no fim deste arquivo.
>
> Conteúdo da versão 0.3 transcrito do `FAP_Books_PRD.pdf`. O backlog (épicos, features e histórias) vem deste documento: [backlog/epicos-features-historias.md](backlog/epicos-features-historias.md).

| | |
| -- | -- |
| **Produto** | FAP Books |
| **Versão do documento** | 0.3 |
| **Status** | Em elaboração — documento vivo |
| **Autores** | Francielio Souza, Thiago Dutra, Julia Wassão, Igor Santana, Breno Gruber, Emanuel do Santos |
| **Categoria** | Sistema de gestão de biblioteca acadêmica |
| **Instituição** | Faculdade Adventista do Paraná (FAP) |

## Como alterar este documento

1. Crie o card da mudança no Trello e a branch `FAP/<número do card>`.
2. Altere o texto e **acrescente uma linha** no [Histórico de mudanças](#histórico-de-mudanças): data, o que mudou, por quê e o card.
3. Se a mudança alterar o backlog, atualize os cards do Trello e o [backlog](backlog/epicos-features-historias.md).
4. Abra o PR para a `develop`. O time revisa antes do merge.

Não apague o que foi decidido antes: marque como substituído e registre no histórico.

## 1. Resumo Executivo

O FAP Books é o sistema de gestão e empréstimo de livros da biblioteca da Faculdade Adventista do Paraná (FAP). O objetivo é digitalizar e centralizar todo o fluxo hoje feito de forma manual: cadastro do acervo, cadastro de alunos e funcionários, empréstimos, devoluções, renovações, reservas e controle de prazos e multas.

O produto une, em um único lugar, uma área de consulta pública ao acervo (para alunos e funcionários) e uma área administrativa dedicada à bibliotecária, permitindo maior organização do estoque, rastreabilidade de quem está com cada livro e redução de erros e atrasos hoje causados pelo controle manual.

## 2. Problema

Atualmente a biblioteca da FAP enfrenta uma série de dificuldades por depender de controle manual e não ter um aplicativo próprio:

- Dificuldade dos alunos e funcionários em encontrar livros no acervo.
- Erros frequentes no registro manual de empréstimos e devoluções.
- Falta de um aplicativo/sistema dedicado à biblioteca.
- Perda de prazos de empréstimo por falta de controle e alertas.
- Desorganização do estoque de livros.
- Dificuldade para saber quem está com cada livro (relação membro → livro → empréstimo).
- Perda do histórico de empréstimos.
- Livros indisponíveis sem informação clara de status para quem consulta.
- Demora no atendimento presencial para registrar devolução e empréstimo de livros.

Esses problemas afetam diretamente dois pontos de contato principais: o campo da bibliotecária (que opera o dia a dia da biblioteca) e o campo de pesquisa de livros (usado por alunos e funcionários para consultar o acervo).

## 3. Objetivos e Métricas de Sucesso

### Objetivos do produto

- Facilitar a busca e consulta ao acervo por alunos e funcionários.
- Eliminar erros de registro manual de empréstimos e devoluções.
- Dar visibilidade em tempo real sobre a disponibilidade de cada livro.
- Reduzir atrasos na devolução por meio de controle de prazo e multa.
- Centralizar o histórico de empréstimos por usuário e por livro.
- Agilizar o atendimento no balcão da biblioteca.

### Métricas de sucesso (KPIs candidatos)

- Tempo médio para registrar um empréstimo/devolução no balcão.
- Redução percentual de erros/divergências de estoque em relação ao controle manual.
- Percentual de empréstimos devolvidos dentro do prazo.
- Número de consultas realizadas pelo campo de pesquisa de livros.
- Adoção do sistema pela bibliotecária no uso diário.

## 4. Público-Alvo / Perfis de Usuário

O sistema terá três perfis de usuário: **Aluno**, **Professor** (com regras diferenciadas de reserva para fins didáticos) e **Funcionário da Biblioteca** (perfil administrativo, cadastrado com cargo — ex.: chefe da biblioteca, auxiliar de biblioteca).

### Persona 1 — Aluno

Utiliza o sistema principalmente para consultar o acervo, verificar disponibilidade de livros, acompanhar seus próprios empréstimos, prazos e eventuais multas, além de solicitar renovação ou reserva de um livro indisponível. Prazo padrão de 7 dias e limite de até 5 livros emprestados simultaneamente.

### Persona 2 — Professor

Utiliza o acervo para fins didáticos e tem uma regra de reserva diferenciada: pode solicitar, com antecedência, a reserva de um ou mais livros para uso em disciplina, por um prazo que ele mesmo define, limitado a no máximo 30 dias. Essa reserva pedagógica passa por um fluxo mais formal (solicitação antecipada e aprovação da bibliotecária) antes de ser confirmada, e o livro deve ser devolvido após o período de uso definido. Principal dor: falta de previsibilidade sobre a disponibilidade de um livro para uso em sala de aula.

### Persona 3 — Funcionário da Biblioteca (administrador do sistema)

Responsável por cadastrar livros e usuários, registrar empréstimos e devoluções, aprovar reservas pedagógicas de professores, controlar prazos e multas, e acompanhar o estoque. Cadastrado com um cargo específico (ex.: chefe da biblioteca, auxiliar de biblioteca). Principal dor: tempo perdido com registro manual, falta de organização do estoque e dificuldade de saber quem está com cada livro.

## 5. Escopo

### 5.1 Dentro do escopo (MVP)

- Cadastro de livros (título, autor, categoria, código/ISBN, quantidade, status), de forma manual ou por importação via planilha (Excel/CSV).
- Cadastro de usuários — alunos, professores e funcionários da biblioteca (com cargo).
- Consulta/pesquisa do acervo.
- Controle de disponibilidade dos livros em tempo real.
- Registro de empréstimos, limitado a até 5 livros simultâneos por usuário.
- Registro de devoluções.
- Renovação de empréstimo.
- Reserva de livros indisponíveis (aluno).
- Reserva pedagógica de livros pelo professor, com solicitação antecipada, aprovação da bibliotecária e prazo de posse definido pelo professor (máximo de 30 dias).
- Controle do prazo de devolução (padrão de 7 dias), com cálculo automático de multa (R$ 1,00 por dia de atraso) e baixa manual do pagamento pela bibliotecária.
- Notificação de prazo por WhatsApp, e-mail e painel do sistema.
- Histórico de empréstimos por usuário e por livro.
- Área/painel exclusivo da bibliotecária, incluindo aprovação de reservas pedagógicas.

### 5.2 Fora do escopo (por enquanto)

- Venda de livros.
- Controle financeiro geral da biblioteca (além do registro da multa por atraso).
- Compra de novos livros.
- Gestão de funcionários (RH).
- Integração com outras bibliotecas.
- Funcionalidades avançadas de biblioteca digital (e-books, leitura online).
- Pagamento online da multa — controle e quitação previstos como processo presencial/manual no MVP.

## 6. Requisitos Funcionais

Prioridade classificada em MoSCoW: **Must have** (essencial ao MVP), **Should have** (importante, não bloqueia lançamento), **Could have** (desejável), **Won't have por agora** (fora do escopo atual).

### 6.1 Cadastro e Gestão do Acervo

> Como bibliotecária, quero cadastrar e consultar os livros do acervo, manualmente ou em lote, para manter o estoque organizado e sempre atualizado.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-01 | Cadastro manual de livros (título, autor, categoria, código/ISBN, quantidade, status) | Must have | Planejado |
| RF-02 | Importação de livros em lote via planilha (Excel/CSV) para a migração inicial do acervo | Must have | Planejado |
| RF-03 | Edição e exclusão de livros cadastrados | Must have | Planejado |
| RF-04 | Consulta/pesquisa de livros por título, autor, categoria ou código | Must have | Planejado |
| RF-05 | Exibição do status/disponibilidade do livro em tempo real (disponível, emprestado, reservado) | Must have | Planejado |

### 6.2 Cadastro de Usuários

> Como bibliotecária, quero cadastrar alunos, professores e funcionários da biblioteca, para vincular corretamente cada empréstimo e aplicar a regra correta a cada perfil.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-06 | Cadastro de alunos | Must have | Planejado |
| RF-07 | Cadastro de professores | Must have | Planejado |
| RF-08 | Cadastro de funcionários da biblioteca, com campo de cargo (ex.: chefe da biblioteca, auxiliar de biblioteca) | Must have | Planejado |
| RF-09 | Edição e inativação de cadastro de usuário | Should have | Planejado |

### 6.3 Empréstimos e Devoluções (Aluno)

> Como aluno, quero pegar livros emprestados, renová-los e reservar títulos indisponíveis, para usá-los nos meus estudos.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-10 | Registro de empréstimo de livro vinculado a um usuário | Must have | Planejado |
| RF-11 | Registro de devolução de livro | Must have | Planejado |
| RF-12 | Renovação de empréstimo | Should have | Planejado |
| RF-13 | Reserva de livro indisponível | Should have | Planejado |
| RF-14 | Limite de até 5 livros emprestados simultaneamente por usuário | Must have | Planejado |
| RF-15 | Bloqueio de novo empréstimo para usuário com pendência (atraso ou multa em aberto) | Should have | Planejado |

### 6.4 Reserva Pedagógica (Professor)

> Como professor, quero solicitar com antecedência a reserva de livros para uso didático, pelo sistema ou presencialmente, e definir por quanto tempo vou precisar deles, para garantir a disponibilidade durante minha disciplina.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-16 | Solicitação de reserva pedagógica de livro pelo professor, com antecedência — podendo ser feita online (pelo sistema) ou presencialmente na biblioteca | Must have | Planejado |
| RF-17 | Aprovação (ou recusa) da reserva pedagógica pela bibliotecária/chefe da biblioteca | Must have | Planejado |
| RF-18 | Definição, pelo professor, do prazo de posse do livro reservado, limitado a no máximo 30 dias | Must have | Planejado |
| RF-19 | Registro de devolução do livro após o período de uso didático definido | Must have | Planejado |
| RF-20 | Renovação da reserva pedagógica ao final do prazo, mediante nova aprovação da bibliotecária | Should have | Planejado |

### 6.5 Controle de Prazos e Multas

> Como bibliotecária, quero que o sistema calcule automaticamente o prazo e a multa por atraso e avise o usuário por vários canais, para não depender de controle manual.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-21 | Cálculo automático do prazo de devolução (padrão de 7 dias, ou o prazo definido na reserva pedagógica) | Must have | Planejado |
| RF-22 | Cálculo automático de multa por atraso (R$ 1,00 por dia de atraso) | Must have | Planejado |
| RF-23 | Registro, pela bibliotecária, da baixa manual do pagamento da multa | Must have | Planejado |
| RF-24 | Notificação de prazo próximo do vencimento ou já vencido, via WhatsApp, e-mail e painel do sistema | Should have | Planejado |

### 6.6 Histórico e Relatórios

> Como bibliotecária, quero consultar o histórico de empréstimos por usuário e por livro, e acompanhar as reservas pedagógicas, para ter visibilidade completa da operação.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-25 | Histórico de empréstimos por usuário | Must have | Planejado |
| RF-26 | Histórico de empréstimos por livro | Must have | Planejado |
| RF-27 | Relatório de livros em atraso | Should have | Planejado |
| RF-28 | Relatório de acervo (estoque e quantidade disponível por título) | Could have | Planejado |
| RF-29 | Relatório de reservas pedagógicas (quantidade de solicitações, aprovações e recusas) | Should have | Planejado |

### 6.7 Painel da Bibliotecária

> Como bibliotecária, quero uma área administrativa única para gerenciar todo o dia a dia da biblioteca, incluindo as reservas pedagógicas dos professores.

| ID | Requisito | Prioridade | Status |
| -- | -- | -- | -- |
| RF-30 | Área exclusiva com visão geral (livros emprestados, atrasados e disponíveis) | Should have | Planejado |
| RF-31 | Gestão centralizada de empréstimos, devoluções, renovações e reservas via painel | Must have | Planejado |
| RF-32 | Fila de aprovação (e renovação) de reservas pedagógicas solicitadas por professores | Must have | Planejado |

## 7. Requisitos Não Funcionais

- Disponibilidade do sistema durante o horário de funcionamento da biblioteca, com meta de uptime elevado.
- Segurança e proteção dos dados de alunos e funcionários, em conformidade com a LGPD.
- Interface responsiva, com uso viável em desktop e em dispositivos móveis (celular).
- Desempenho: a pesquisa do acervo deve retornar resultados rapidamente mesmo com um estoque grande de livros.
- Auditoria e rastreabilidade: todo empréstimo, devolução, renovação, reserva e reserva pedagógica deve registrar quem realizou a ação e quando.
- Backup periódico do banco de dados (Supabase/PostgreSQL).
- Autenticação e controle de acesso, distinguindo permissões de aluno, professor e funcionário da biblioteca.
- Integração com serviço de envio de e-mail e de WhatsApp para o disparo das notificações automáticas de prazo.

## 8. Identidade Visual

O FAP Books utiliza como símbolo um livro aberto estilizado combinado com a letra "A", remetendo a acervo, leitura e à Faculdade Adventista do Paraná. A identidade visual é construída em tom navy (azul escuro), transmitindo seriedade, confiança e o ambiente acadêmico institucional.

### Paleta de cores

| Cor | Uso |
| -- | -- |
| `#032B5E` | Navy principal |
| `#0D3B6E` | Superfícies / destaques |
| `#FFFFFF` | Fundo / texto sobre navy |
| `#8C8C8C` | Texto secundário / bordas |

### Referência de Design

Padrão de design (telas, componentes e fluxos) definido no [Figma](https://www.figma.com/design/xOr6nlx1EqLMYmSJLh4sHI/FAP-BOOKS---Gestao-para-Biblioteca?node-id=2292-11299).

## 9. Riscos e Premissas

### Riscos

- Resistência da equipe da biblioteca e dos alunos em migrar do processo manual para o sistema.
- Qualidade dos dados na migração inicial do acervo físico para o cadastro digital.
- Dependência de conexão com a internet para uso do sistema no balcão de atendimento.
- Complexidade de manter consistente o cálculo de prazos e multas em casos excepcionais (feriados, recessos).

### Premissas

- A biblioteca da FAP terá ao menos um computador/dispositivo disponível no balcão para uso da bibliotecária.
- Alunos e funcionários terão acesso à internet para consultar o acervo remotamente.
- Haverá um levantamento inicial (inventário) do acervo físico para cadastro no sistema.

## 10. Roadmap

| Módulo | Status | Prioridade |
| -- | -- | -- |
| Cadastro de livros e usuários (aluno, professor, funcionário) | Planejado | Alta |
| Importação de acervo via planilha | Planejado | Alta |
| Consulta e pesquisa do acervo | Planejado | Alta |
| Empréstimos, devoluções e renovações (aluno) | Planejado | Alta |
| Reserva pedagógica (professor) | Planejado | Alta |
| Controle de prazo e multa | Planejado | Alta |
| Notificações via WhatsApp, e-mail e painel | Planejado | Média |
| Histórico e relatórios | Planejado | Média |
| Painel administrativo da bibliotecária | Planejado | Alta |

## 11. Stack Tecnológica e Infraestrutura

| | |
| -- | -- |
| **Frontend** | React com Next.js |
| **Backend** | Node.js |
| **Banco de dados** | PostgreSQL, via Supabase |
| **Autenticação / Backend-as-a-Service** | Supabase |
| **Repositório** | GitHub |
| **Gestão de projeto** | Trello |

> Veja o [Histórico de mudanças](#histórico-de-mudanças): a decisão posterior sobre o backend (Next.js + Supabase por enquanto) está registrada lá e detalhada em [architecture/README.md](architecture/README.md).

## 12. Equipe e Papéis

| Nome | Papel |
| -- | -- |
| Francielio Souza | Desenvolvedor(a) |
| Thiago Dutra | Desenvolvedor(a) |
| Julia Wassão | Desenvolvedor(a) |
| Igor Santana | Desenvolvedor(a) |
| Breno Gruber | Desenvolvedor(a) |
| Emanuel do Santos | Desenvolvedor(a) |

Gestão de projeto realizada via Trello.

## 13. Decisões Fechadas / Perguntas em Aberto

### Decisões já fechadas

- Prazo padrão de empréstimo: 7 dias, igual para alunos e professores (a reserva pedagógica do professor segue prazo próprio, de até 30 dias).
- Limite de livros emprestados simultaneamente: até 5 por usuário.
- Multa por atraso: R$ 1,00 por dia, com baixa manual do pagamento registrada pela bibliotecária no sistema (quitação presencial).
- Canal de notificação de prazo: WhatsApp, e-mail e painel do sistema.
- Migração do acervo: cadastro manual pela bibliotecária e/ou importação em lote via planilha (Excel/CSV).
- Perfis diferenciados: aluno e professor seguem regras próprias de empréstimo/reserva; o cadastro com "cargo" (ex.: chefe da biblioteca, auxiliar) é específico do perfil de funcionário da biblioteca, responsável pela administração do sistema.
- Solicitação da reserva pedagógica pode ser feita tanto pelo sistema (online) quanto presencialmente na biblioteca; a aprovação continua sendo sempre feita pela bibliotecária/chefe da biblioteca.
- Renovação da reserva pedagógica: permitida ao final do prazo de 30 dias, mediante nova aprovação da bibliotecária.
- Relatórios: além dos relatórios gerais de acervo e atraso, haverá um relatório específico de reservas pedagógicas (solicitações, aprovações e recusas).

### Perguntas em aberto / próximos passos

- Qual será o mecanismo técnico de envio das notificações via WhatsApp — API oficial (WhatsApp Business API) ou outra solução de disparo? Ainda a definir com o time técnico.

Este PRD deve ser tratado como documento vivo: à medida que decisões forem tomadas e a solução evoluir, esta versão deve ser atualizada e versionada.

## Histórico de mudanças

| Data | Versão | Mudança | Motivo | Card |
| -- | -- | -- | -- | -- |
| 2026-10-08 | 0.3 | PRD trazido do PDF para o repositório em Markdown, sem alterar o conteúdo | Ter o documento base versionado junto do código | FAP - 0178 |
| 2026-10-08 | 0.3 | **Decisão posterior à seção 11:** o backend fica em **Next.js (Server Actions) + Supabase** nesta fase. O "Node.js" da stack será avaliado depois, e o NestJS está adiado | O time está começando e nunca teve aula de backend e banco; menos peças. Detalhes em [architecture/README.md](architecture/README.md) | FAP - 0171 |
