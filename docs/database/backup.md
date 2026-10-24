# Backup do banco

Card `FAP - 0015` · requisito não funcional do [PRD](../prd.md) (seção 7: backup periódico do banco).

## O que o plano do Supabase oferece

O projeto `fap-books` está no plano **gratuito (Free)**. Conforme a [documentação do Supabase](https://supabase.com/docs/guides/platform/backups), só os planos Pro, Team e Enterprise têm backup diário automático. Para o plano gratuito, a própria Supabase recomenda **exportar os dados com frequência e guardar uma cópia fora do projeto**. É isso que esta rotina faz.

## Como funciona

Um workflow do GitHub Actions (`.github/workflows/backup-banco.yml`) roda **todo dia às 03:00 (horário de Brasília)** e também quando alguém clica em *Run workflow*. Ele chama `scripts/backup-banco.sh`, que:

1. exporta os **dados** do schema `public` (livros, perfis, empréstimos, multas, reservas e auditoria) e os **logins** (`auth.users` e `auth.identities`);
2. anota quantas linhas cada tabela tem, para conferir na restauração;
3. empacota tudo e **criptografa** (AES-256) com a senha `BACKUP_PASSPHRASE`;
4. guarda o arquivo `fap-books-AAAAMMDD-HHMMSS.tar.enc` como **artefato do GitHub por 30 dias**.

O repositório é público, por isso o arquivo **só sai criptografado**: sem a senha, ele não revela nada.

### O que fica de fora

- **A estrutura do banco** (tabelas, regras de acesso): ela vem das *migrations* em `supabase/migrations/`, que já estão no Git.
- **Os arquivos do Storage** (as capas dos livros): o banco guarda só o endereço delas. Guarde as imagens originais em outro lugar.
- Perda máxima em um desastre: até **24 horas** de dados (o intervalo entre dois backups).

## Configuração (uma vez só, por quem administra o repositório)

No GitHub: **Settings > Secrets and variables > Actions > New repository secret**. Crie dois segredos:

| Segredo | O que é |
| -- | -- |
| `SUPABASE_DB_URL` | Endereço de conexão do banco. No painel do Supabase: **Connect > Session pooler**, copiar o endereço e trocar `[YOUR-PASSWORD]` pela senha do banco. Use o *Session pooler*: o endereço direto só funciona por IPv6 e o GitHub não alcança. |
| `BACKUP_PASSPHRASE` | Uma senha longa e aleatória (por exemplo, a de um gerenciador de senhas). **Guarde uma cópia fora do GitHub**: sem ela o backup não abre. |

Nunca coloque esses valores no Git, no chat ou em print. Para testar na hora, abra **Actions > Backup do banco > Run workflow**: o resultado aparece como artefato na página da execução. Se faltar um segredo, o workflow falha e diz qual.

> O agendamento só roda a partir da branch `main`. Se o repositório ficar mais de 60 dias sem nenhuma atividade, o GitHub pausa as rotinas agendadas e é preciso reativá-las na aba Actions.

## Baixar um backup

1. **Actions > Backup do banco**, abrir uma execução com sinal verde.
2. Em **Artifacts**, baixar `backup-banco-<número>` (vem um `.zip` com o `.tar.enc` dentro).

## Restaurar

Faça **sempre primeiro num banco de teste**. Precisa do Docker e de `psql`, `pg_restore` e `openssl`.

```bash
# 1. banco de teste (PostgreSQL 17) e estrutura pronta
docker run -d --name fapdb -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:17
docker exec -i fapdb psql -U postgres -q < supabase/tests/00-simula-supabase.sql   # só no teste: cria os papéis e o schema auth do Supabase
for f in supabase/migrations/*.sql; do docker exec -i fapdb psql -U postgres -q -v ON_ERROR_STOP=1 < $f; done

# 2. restaurar os dados
export BACKUP_PASSPHRASE='a-senha-do-backup'
export DESTINO_DB_URL='postgresql://postgres:x@localhost:5433/postgres'
scripts/restaurar-backup.sh fap-books-AAAAMMDD-HHMMSS.tar.enc
```

O script descriptografa, restaura e **compara a contagem de cada tabela** com a do dia do backup. No fim deve aparecer `Restauração conferida.`; se alguma tabela diferir, ele lista qual.

Para restaurar num **projeto novo do Supabase** (desastre de verdade): crie o projeto na região São Paulo, aplique as migrations (SQL Editor, na ordem), use o endereço do *Session pooler* do projeto novo como `DESTINO_DB_URL` e rode o mesmo script (sem o passo do simulador, que é só para o teste). Depois reenvie as capas ao bucket `book-covers`.

## Testado

Em 2026-10-23, em dois PostgreSQL 17 descartáveis: o backup foi gerado com 20 livros, 3 perfis, 3 empréstimos e 3 logins; o arquivo não continha texto legível; a restauração com senha errada falhou; e a restauração com a senha certa recuperou todas as tabelas com a mesma contagem. O workflow em si só roda de verdade depois dos dois segredos criados e da entrega na `main`.

## Quem faz o quê

- **Responsável técnico (Thiago):** cria os segredos, confere de vez em quando se há um backup recente verde e testa a restauração de tempos em tempos (por exemplo, uma vez por mês).
