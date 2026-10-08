# Dicas de quem trabalha na área

Hábitos que programadores experientes têm e que você pode começar a praticar **desde o primeiro dia**. Nenhum exige ser expert: exigem só disciplina.

## 1. Ler o erro (a habilidade mais valiosa)

Metade do trabalho é entender mensagens de erro. Todo mundo, em qualquer nível, passa por isso.

1. **Leia a mensagem inteira**, de cima para baixo, antes de fazer qualquer coisa.
2. Procure **o arquivo e a linha**. Quase sempre a mensagem diz.
3. Procure a **primeira** linha de erro. O resto costuma ser consequência.
4. Copie a frase principal (sem seus nomes de arquivo) e pesquise.
5. Mudou uma coisa e quebrou? **Desfaça só essa coisa** e veja se volta.

## 2. Divida o problema

- Não resolva "a tela de empréstimo". Resolva "mostrar a lista de livros", depois "buscar o livro", depois "registrar".
- Se travou, **reduza**: faça o menor exemplo que reproduz o problema.
- Se um passo demora mais de uns 30 minutos sem avanço, **peça ajuda** (com o que você já tentou).

## 3. Como pedir ajuda bem

Uma boa pergunta já vem meio respondida. Mande:

1. **O que você queria fazer.**
2. **O que aconteceu** (a mensagem de erro **completa**, em texto, não só um print recortado).
3. **O que você já tentou.**
4. O arquivo e a linha, ou o link do PR.

Evite "não funciona" sozinho. E pergunte sem vergonha: todos aqui estão aprendendo.

## 4. Git e Pull Request

- **Commit pequeno e frequente.** Uma ideia por commit.
- **Mensagem de commit útil:** `feat: adiciona lista de livros`, e não `ajustes`.
- **Pull Request pequeno.** PR de 50 linhas é revisado em minutos; PR de 800 vira fila.
- **Revise o seu próprio diff antes de pedir revisão.** Você acha metade dos erros sozinho.
- **Nunca** `git push --force` em branch compartilhada.
- **Atualize a branch** (`git pull` na `develop`) antes de começar a trabalhar.
- Escreva a descrição do PR para quem não viu nada: o que mudou, por quê e como testar.

## 5. Revisão de código (quando você revisa)

- Pergunte, não ordene: "o que acontece se a lista vier vazia?".
- Elogie o que ficou bom e explique o motivo de cada pedido.
- Se não entendeu, **diga**: é sinal de que o código ou a explicação precisa melhorar.
- Revisar os colegas é o jeito mais rápido de aprender.

## 6. Código que outros conseguem ler

- **Nomes que explicam:** `overdueLoans`, não `lista2`. `calculateFine`, não `calc`.
- **Funções curtas, com uma tarefa.** Se precisa de "e" para descrever, são duas funções.
- **Comente o porquê, não o quê.** `// multa em centavos para evitar erro de arredondamento` ajuda; `// soma 1` não.
- **Apague código comentado.** O Git guarda o histórico.
- **Sem `console.log` esquecido** no PR.
- Siga o jeito do projeto, mesmo que você prefira outro.

## 7. Segurança desde o começo

- **Chave, senha e token nunca** no Git, no grupo, em print ou em e-mail. Se escapou, avise na hora: a chave precisa ser trocada.
- **Nunca confie no que o usuário digita.** Valide sempre.
- **Toda tabela do banco tem RLS.**
- **Menor permissão possível.** Se só precisa ler, não dê poder de apagar.
- Desconfie de comando copiado da internet: entenda antes de rodar, principalmente os que apagam ou usam `sudo`.

## 8. Testar antes de entregar

- "Funcionou aqui" não é prova. Teste **o caminho feliz e o caminho triste**: lista vazia, erro, pessoa sem permissão.
- Teste no **celular e no computador**.
- Rode `npm run lint`, `npm run typecheck` e `npm run build` antes de abrir o PR.
- Regra do negócio (limite, prazo, multa) merece **teste automatizado**.

## 9. Aprender mais rápido

- **Tente antes de pesquisar.** Errar e ler o erro ensina mais que a resposta pronta.
- **Leia a documentação oficial**: parece chata, mas é a fonte certa e atual.
- **Copiar um trecho só vale se você consegue explicar linha por linha.**
- **Anote** o que aprendeu e o que ainda não entendeu. Releia na semana seguinte.
- **Explique em voz alta** para um colega. Se não consegue explicar, ainda não entendeu.
- Cuidado com tutoriais antigos: confira a data e a versão.

## 10. Organização e cuidado

- **Um card por vez.** Terminar uma coisa vale mais que começar cinco.
- **Pare e descanse** quando travar. Muita solução aparece depois de uma pausa.
- **Faça backup mental do que funcionava:** commit antes de uma mudança grande.
- **Cumpra o combinado do time:** pergunte antes de criar pasta, camada ou ferramenta nova.
- Erro todo mundo comete. O que importa é **avisar cedo** e **aprender com ele**.

## Atalhos úteis do VS Code

| Atalho | O que faz |
| -- | -- |
| `Ctrl + P` | Abre um arquivo pelo nome |
| `Ctrl + Shift + F` | Busca um texto em todos os arquivos |
| `Ctrl + /` | Comenta ou descomenta a linha |
| `Alt + ↑` ou `Alt + ↓` | Move a linha |
| `Ctrl + D` | Seleciona a próxima ocorrência da palavra |
| `F2` | Renomeia uma variável em todos os lugares |
| `Ctrl + `` ` | Abre o terminal |
