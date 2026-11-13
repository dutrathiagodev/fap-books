# Infraestrutura, cache e plano gratuito

Cards `FAP - 0230`, `0231` e `0232` (origem: `0225`, System design). Este documento registra o que foi decidido, o que já protege o app, o que custa e o que ainda falta. Valores de limite dos planos mudam: **confirme nas páginas de preço da Supabase e da Vercel** antes de decidir com base neles.

## 1. Cache e renderização (Next 16)

O projeto usa `cacheComponents: true` e `partialPrefetching: true` (`next.config.ts`). Nas telas autenticadas, a parte fixa da página vai pronta e o dado de cada pessoa chega em seguida (transmitido por streaming).

### Decisão: dado por usuário nunca entra em cache

Toda leitura dos serviços usa o cliente do Supabase com os cookies da pessoa, porque o RLS decide o que ela vê (`books_select_logged_in` libera só quem está logado). Por isso:

- `use cache` **não pode** envolver essas leituras: o cache é compartilhado entre pessoas e a função dentro dele não pode ler `cookies()`. Cachear daria o dado de uma pessoa para outra.
- O `await connection()` que existe nos serviços é necessário: avisa o Next que a leitura é por requisição e evita que a build tente montar a página antes.

### O que está em cache

Só dado **igual para todo mundo**. A migration `20261108130000_public_book_categories.sql` cria `public_book_categories(p_active_only)`, que o `anon` pode executar e que devolve **só nomes de categoria** (nenhum título, código ou empréstimo; o `anon` continua sem ler a tabela `books`, testado).

| Dado | Situação |
| -- | -- |
| Categorias do filtro | **Feito.** `getCachedCategories` (`src/services/catalog-cache.service.ts`) usa `use cache`, `cacheLife('hours')` e `cacheTag('catalogo')`, lendo com a chave pública. Todas as ações que mudam livros (criar, importar, editar, inativar, excluir) chamam `invalidateCatalogCache()` (`updateTag`) e a lista renova na hora |
| Queda segura | Se o cache falhar (ex.: a migration ainda não foi aplicada no banco), `loadCategories` cai para a leitura direta com a sessão da pessoa. Nada quebra fora de ordem |
| Contadores do acervo | **Não cacheados, de propósito.** Dependem do filtro e da situação do empréstimo (muda a cada devolução); o ganho vem da função SQL da frente A (uma consulta no banco, sem ler tabelas inteiras), não de cache |
| Capas | Já cacheadas: o upload grava `cacheControl: 31536000` (1 ano) e o nome é um UUID que nunca se repete |
| Números da página inicial | Texto fixo (`src/content/landing.ts`), prerenderizado |

**Ordem de deploy:** aplique a migration antes do código para o cache valer; sem ela o app funciona pela queda segura.

### Imagens de capa

`BookCover` usa `<img>` simples (as capas vêm do Storage, que serve com cache longo). Agora leva `loading="lazy"` e `decoding="async"`: a capa fora da tela só baixa quando a pessoa rola até ela. Não foi usado `next/image` de propósito: o otimizador da Vercel tem cota própria no plano gratuito, e a capa já chega pequena (limite de 2 MB no envio). Se um dia as capas pesarem, a alternativa é a transformação de imagem do Supabase Storage (recurso pago).

### First Load JS e streaming

- `npx next analyze` abre o analisador de bundle do Turbopack (Next 16.1+) para ver o que pesa por rota.
- O CI roda `scripts/orcamento-bundle.mjs` depois da build: soma o JavaScript do navegador (gzip) e falha se passar de **440 KB** no total ou **95 KB** em um arquivo (medido em 08/11/2026: 297 KB e 79 KB antes das telas de usuários, balcão, multas e histórico; 345 KB e 79 KB depois delas, por isso o teto total subiu de 340 para 380 KB; as telas da reserva pedagógica levaram o total a 385 KB e o teto a 400 KB; com o painel e a listagem de usuários o total foi a 405 KB e o teto a 440 KB). Subiu de propósito? Aumente o teto no mesmo PR e explique.
- Lighthouse no CI **não foi adicionado**: pede um app rodando com login e mais minutos de CI. Fica como evolução.
- Streaming com esqueleto nas telas autenticadas segue como está; revisar onde cada `connection()` é necessário depende de as consultas virarem funções SQL (card 0225, lista 1).

## 2. Limites, proteção e custo (plano gratuito)

### Limites que importam

| Recurso | Limite no plano gratuito | Alerta do projeto |
| -- | -- | -- |
| Banco (Supabase) | 500 MB | Falha do workflow *Saúde do Supabase* acima de 80% (400 MB) |
| Arquivos / Storage (Supabase) | 1 GB | Falha do workflow acima de 80% (800 MB) |
| Tráfego de saída (Supabase) | confirmar no painel (hoje 5 GB/mês) | Só no painel (Settings > Usage); não dá para medir pelo banco |
| Inatividade | O projeto é **pausado após 7 dias sem uso** | Consulta de manutenção semanal no mesmo workflow |
| Vercel (Hobby) | Banda, execuções e minutos de build com cota mensal; uso comercial não é permitido | Painel da Vercel > Usage |

**Plano B:** se o banco ou os arquivos passarem de 80% e a limpeza não bastar (apagar capas órfãs, comprimir capas, reduzir retenção da auditoria), a saída é o plano Pro do Supabase (backup diário, sem pausa, mais espaço). A decisão e o custo são do dono do projeto.

### O que já protege

- RLS em todas as tabelas; aluno e professor só leem os próprios empréstimos e multas.
- Validação no servidor antes de gravar; capa limitada a 2 MB; Server Actions com corpo máximo de 3 MB.
- Cabeçalhos de segurança em todas as rotas (`next.config.ts`).
- **Regra "nenhuma consulta sem limite"**: o teste `src/services/consultas-com-limite.test.ts` falha se uma leitura nova aparecer sem `.limit`, `.range`, `.single`, `.maybeSingle` ou `head: true`. Hoje existem leituras antigas sem limite (11, listadas no teste com um teto por arquivo). O teto **só pode diminuir**: conforme as consultas viram função SQL com paginação (card 0225, lista 1), reduza o número no teste.

### Limite de tentativas por IP

O que é real, por rota:

| Rota | Proteção | Onde |
| -- | -- | -- |
| Pesquisa de livros (`?q=`) | 60 por minuto por IP; passou, a resposta é 429 com aviso em português e `Retry-After` | `src/proxy.ts` + `src/lib/rate-limit.ts` (testado) |
| Inscrição na newsletter | 5 por 10 minutos por IP; passou, a tela mostra o aviso em português | `src/app/actions/newsletter.ts` |
| Login | **Não passa pelo servidor do app**: `LoginForm` chama o Supabase Auth direto do navegador (`signInWithPassword`). O limite de tentativas é do **Supabase Auth** (Authentication > Rate Limits no painel, já ativo com padrões). Limitar no app exigiria mudar o login para uma Server Action, o que mexe na tela de login e não foi feito | Painel do Supabase |

**Limite global (WAF da Vercel): ATIVO desde 09/11/2026.** O limitador do app guarda a contagem na memória e cada instância tem a sua, então ele sozinho não é global. A camada global é uma regra do Firewall da Vercel (Hobby permite até 3 regras de rate limit), criada pelo dono no painel: **"Limite de POST por IP"**: método `POST`, janela fixa de 60 segundos, **60 requisições por IP**, resposta `429` ao passar. Todo envio de formulário do sistema é um POST. O número é 60 (e não 20) porque a biblioteca e o Wi-Fi do campus saem pelo mesmo IP público.

Prova (09/11/2026, produção): 80 POSTs seguidos de um mesmo IP em menos de um minuto para uma página pública sem efeito deram 60 respostas normais e 20 respostas `429`. Se um dia a regra bloquear uso legítimo, suba o limite em Firewall > Rules; para desligar, use o botão da regra e publique.

O IP vem do `x-forwarded-for`, que na Vercel é escrito pela plataforma. Fora dela todos dividem a chave "desconhecido" (lado seguro).

### Retenção do `audit_logs`

Decisão proposta: guardar **24 meses**. A tabela é imutável para o app (sem `update` nem `delete` para ninguém logado); só o banco com a conexão de administração apaga. O workflow *Saúde do Supabase* **conta** semanalmente os registros mais velhos que 24 meses e só **apaga** quando alguém roda o workflow à mão com `apagar_auditoria = sim`. Assim nada some sem um humano decidir. Quando houver muitos registros, a evolução é particionar por mês.

## 3. Tarefas agendadas

Todas usam o segredo que **já existe** (`SUPABASE_DB_URL`, o mesmo do backup). Nenhum segredo novo. O GitHub só dispara agendamentos a partir da `main`, e pausa os agendamentos de repositório sem atividade por 60 dias.

| Workflow | Quando | O que faz | Idempotente? |
| -- | -- | -- | -- |
| `backup-banco.yml` | Todo dia 03:00 | Backup criptografado (já existia; ver `database/backup.md`) | Sim |
| `multas-atrasos.yml` | Todo dia 03:30 | `scripts/agendadas/multas-por-atraso.sql`: multa de R$ 1,00 por dia de atraso (RF-22) | Sim |
| `saude-supabase.yml` | Segunda 06:00 | Mantém o projeto ativo, mede banco e arquivos, conta auditoria antiga, lista consultas lentas e roda os advisors por SQL | Sim (só lê; apagar é manual) |
| `verificacao-do-site.yml` | A cada 6 h | Abre `/` e `/login` em produção; falha se não vier 200 | Sim |
| `alerta-falha-rotina.yml` | Quando uma das quatro rotinas acima falha | Abre ou atualiza uma issue com o link da execução | Sim (não duplica issue aberta) |

### Multa por atraso

- Dias de atraso contados no calendário de Brasília; devolver no dia do prazo não gera multa.
- Empréstimo **devolvido** com atraso: valor fechado. Empréstimo **em aberto** vencido: cresce um dia por dia.
- Multa já **paga** (baixa da bibliotecária, RF-23) nunca é alterada.
- No máximo 500 empréstimos por execução; o resto entra na próxima. Cada multa nova grava `fine_created` em `audit_logs`.
- Testado num Postgres 17 descartável com as migrations do projeto: criou, não duplicou na segunda rodada, atualizou só a multa não paga e respeitou a paga.
- A multa **nunca é calculada na leitura**. A tela deve só ler `fines`. Quando o registro de devolução (card 0132) for feito, ele também pode gravar a multa na hora; o job apenas corrige o que faltar.

### Avisos de vencimento (RF-24): ainda não feito

Não existe canal de envio (WhatsApp, e-mail) nem tabela de avisos no painel. Quando o dono definir o canal e a tabela, o aviso vira outra etapa do mesmo tipo de tarefa (consulta os empréstimos que vencem em até 2 dias ou já venceram e ainda não receberam aviso).

### Observabilidade (card 0252)

**Erros do app: decisão.** Comparei três opções no plano gratuito:

| Opção | Custo / exigência | Veredito |
| -- | -- | -- |
| Vercel Log Drains / alertas de Observability | Drains e alertas são recursos de plano pago (confirmar na página de preços da Vercel); o Hobby só guarda os Logs por pouco tempo | Fora |
| Sentry (plano Developer grátis) | Conta nova, DSN novo (segredo), pacote `@sentry/nextjs` (pesa no JavaScript do navegador, perto do teto do orçamento do CI) e risco de PII nos eventos se mal configurado | Fica como evolução se o piloto crescer |
| **Log estruturado no próprio app + rotinas do GitHub** | Zero custo, zero dependência, zero segredo | **Escolhida** |

O que foi feito:

- `src/instrumentation.ts` (`onRequestError` do Next) grava **uma linha JSON de nível `error`** por erro do servidor, aparece em **Vercel > Logs** (filtre por *Error* ou por `erro_servidor`). Campos: `digest` (o mesmo código da tela de erro), `tipo`, `rota`, `contexto`, `metodo`, `caminho`. **Sem PII**: nunca vai a mensagem do erro, a query string, cabeçalhos ou cookies (`src/lib/error-log.ts`, testado).
- **Alerta de site fora do ar:** `verificacao-do-site.yml` (a cada 6 h) abre `/` e `/login` em produção e falha se não vier 200. Falhou, o GitHub manda e-mail e a issue automática abre.
- **Alerta de rotina quebrada:** `alerta-falha-rotina.yml` abre (ou comenta numa) issue "Falha na rotina: ..." quando **backup, multas, saúde ou verificação do site** terminam com falha. Usa só o token automático do workflow.

**Passo do dono (uma vez):** em GitHub > Settings > Notifications, deixe ligado o e-mail de *Actions* ("Send notifications for failed workflows only") e o *Watch* do repositório em *All activity* (ou *Custom > Issues*) para a issue chegar por e-mail. O workflow só passa a valer depois de entrar na `main`.

**Limite honesto:** um erro de código que não derruba a página (ex.: falha numa ação que mostra mensagem) fica no Log da Vercel, mas **não dispara e-mail**. Isso só o Sentry (ou um plano pago da Vercel) entrega; hoje a conferência é olhar Vercel > Logs quando alguém reportar problema.

**Consultas lentas (`pg_stat_statements`).** O workflow semanal tenta ligar a extensão (`create extension if not exists pg_stat_statements with schema extensions`; no Supabase ela costuma vir ativa) e lista as 10 mais lentas no resumo do job. Para olhar à mão no SQL Editor (as estatísticas zeram quando o banco reinicia):

```sql
select round(mean_exec_time::numeric, 1) as media_ms, round(max_exec_time::numeric, 1) as maximo_ms, calls as chamadas,
       round(total_exec_time::numeric) as total_ms, left(regexp_replace(query, '\s+', ' ', 'g'), 160) as consulta
from extensions.pg_stat_statements
where query not ilike '%pg_stat_statements%' and calls >= 5
order by mean_exec_time desc
limit 20;
```

Para investigar uma consulta, copie o texto e rode `explain (analyze, buffers) ...` com valores de teste. **O repositório é público e o resumo do job também**: o texto vem normalizado (sem valores), mas não use isso para dado sensível.

**Advisors do Supabase, toda segunda, sem token novo.** A API oficial dos Advisors exige token de gerenciamento (segredo novo), então `scripts/agendadas/advisors.sql` reproduz as conferências que mais importam **consultando o catálogo do Postgres** com o `SUPABASE_DB_URL` que já existe: tabela sem RLS, view sem `security_invoker`, função `SECURITY DEFINER` sem `search_path` (esses três são **ERRO e derrubam o workflow**) e, como **AVISO** (só listam): RLS sem política, função liberada ao anônimo, chave estrangeira sem índice, índice grande sem uso. Rodado no banco com as 34 migrations, sem ERRO; avisos de hoje: `public_book_categories` liberada ao anônimo (de propósito), `action_keys` sem política (de propósito: só o servidor usa) e 7 chaves de "quem criou/decidiu" sem índice (tabelas pequenas, sem impacto). Fica de fora o que só o painel enxerga (configuração do Auth, como a senha mínima): continue olhando **Advisors** no painel de vez em quando. Para automatizar também isso, o passo do dono seria criar um token de acesso da conta Supabase e guardá-lo como segredo `SUPABASE_ACCESS_TOKEN`; não foi feito para não criar segredo novo.

## 4. Prova de carga

`scripts/prova-de-carga.mjs` dispara usuários simultâneos contra uma rota e mede p50, p95 e p99. Meta do card 0225: **p95 abaixo de 500 ms e zero erro com 50 usuários** com 20 mil livros.

```bash
# 1. Banco LOCAL com os 20 mil livros de teste (nunca em produção):
docker exec -i <container-do-banco> psql -U postgres -q < scripts/seed-carga.sql
# 2. App em modo de produção:
npm run build && npm start
# 3. Rota pública não precisa de login; as do aluno precisam do cookie da sessão (copie do navegador):
node scripts/prova-de-carga.mjs http://localhost:3000/ --usuarios 50 --segundos 20
PROVA_COOKIE='sb-...-auth-token=...' node scripts/prova-de-carga.mjs http://localhost:3000/aluno/livros --usuarios 50
# Limpar: delete from public.books where code like 'CARGA-%';
```

Travas: só aceita `localhost`; outro host exige `PROVA_HOSTS_PERMITIDOS` (decisão do dono); teto de 50 usuários e 60 segundos. Redirecionamento para `/login` conta como erro.

**Ainda não foi rodada nos números oficiais**: a meta depende das funções SQL de busca paginada (card 0225, lista 1). Rodar antes dá o número de partida; rodar depois prova a melhoria.

## 5. O que falta (decisões e dependências)

| Item | Quem / depende de |
| -- | -- |
| Limite global por IP | **Feito** (regra no WAF, 60 POSTs por minuto por IP). Resta conferir o limite de tentativas do Supabase Auth no painel |
| Apagar auditoria antiga | Dono rodar o workflow à mão com `apagar_auditoria = sim` (a partir de 2028 haverá o que apagar) |
| Avisos de vencimento (RF-24) | Dono definir canal e tabela de avisos |
| Prova de carga com números oficiais | Funções de busca paginada |
| `docs/architecture/system-design.md` (diagrama, estimativas, ADRs, plano de crescimento) | **Escrito em 09/11/2026**; a seção 7 dele lista o que ainda não está provado |
| Lighthouse no CI | Evolução opcional |
