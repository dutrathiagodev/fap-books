# Roteiro de QA em produção (v0.8.1)

Para o Thiago testar `https://fap-books.vercel.app` com calma, na ordem. Cada item tem o resultado esperado. Marque `[x]` o que passou e anote o que falhou (card, tela e o que apareceu).

## 0. Antes de começar

**Contas de teste** (as senhas ficam só em `~/.config/fap-books/usuarios-teste-senhas`, nunca no Git, no chat ou no Trello; digite você mesmo na produção):

| Perfil | E-mail | Entra em |
| -- | -- | -- |
| Funcionária | `funcionario@fapbooks.test` | `/funcionario/painel` |
| Professor | `professor@fapbooks.test` | `/professor/livros` |
| Aluno | `aluno@fapbooks.test` | `/aluno/livros` |

**Estado inicial do banco** (conferido em 09/11/2026): aluno de teste com **3 empréstimos abertos** (A Hora da Estrela vence em 09/11; Clean Code e Dom Casmurro atrasados), 0 multas, 0 reservas pedagógicas, 4 perfis (as 3 contas de teste e o Thiago). O banco é único e não tem dado real: pode testar à vontade, mas deixe como na seção 8.

**Dicas:** use uma janela anônima por perfil (os cookies não se misturam); para tema claro/escuro e celular, abra as ferramentas do navegador (F12) e emule a largura 375 e 768; não há botão de tema, o app segue o sistema.

**Para testar escrita sem sujar as contas de teste**, cadastre um usuário só para isso (seção 3.3) com `skytek7reg+qa1@gmail.com` (cai na caixa do `skytek7reg@gmail.com`).

## 1. Visitante (sem login)

- [ ] `/` abre a landing com contato, FAQ e newsletter; sem rolagem lateral em 375 e 768.
- [ ] `/login` abre; entrar com senha errada mostra erro em português e não revela se o e-mail existe.
- [ ] `/funcionario/painel`, `/aluno/livros`, `/professor/livros` sem login mandam para `/login`.
- [ ] `/privacidade`, `/termos` e `/acessibilidade` abrem.
- [ ] Rota que não existe (ex.: `/xyz`) hoje leva ao login (P2 aberto: decidir se vira página 404).

## 2. Aluno (`aluno@fapbooks.test`)

- [ ] Entra direto em `/aluno/livros` (card 0108 e acesso por perfil).
- [ ] Busca "casmurro": acha o livro; filtros de categoria e disponibilidade funcionam; a página do livro mostra exemplares livres.
- [ ] Botões "Solicitar reserva" e "Entrar na lista de espera" aparecem desabilitados ("Em breve"): é proposital.
- [ ] Menu "Meus empréstimos", "Reservas" e "Multas" aparecem sem tela (os cards 0214 e 0215 estão com o Igor).
- [ ] **Assistente de ajuda** (balão no canto, card 0234): pergunte "qual o horário", "como renovar", "como funciona a multa", "quantos livros posso pegar", "qual o contato". As respostas batem com a regra (7 dias, 3 livros, 4 para formandos, renovar até 3 vezes, R$ 1,00 por dia). Uma pergunta fora do assunto ("posso trazer meu cachorro?") mostra "Falar no WhatsApp", que abre o número (44) 3236-8065 com a pergunta preenchida. Esc fecha e devolve o foco ao botão.
- [ ] Abrir `/funcionario/painel` e `/professor/livros` com o aluno redireciona para a área dele.

## 3. Funcionária (`funcionario@fapbooks.test`)

### 3.1 Painel e avisos (cards 0097, 0094, 0158, 0234)

- [ ] `/funcionario/painel` mostra os 4 números (emprestados, atrasados, disponíveis, multas) e eles batem com a seção 0 (3 emprestados, 2 atrasados, R$ 0,00).
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

- [ ] `/funcionario/multas`: lista com filtros; a baixa abre o modal e registra autor e data. **Só faça a baixa de multa de teste** (se devolver um dos livros atrasados do aluno, ele gera multa real de R$ 27 ou R$ 37; veja a seção 8).
- [ ] `/funcionario/historico`: busque por pessoa e por livro; o filtro de período e situação funciona; mostra retirada, prazo, devolução, renovações e multa.

### 3.7 Reserva pedagógica (cards 0090 a 0092, 0136, 0137, 0141, 0048)

- [ ] `/funcionario/reservas-pedagogicas`: fila com chips (Pendentes, Aprovadas, Recusadas, Devolvidas); tabela no desktop e cartões abaixo de 1024 px.
- [ ] "Registrar solicitação presencial": 4 passos (professor, livros, prazo, registrar); prazo acima de 30 dias é recusado.
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

- Área do aluno (meus empréstimos, renovação, reservas, multas): cards 0214 e 0215, com o Igor.
- Aviso automático por e-mail: card 0236. Prova de carga: card 0235.
- Página 404 para visitante (P2) e linha clicável só no nome na aba Renovação (P3).
- Conferência lado a lado com o Figma: parcial; histórico por pessoa e a fila com "Devolvidas" e "Disciplina" foram mantidos de propósito (decisão registrada no card 0226).
- Balão do assistente e botão de WhatsApp não têm frame no Figma.

## 8. Como deixar o banco limpo no fim

Peça ao Claude ("limpa o banco de teste") ou rode no Supabase (SQL Editor), nesta ordem:

1. Apagar o usuário de teste criado na seção 3.3 (Authentication, Users) e os empréstimos dele.
2. Apagar os livros `QA-` e as reservas pedagógicas de teste.
3. Voltar o telefone do aluno de teste para vazio.
4. Se algum dos dois livros atrasados do aluno de teste foi devolvido (gera multa real), o estado original é: **Dom Casmurro** e **Clean Code** abertos, A Hora da Estrela aberto, 0 multas.

Estado esperado ao terminar: 3 empréstimos abertos (todos do aluno de teste), 0 multas, 0 reservas pedagógicas, 4 perfis.
