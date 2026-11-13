# Roteiro de QA em produção (v0.8.6)

Para o Thiago testar `https://fap-books.vercel.app` com calma, na ordem. Cada item tem o resultado esperado. Marque `[x]` o que passou e anote o que falhou (card, tela e o que apareceu).

## 0. Antes de começar

**Contas de teste** (as senhas ficam só em `~/.config/fap-books/usuarios-teste-senhas`, nunca no Git, no chat ou no Trello; digite você mesmo na produção):

| Perfil | E-mail | Entra em |
| -- | -- | -- |
| Funcionária | `funcionario@fapbooks.test` | `/funcionario/painel` |
| Professor | `professor@fapbooks.test` | `/professor/livros` |
| Aluno | `aluno@fapbooks.test` | `/aluno/livros` |

**Estado inicial do banco** (conferido em 09/11/2026): aluno de teste com **3 empréstimos abertos** (A Hora da Estrela vence em 09/11; Clean Code e Dom Casmurro atrasados), **2 multas em aberto** (R$ 37,00 e R$ 27,00, criadas pela tarefa diária; total R$ 64,00), 0 reservas pedagógicas, limite da reserva pedagógica em 30 dias, 4 perfis (as 3 contas de teste e o Thiago). O banco é único e não tem dado real: pode testar à vontade, mas deixe como na seção 8.

**Dicas:** use uma janela anônima por perfil (os cookies não se misturam); para tema claro/escuro e celular, abra as ferramentas do navegador (F12) e emule a largura 375 e 768; não há botão de tema, o app segue o sistema.

**Para testar escrita sem sujar as contas de teste**, cadastre um usuário só para isso (seção 3.3) com `skytek7reg+qa1@gmail.com` (cai na caixa do `skytek7reg@gmail.com`).

## 1. Visitante (sem login)

- [ ] `/` abre a landing com contato, FAQ e newsletter; sem rolagem lateral em 375 e 768.
- [ ] `/login` abre; entrar com senha errada mostra erro em português e não revela se o e-mail existe.
- [ ] `/funcionario/painel`, `/aluno/livros`, `/professor/livros` sem login mandam para `/login`.
- [ ] `/privacidade`, `/termos` e `/acessibilidade` abrem.
- [ ] Rota que não existe (ex.: `/xyz`) mostra a página 404 com o título da aba "Página não encontrada".
- [ ] Link direto de área protegida sem login (ex.: `/funcionario/acervo?q=dom`) leva a `/login?next=...` e, depois de entrar, volta para o endereço pedido.

## 2. Aluno (`aluno@fapbooks.test`)

- [ ] Entra direto em `/aluno/livros` (card 0108 e acesso por perfil).
- [ ] Busca "casmurro": acha o livro; filtros de categoria e disponibilidade funcionam; a página do livro mostra exemplares livres.
- [ ] Botões "Solicitar reserva" e "Entrar na lista de espera" aparecem desabilitados ("Em breve"): é proposital.
- [ ] Menu "Meus empréstimos", "Reservas" e "Multas" aparecem sem tela (os cards 0214 e 0215 estão com o Igor).
- [ ] **Assistente de ajuda** (balão no canto, card 0234): pergunte "qual o horário", "como renovar", "como funciona a multa", "quantos livros posso pegar", "qual o contato". As respostas batem com a regra (7 dias, 3 livros, 4 para formandos, renovar até 3 vezes, R$ 1,00 por dia). Uma pergunta fora do assunto ("posso trazer meu cachorro?") mostra "Falar no WhatsApp", que abre o número (44) 3236-8065 com a pergunta preenchida. Esc fecha e devolve o foco ao botão.
- [ ] Abrir `/funcionario/painel` e `/professor/livros` com o aluno redireciona para a área dele.

## 3. Funcionária (`funcionario@fapbooks.test`)

### 3.1 Painel e avisos (cards 0097, 0094, 0158, 0234)

- [ ] `/funcionario/painel` mostra os 4 números (emprestados, atrasados, disponíveis, multas) e eles batem com a seção 0 (3 emprestados, 2 atrasados, multas em aberto R$ 64,00). A busca do topo ("Buscar livros por título, autor ou ISBN") só aparece no Painel e leva ao acervo filtrado.
- [ ] Faixa de aviso ("... vence em até 2 dias e 2 estão atrasados") e a lista "Pendências de hoje".
- [ ] "Ver avisos de prazo" abre `/funcionario/painel/avisos`, agrupado em Vence hoje e Atrasado; os chips filtram.
- [ ] **Botão "Avisar no WhatsApp":** o aluno de teste não tem telefone, então aparece "Sem telefone cadastrado". Edite o aluno de teste em Usuários e ponha um telefone seu (só números com DDD) para ver o botão; ele abre o WhatsApp com a mensagem pronta (vence hoje, ou atrasado com dias e multa). Depois **apague o telefone** (seção 8).

### 3.2 Usuários (cards 0088, 0127, 0128)

- [ ] `/funcionario/usuarios`: lista paginada, busca por nome, e-mail ou matrícula, filtros "Perfil" e "Status".
- [ ] Editar abre o modal, salva e mostra o resultado; matrícula repetida é recusada em português.
- [ ] Inativar pede confirmação (e avisa quando a pessoa tem empréstimo em aberto); reativar volta ao normal. A funcionária **não** inativa nem muda o próprio perfil.

### 3.3 Cadastro e convite por e-mail (cards 0087, 0029 a 0031)

- [ ] `/funcionario/usuarios/novo`: os 3 perfis mostram os campos certos (aluno com matrícula e curso; funcionária com cargo).
- [ ] Cadastre um aluno com `skytek7reg+qa1@gmail.com`. Aparece "Usuário cadastrado. O convite foi enviado por e-mail."
- [ ] O e-mail chega com a logo do FAP Books e o botão "Definir minha senha" (veja também o spam).
- [ ] O link abre `/definir-senha`; defina uma senha (mínimo 8) e entre: cai em `/aluno/livros`. O mesmo link não funciona uma segunda vez.

### 3.4 Acervo e importação (cards 0022, 0233)

- [ ] `/funcionario/acervo`: busca, filtros, contadores; em 375 vira cartões com capa.
- [ ] Importar planilha `.csv` ou `.xlsx` pelo "Importar planilha": baixe o modelo, mande um arquivo com 2 livros de teste (código com prefixo `QA-`) e confira os erros por linha com um arquivo malformado. Depois exclua os livros `QA-` (seção 8).

### 3.5 Balcão (cards 0089, 0037, 0038, 0041, 0058, 0059)

- [ ] **Empréstimo** (5 passos) para o usuário de teste da seção 3.3: busca por nome ou matrícula, escolhe o livro, vê o resumo (retirada hoje, devolução em 7 dias), confirma e vê o comprovante.
- [ ] O limite de 3 livros bloqueia o 4º empréstimo (4 para formando); o aluno de teste, que tem atrasados, **não** consegue novo empréstimo (alerta de pendência).
- [ ] **Renovação:** soma 7 dias ao prazo atual e conta "1 de 3"; a 4ª renovação é recusada.
- [ ] **Devolução:** devolve o livro (volta a "Disponível"); devolução com atraso gera multa de R$ 1,00 por dia.
- [ ] Clique duplo no "Confirmar" não duplica o empréstimo.

### 3.6 Multas e histórico (cards 0061, 0145, 0146, 0068, 0069, 0150 a 0152)

- [ ] `/funcionario/multas`: lista com filtros; a baixa abre o modal e registra autor e data. Hoje há 2 multas em aberto do aluno de teste (R$ 37,00 e R$ 27,00): dê baixa em uma para testar e, se quiser repetir, peça para reabrir (seção 8). Devolver um dos livros atrasados também fecha a multa daquele empréstimo no valor final.
- [ ] `/funcionario/historico`: busque por pessoa e por livro; o filtro de período e situação funciona; mostra retirada, prazo, devolução, renovações e multa.

### 3.6.1 Relatórios (cards 0070 a 0073, 0096, 0154 a 0156)

Antes: a migration `20261113300000_relatorios.sql` precisa estar aplicada (`supabase db push --linked --include-all`). Sem ela a tela mostra a tela de erro.

- [ ] Menu Gestão → **Relatórios** abre `/funcionario/relatorios`. Aluno e professor, ao digitar o endereço, voltam para a própria área.
- [ ] **Livros em atraso** (abre assim): cada linha tem usuário, matrícula, livro, tombo, prazo, dias de atraso e multa estimada (R$ 1,00 por dia corrido). Conferir com o Painel: "Atrasados" e com Multas. Os dois cartões do alto (empréstimos e multa estimada) somam o filtro inteiro, não só a página.
- [ ] Situação **Devolvidos com atraso** e **Todos** mudam a lista; o filtro de **Prazo de / Até** funciona e a data inicial depois da final mostra o aviso. O endereço guarda os filtros (copiar e colar abre igual).
- [ ] Aba **Acervo**: uma linha por categoria com títulos, exemplares, disponíveis, emprestados, reservados (reserva pedagógica aprovada guarda 1 exemplar) e inativos; a última é "Sem categoria". Os cartões do alto são os totais do acervo.
- [ ] Aba **Reservas pedagógicas**: filtro por situação e período do pedido; os cartões mostram solicitações, aprovadas, recusadas e aguardando; cada linha traz professor, disciplina, período e livros.
- [ ] Mais de 10 resultados: a paginação funciona e o texto "Mostrando 1-10 de N" confere. Filtro sem resultado mostra "Limpar filtros".
- [ ] **CSV**: baixa `relatorio-<tipo>-<data>.csv`; abrir no Excel/Planilhas mostra acentos certos e colunas separadas. Se algum nome ou título começar com `=`, `+`, `-` ou `@`, a célula aparece com `'` na frente (não vira fórmula).
- [ ] **PDF**: baixa `relatorio-<tipo>-<data>.pdf` (A4 deitado) com título, filtros aplicados, tabela e rodapé com data e página. A exportação traz até 1000 linhas; passando disso a tela avisa.
- [ ] 375 px e 768 px sem rolagem lateral (tabela vira cartões no celular), tema claro e escuro.
- [ ] Sem linhas, os botões CSV e PDF ficam desativados.

### 3.7 Reserva pedagógica (cards 0090 a 0092, 0136, 0137, 0141, 0048)

- [ ] `/funcionario/reservas-pedagogicas`: fila com chips (Pendentes, Aprovadas, Recusadas, Devolvidas); tabela no desktop e cartões abaixo de 1024 px.
- [ ] "Registrar solicitação presencial": 4 passos (professor, livros, prazo, registrar); prazo acima do limite (padrão 30 dias) é recusado.
- [ ] **Limite de dias:** no quadro azul da fila, o campo "Prazo máximo (dias)" começa em 30 e o "Salvar" só habilita quando o valor muda. Salve 45: aparece "Limite salvo: 45 dias", o texto da regra passa a dizer 45 e o formulário do balcão aceita "Máximo de 45 dias". Volte para 30 no fim. O professor vê o mesmo limite em "por até N dias". Só a funcionária altera.
- [ ] Aprovar; recusar **exige justificativa**; devolver pede confirmação.

## 4. Professor (`professor@fapbooks.test`)

- [ ] Entra em `/professor/livros` com busca e filtros iguais aos do aluno.
- [ ] `/professor/reserva-pedagogica`: escolhe 1 ou mais livros, início, dias (1 a 30) e disciplina opcional; envia e aparece "Aguardando aprovação" em "Minhas reservas pedagógicas".
- [ ] Depois que a funcionária decide, o professor vê Aprovada, Recusada (com a justificativa) ou Devolvida.
- [ ] O assistente de ajuda aparece também para o professor; o item "Reserva pedagógica" está no menu.

## 5. Transversal (vale para todas as telas)

- [ ] Tema claro e escuro legíveis (contraste, bordas, selos).
- [ ] Celular 375 e tablet 768: sem rolagem lateral, botões alcançáveis, menu em hambúrguer no celular.
- [ ] Teclado: Tab percorre na ordem, o foco aparece, Esc fecha modais e o assistente.
- [ ] Console do navegador (F12) sem erro vermelho do app.
- [ ] Título da aba certo em cada tela.

## 6. Segurança (conferência rápida)

- [ ] Cadastro direto na API é recusado: no terminal, `curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"x@example.com","password":"Senha-12345"}'` deve devolver `signup_disabled`.
- [ ] Limite global: mais de 60 POSTs por minuto de um mesmo IP recebem `429` (regra do WAF da Vercel).
- [ ] Aluno e professor não abrem nenhuma tela da funcionária.

## 7. Itens que você precisa saber que estão abertos (não são falha do QA)

- Área do aluno (meus empréstimos, renovação, reservas, multas): cards 0214 a 0217, com o Igor.
- Aviso automático por e-mail: card 0236. Prova de carga: card 0235. Observabilidade com alerta: card 0252.
- QA que ainda não foi feito (inativar livro, "Sair e voltar", Lighthouse, celular 375/768, teclado e leitor de tela, capas, newsletter real e as perguntas do balão): card 0248.
- Conferência com o Figma das telas restantes: card 0249; extras do site ainda sem desenho: card 0251. O painel geral do Histórico (indicadores e exportar CSV) virou a tela Relatórios (seção 3.6.1).

## 8. Como deixar o banco limpo no fim

Peça ao Claude ("limpa o banco de teste") ou rode no Supabase (SQL Editor), nesta ordem:

1. Apagar o usuário de teste criado na seção 3.3 (Authentication, Users) e os empréstimos dele.
2. Apagar os livros `QA-` e as reservas pedagógicas de teste.
3. Voltar o telefone do aluno de teste para vazio.
4. Se algum dos dois livros atrasados do aluno de teste foi devolvido (gera multa real), o estado original é: **Dom Casmurro** e **Clean Code** abertos, A Hora da Estrela aberto, 2 multas em aberto (R$ 37,00 do Clean Code e R$ 27,00 do Dom Casmurro; se alguma foi paga no teste, reabra com `update fines set paid_at = null, paid_by = null where amount_cents = <valor>`).
5. Voltar o limite da reserva pedagógica para 30 dias (pela própria tela).

Estado esperado ao terminar: 3 empréstimos abertos (todos do aluno de teste), 2 multas em aberto, 0 reservas pedagógicas, limite em 30 dias, 4 perfis.
