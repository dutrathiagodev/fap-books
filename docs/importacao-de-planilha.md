# Importação de livros por planilha

Cards: FAP-0022 (importação em lote) e FAP-0233 (`.xlsx`). Tela: cadastro de livro, aba **Importar planilha** (Figma, card 0117, frame "Aba Importar planilha (erros por linha)").

## O que a bibliotecária vê

1. Escolhe um arquivo **`.csv` ou `.xlsx`** (a primeira aba da planilha).
2. Pode baixar a **planilha modelo** nos dois formatos (cabeçalho e uma linha de exemplo).
3. Ao importar, as linhas boas entram no acervo e as ruins voltam numa tabela com **o número da linha e o motivo**, para corrigir e reenviar (as que entraram não se repetem; um código de chamada repetido recusa só aquela linha).

## Regras (iguais nos dois formatos)

| Regra | Valor |
| -- | -- |
| Tamanho do arquivo | até 200 KB |
| Livros por envio | até 100 (linhas em branco não contam) |
| Colunas | `titulo`, `autor`, `categoria`, `codigo`, `quantidade` (obrigatórias) e `isbn`, `editora`, `edicao` (opcionais). Maiúsculas e acentos no cabeçalho não importam |
| Validação de cada linha | as mesmas do formulário manual (`bookFormErrors`) |

O `.xlsx` só muda **como as linhas são lidas**: depois de virar uma lista de textos, passa pelo mesmo `parseBookRows` do `.csv` (`src/domain/books/book-import.ts`), com os mesmos limites e o mesmo relatório de erros por linha.

## Onde fica cada parte

| Arquivo | Papel |
| -- | -- |
| `src/app/funcionario/acervo/novo/actions.ts` | Ação do servidor: confere o perfil, o tamanho, o tipo e escolhe o leitor (`parseUpload`) |
| `src/domain/books/book-import.ts` | Colunas, limites, `.csv`, `parseBookRows` e as regras por linha |
| `src/domain/books/book-import-xlsx.ts` | Conferência do arquivo antes de abrir (tipo, zip, macro) e conversão das células em texto |
| `src/services/xlsx-reader.service.ts` | Único lugar que usa a biblioteca `read-excel-file`. **Só no servidor** |
| `src/domain/books/xlsx-writer.ts` | Gera o modelo `.xlsx` para baixar (zip sem compressão, sem biblioteca) |
| `src/components/BookImportForm.tsx` | A aba: envio, modelos, resumo e tabela de erros |
| `src/domain/books/xlsx-fixture.ts` | Só para testes: monta planilhas na memória (sem arquivo binário no Git) |

## Segurança do `.xlsx` (o arquivo vem do usuário)

A ordem importa: cada passo só acontece se o anterior passou, e a biblioteca é o último.

1. **Perfil**: só a bibliotecária (`requireRole`).
2. **Tamanho** (200 KB) antes de ler o arquivo para a memória.
3. **Extensão e tipo (MIME)**: só `.csv` e `.xlsx`. `.xlsm`/`.xlsb` (macro) e `.xls` são recusados pelo nome.
4. **Primeiros bytes**: um `.xlsx` é um zip e começa com `PK`. Um `.csv` renomeado para `.xlsx` (ou o contrário) é recusado como "arquivo inválido".
5. **Índice do zip** (`inspectXlsx`), lido sem descompactar nada: estrutura válida, até 200 itens, sem criptografia, com `[Content_Types].xml` e `xl/workbook.xml`, **sem `xl/vbaProject.bin`** (macro, mesmo com nome `.xlsx`) e com **no máximo 8 MB depois de descompactado** (proteção contra "zip bomb": 200 KB de zip podem virar gigabytes).
6. **Leitura**: só a primeira aba. A biblioteca devolve os valores guardados; ela **não calcula fórmulas, não segue links e não abre arquivos externos**. Fórmula vira o último valor salvo na célula.
7. **Limites**: planilha com mais de 500 linhas é recusada e só as 20 primeiras colunas são lidas (o excedente à direita é ignorado); depois, o limite de 100 livros do parser.
8. **Texto previsível**: número vira texto sem notação científica (ISBN digitado como número continua inteiro), data vira `AAAA-MM-DD` (UTC), verdadeiro/falso viram `VERDADEIRO`/`FALSO`, o resto vira vazio.
9. **Erros**: qualquer falha da biblioteca vira "arquivo inválido". A mensagem original dela nunca chega à tela.

Os textos gravados passam pelas mesmas validações do formulário manual e são exibidos pelo React (escapados); nada vira HTML.

## Biblioteca escolhida

`read-excel-file` (somente `dependencies`, usada apenas no servidor).

- Faz uma coisa só: lê `.xlsx`. Menor e mais simples que `exceljs` (21 MB) ou `xlsx`/SheetJS (o pacote do npm está parado em versão com alertas conhecidos de poluição de protótipo e ReDoS).
- Mantida: versão 9.3.14, publicada em 29/10/2026.
- Dependências diretas: `fflate`, `saxen` (leitor de XML), `unzipper-esm`, `worker-f`.
- `npm audit --omit=dev`: **0 vulnerabilidades** (o único alerta do `npm audit` completo é o `zod`, que vem do `eslint-config-next`, já existia antes e é só de desenvolvimento).
- Fora do navegador: o orçamento de JavaScript (`scripts/orcamento-bundle.mjs`) continua dentro do teto, e nenhum arquivo de `.next/static` contém código da biblioteca.

## Testes

- `src/domain/books/book-import-xlsx.test.ts`: tipo do arquivo, zip (válido, `.csv` renomeado, cortado, índice errado, não-planilha, macro, "zip bomb") e conversão das células.
- `src/services/xlsx-reader.service.test.ts`: planilha válida, planilha modelo, primeira aba, cabeçalho errado, linha com erro, fórmula, data e número, mais de 100 livros, milhares de linhas, `.csv` renomeado, zip malformado e `.xlsm`.
- `src/domain/books/book-import.test.ts`: o `.csv` (continua igual).

## Fora do escopo / limites conhecidos

- Só a primeira aba é lida; abas extras são ignoradas sem aviso.
- O modelo `.xlsx` não tem formatação (cabeçalho em negrito, listas de categoria): só texto.
- Os limites de 200 KB, 100 livros e a validação por linha são os do `.csv`; mudar um muda os dois.
