# Roteiro de QA em produção (v1.0.1)

Para o Thiago testar `https://fap-books.vercel.app` com calma, na ordem. Cada item tem o resultado esperado. Marque `[x]` o que passou e anote o que falhou (card, tela e o que apareceu).

## 0. Antes de começar

**Contas de teste** (as senhas ficam só em `~/.config/fap-books/usuarios-teste-senhas`, nunca no Git, no chat ou no Trello; digite você mesmo na produção):

| Perfil | E-mail | Entra em |
| -- | -- | -- |
| Funcionária | `funcionario@fapbooks.test` | `/funcionario/painel` |
| Professor | `professor@fapbooks.test` | `/professor/livros` |
| Aluno | `aluno@fapbooks.test` | `/aluno/livros` |

**Estado inicial do banco** (conferido em 14/11/2026): limpo. **0 empréstimos abertos** (7 no histórico, todos devolvidos), **0 multas em aberto**, 2 reservas de fila e 6 reservas pedagógicas antigas, **20 livros ativos**, limite da reserva pedagógica em 30 dias e 4 perfis (as 3 contas de teste e o Thiago). O banco é único e não tem dado real: pode testar à vontade, mas deixe como na seção 8. Os testes de aviso de prazo, atraso e multa precisam de um empréstimo com prazo curto: crie o empréstimo no Balcão e peça ao dono para antecipar o prazo (seção 8, "Preparar prazo de teste").

**Dicas:** use uma janela anônima por perfil (os cookies não se misturam); para tema claro/escuro e celular, abra as ferramentas do navegador (F12) e emule a largura 375 e 768; não há botão de tema, o app segue o sistema.

**Para testar escrita sem sujar as contas de teste**, cadastre um usuário só para isso (seção 3.3) com `thiagodutrasap+qa1@gmail.com` (cai na caixa do `thiagodutrasap@gmail.com`).

## 1. Visitante (sem login)

- [ ] `/` abre a landing com contato, FAQ e newsletter; sem rolagem lateral em 375 e 768.
- [ ] `/login` abre; entrar com senha errada mostra erro em português e não revela se o e-mail existe.
- [ ] `/funcionario/painel`, `/aluno/livros`, `/professor/livros` sem login mandam para `/login`.
- [ ] **Esqueci minha senha (card 0266):** no `/login` há o link "Esqueci minha senha" que abre `/esqueci-senha`. Digite o e-mail de uma conta de teste: aparece sempre a mesma confirmação neutra ("se o e-mail existir, enviamos o link"), também com um e-mail que não existe. O e-mail "Redefinir sua senha na biblioteca da FAP" chega com a logo; o botão abre "Redefina sua senha"; salvar a senha leva à primeira tela do perfil. O mesmo link não funciona uma segunda vez. E-mail inválido mostra erro no campo; repetir o pedido muitas vezes mostra o aviso de espera.
- [ ] `/privacidade`, `/termos` e `/acessibilidade` abrem.
- [ ] Rota que não existe (ex.: `/xyz`) mostra a página 404 com o título da aba "Página não encontrada".
- [ ] Link direto de área protegida sem login (ex.: `/funcionario/acervo?q=dom`) leva a `/login?next=...` e, depois de entrar, volta para o endereço pedido.

## 2. Aluno (`aluno@fapbooks.test`)

- [ ] Entra direto em `/aluno/livros` (card 0108 e acesso por perfil).
- [ ] Busca "casmurro": acha o livro; filtros de categoria e disponibilidade funcionam; a página do livro mostra exemplares livres.
- [ ] Livro **com** exemplar livre: a página mostra "Há exemplar livre: peça o empréstimo no balcão" e nenhum botão de reserva.
- [ ] Livro **sem** exemplar livre (ex.: Clean Code): aparece "Solicitar reserva" (fila vazia) ou "Entrar na lista de espera" e o tamanho da fila. O aluno de teste tem atraso e multa, então o clique mostra "Você tem livro em atraso ou multa em aberto..." (bloqueio correto). Para ver a fila funcionando, use o usuário de teste da seção 3.3 (sem multa).
- [ ] Menu do aluno: "Minha área", "Buscar livros", "Meus empréstimos", "Minhas reservas" e "Multas", todos com tela (cards 0212 e 0214 a 0217).
- [ ] `/aluno` (Minha área): cartões "Livros emprestados" (`3 de 3`), "Prazos próximos ou atrasados" e "Multa em aberto"; faixa de atenção lista os livros atrasados com selo "Atrasado"; aviso do pagamento presencial com (44) 3236-8065.
- [ ] `/aluno/emprestimos`: um cartão por livro com prazo e renovações (`0 de 3`); com atraso ou multa em aberto o botão "Renovar" fica desligado e o motivo aparece escrito. (Para ver a renovação funcionando, use o usuário de QA da seção 3.3, sem multa nem atraso: o prazo sobe 7 dias e o contador vira `1 de 3`.)
- [ ] `/aluno/reservas`: mostra o estado vazio "Você não tem reservas" (a fila de espera é outro card).
- [ ] `/aluno/multas`: multas em aberto primeiro, valor em R$, aviso "pagamento somente na biblioteca". Pagas aparecem depois, com a data.
- [ ] 375 e 768 px sem rolagem lateral, botões com 44 px de altura, tema claro e escuro legíveis.
- [ ] **Assistente de ajuda** (balão no canto, card 0234): pergunte "qual o horário", "como renovar", "como funciona a multa", "quantos livros posso pegar", "qual o contato". As respostas batem com a regra (7 dias, 3 livros, 4 para formandos, renovar até 3 vezes, R$ 1,00 por dia). Uma pergunta fora do assunto ("posso trazer meu cachorro?") mostra "Falar no WhatsApp", que abre o número (44) 3236-8065 com a pergunta preenchida. Esc fecha e devolve o foco ao botão.
- [ ] Abrir `/funcionario/painel` e `/professor/livros` com o aluno redireciona para a área dele.

## 3. Funcionária (`funcionario@fapbooks.test`)

### 3.1 Painel e avisos (cards 0097, 0094, 0158, 0234)

- [ ] `/funcionario/painel` mostra os 4 números (emprestados, atrasados, disponíveis, multas) e eles batem com a seção 0 (0 emprestados, 0 atrasados, multas R$ 0,00; "Disponíveis" é a soma dos exemplares dos livros ativos) e depois do primeiro empréstimo do Balcão. A busca do topo ("Buscar livros por título, autor ou ISBN") só aparece no Painel e leva ao acervo filtrada.
- [ ] Faixa de aviso ("... vence em até 2 dias e 2 estão atrasados") e a lista "Pendências de hoje".
- [ ] "Ver avisos de prazo" abre `/funcionario/painel/avisos`, agrupado em Vence hoje e Atrasado; os chips filtram.
- [ ] **Botão "Avisar no WhatsApp":** o aluno de teste não tem telefone, então aparece "Sem telefone cadastrado". Edite o aluno de teste em Usuários e ponha um telefone seu (só números com DDD) para ver o botão; ele abre o WhatsApp com a mensagem pronta (vence hoje, ou atrasado com dias e multa). Depois **apague o telefone** (seção 8).

### 3.2 Usuários (cards 0088, 0127, 0128)

- [ ] `/funcionario/usuarios`: lista paginada, busca por nome, e-mail ou matrícula, filtros "Perfil" e "Status".
- [ ] Editar abre o modal, salva e mostra o resultado; matrícula repetida é recusada em português.
- [ ] Inativar pede confirmação (e avisa quando a pessoa tem empréstimo em aberto); reativar volta ao normal. A funcionária **não** inativa nem muda o próprio perfil.

### 3.3 Cadastro e convite por e-mail (cards 0087, 0029 a 0031)

- [ ] `/funcionario/usuarios/novo`: os 3 perfis mostram os campos certos (aluno com matrícula e curso; funcionária com cargo).
- [ ] Cadastre um aluno com `thiagodutrasap+qa1@gmail.com`. Aparece "Usuário cadastrado. O convite foi enviado por e-mail."
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

### 3.6b Fila de espera do livro (cards 0044 e 0045)

Use dois usuários novos sem multa (seção 3.3) e um livro com 1 exemplar. Empreste o exemplar a um deles (A) em Empréstimos.

- [ ] Como B, abra o livro: "Solicitar reserva". Clique: aparece "Você está na fila deste livro. Você é o próximo da fila." e o botão "Cancelar reserva". Clique duas vezes rápido no botão: só uma reserva é criada.
- [ ] Como A, o livro mostra "Você já está com este livro" ao tentar reservar (erro em português, sem botão quebrado).
- [ ] Como funcionária, o detalhe do livro (Acervo) mostra "Fila de espera" com B em 1º. Registre a devolução de A: B passa a "Pronta", com "Retire até ..." (2 dias), e o botão "Avisar no WhatsApp" (se B tiver telefone) abre a mensagem pronta.
- [ ] Outra pessoa (C) tenta pegar o exemplar guardado em Empréstimos: recusa "exemplar livre reservado para outra pessoa".
- [ ] "Expirar" na reserva pronta de B: some da fila; se C estiver na fila, passa a "Pronta". "Cancelar" tira a pessoa da fila e passa a vez.
- [ ] B cancela a própria reserva pelo botão "Cancelar reserva": a fila diminui. Um aluno não consegue cancelar a reserva de outra pessoa.
- [ ] Quem tem 3 livros emprestados (4 se formando) não entra na fila: "Você já está no limite de livros emprestados".
- [ ] Auditoria: reserva criada, cancelada, pronta e expirada aparecem em `audit_logs` só com ids.

### 3.7 Reserva pedagógica (cards 0090 a 0092, 0136, 0137, 0141, 0048)

- [ ] `/funcionario/reservas-pedagogicas`: fila com chips (Pendentes, Aprovadas, Recusadas, Devolvidas); tabela no desktop e cartões abaixo de 1024 px.
- [ ] "Registrar solicitação presencial": 4 passos (professor, livros, prazo, registrar); prazo acima do limite (padrão 30 dias) é recusado.
- [ ] **Limite de dias:** no quadro azul da fila, o campo "Prazo máximo (dias)" começa em 30 e o "Salvar" só habilita quando o valor muda. Salve 45: aparece "Limite salvo: 45 dias", o texto da regra passa a dizer 45 e o formulário do balcão aceita "Máximo de 45 dias". Volte para 30 no fim. O professor vê o mesmo limite em "por até N dias". Só a funcionária altera.
- [ ] Aprovar; recusar **exige justificativa**; devolver pede confirmação.
- [ ] **Renovação (cards 0053 e 0055):** o pedido do professor aparece nas Pendentes com a etiqueta **Renovação** e o título dos livros da reserva original. "Detalhes" explica que os exemplares já estão guardados e que aprovar só estende o prazo. Aprovar: a reserva original passa a terminar na nova data (Aprovadas) e a linha da renovação não tem botão de devolução. Recusar sem justificativa é impedido. Devolver a reserva original leva as renovações para Devolvidas (a pendente é cancelada). Antes de testar, rodar o `db push` da migration `20261113500000`.

## 4. Professor (`professor@fapbooks.test`)

- [ ] Entra em `/professor/livros` com busca e filtros iguais aos do aluno.
- [ ] `/professor/reserva-pedagogica`: escolhe 1 ou mais livros, início, dias (1 a 30) e disciplina opcional; envia e aparece "Aguardando aprovação" em "Minhas reservas pedagógicas".
- [ ] Depois que a funcionária decide, o professor vê Aprovada, Recusada (com a justificativa) ou Devolvida.
- [ ] **Renovar reserva:** numa reserva aprovada com mais de 7 dias para o fim, o cartão diz "Você poderá pedir a renovação a partir de dd/mm/aaaa" e não tem botão. Na última semana (use uma reserva de teste que termine em até 7 dias), aparece "Renovar reserva": abre "Dias a mais" (máximo = limite configurado), envia e mostra "Pedido de renovação enviado". O cartão da renovação aparece como "Renovação: ..." Aguardando aprovação e o botão some (só uma pendente por reserva). Dias acima do limite são recusados na tela. Depois de aprovada, a reserva original passa a terminar na nova data; recusada, mostra a justificativa.
- [ ] O assistente de ajuda aparece também para o professor; o item "Reserva pedagógica" está no menu.

## 5. Transversal (vale para todas as telas)

- [ ] Tema claro e escuro legíveis (contraste, bordas, selos).
- [ ] Celular 375 e tablet 768: sem rolagem lateral, botões alcançáveis, menu em hambúrguer no celular.
- [ ] **Alvo de toque de 44 px (card 0269):** no celular e no tablet em toque, todo botão, link, aba e campo tem pelo menos 44 px; no computador com mouse o tamanho é o menor de sempre.
- [ ] **Sair e voltar (card 0261):** depois de Sair, o botão Voltar do navegador leva ao login e não mostra a tela de quem saiu (teste nos 3 perfis).
- [ ] Teclado: Tab percorre na ordem, o foco aparece, Esc fecha modais e o assistente.
- [ ] Console do navegador (F12) sem erro vermelho do app.
- [ ] Título da aba certo em cada tela.

## 6. Segurança (conferência rápida)

- [ ] Cadastro direto na API é recusado: no terminal, `curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"x@example.com","password":"Senha-12345"}'` deve devolver `signup_disabled`.
- [ ] Limite global: mais de 60 POSTs por minuto de um mesmo IP recebem `429` (regra do WAF da Vercel).
- [ ] Aluno e professor não abrem nenhuma tela da funcionária.
- [ ] **Senha mínima de 8 no Supabase Auth (passo do dono, card 0258):** painel do Supabase > Authentication > Sign In / Providers > Email > *Minimum password length* = **8** (o padrão do Supabase é 6). O app já recusa menos de 8 no formulário e no servidor; este ajuste fecha a porta de quem chamar a API do Auth direto. Conferir: `curl -s -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/user" ...` exige sessão, então o teste prático é definir uma senha de 7 caracteres num convite de teste: o formulário recusa antes de enviar.

## 7. Itens que você precisa saber que estão abertos (não são falha do QA)

- **Domínio próprio para o e-mail (card 0259):** o e-mail funciona de graça pelo Gmail da biblioteca (aviso de prazo, convite e redefinição de senha); falta só o domínio verificado (SPF/DKIM), que depende da TI da FAP.
- **QA manual que só aparelho real faz (card 0248):** celular e tablet físicos (toque, teclado virtual), leitor de tela nos menus, modais e tabelas, e newsletter com e-mail real. O resto do 0248 foi automatizado em 14/11 (Lighthouse com acessibilidade 98 a 100 e boas práticas e SEO 100, teclado, capas, balão de ajuda, Sair e voltar, alvo de toque).
- **Listagem do aluno (cards 0260 e 0267):** a busca pagina no banco e o servidor gasta menos CPU por pedido; com 50 usuários simultâneos e 20 mil livros, o p95 ficou em ~450 ms (meta 500 ms), medido com um único processo Node; a Vercel escala horizontalmente.

## 8. Como deixar o banco limpo no fim

Peça ao Claude ("limpa o banco de teste") ou rode no Supabase (SQL Editor), nesta ordem:

1. Apagar o usuário de teste criado na seção 3.3 (Authentication, Users) e os empréstimos dele.
2. Apagar os livros `QA-` e as reservas pedagógicas e de fila de teste.
3. Voltar o telefone do aluno de teste para vazio e o e-mail dos perfis de teste para o original (`aluno@`, `professor@`, `funcionario@fapbooks.test`).
4. Devolver os empréstimos de teste que ficaram abertos e apagar as multas criadas por eles (`delete from public.fines where loan_id = '<id>'`).
5. Voltar o limite da reserva pedagógica para 30 dias (pela própria tela).

Estado esperado ao terminar: 0 empréstimos abertos, 0 multas em aberto, limite em 30 dias, 4 perfis e 20 livros ativos.

### Preparar prazo de teste (só o dono)

Para ver a faixa de avisos, o atraso e a multa, crie um empréstimo no Balcão e antecipe o prazo no SQL Editor (o app não deixa escolher prazo no passado):

```sql
-- vence hoje (avisos "vence hoje")
update public.loans set due_at = now() where id = '<id do empréstimo>';
-- atrasado 3 dias (a multa de R$ 1,00 por dia nasce na tarefa diária das 04:00)
update public.loans set due_at = now() - interval '3 days' where id = '<id do empréstimo>';
```

Para testar o e-mail de vencimento sem escrever para um endereço de teste inexistente, use um aluno com e-mail seu (`thiagodutrasap+aluno1@gmail.com`) e rode o workflow "Avisos de vencimento por e-mail" no GitHub (Actions): espera-se `sent:1` na primeira vez e `sent:0` na segunda.
