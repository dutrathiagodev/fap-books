# Documentação

| Documento | Para quê |
| -- | -- |
| [prd.md](prd.md) | Requisitos do produto (documento base, com histórico de mudanças) |
| [onboarding.md](onboarding.md) | Preparar o notebook, onde está cada coisa e como o trabalho flui |
| [arquitetura.md](arquitetura.md) | Pastas do código, regras de dependência, como criar uma feature, Supabase e RLS, e as regras de negócio (multas, limite da reserva pedagógica, importação de planilha) |
| [architecture/system-design.md](architecture/system-design.md) | System design: componentes, dados, carga, decisões (ADRs) e plano de crescimento |
| [database/modelo-de-dados.md](database/modelo-de-dados.md) | Tabelas do banco e como testar mudanças |
| [database/lgpd.md](database/lgpd.md) | Dados pessoais e o que falta para a LGPD |
| [database/backup.md](database/backup.md) | Backup diário do banco e como restaurar |
| [infra-e-plano-gratuito.md](infra-e-plano-gratuito.md) | Cache, limites do plano gratuito, tarefas agendadas e prova de carga |
| [qualidade-de-software.md](qualidade-de-software.md) | Regras de código limpo e seguro e o checklist de todo PR |
| [qa/roteiro-producao.md](qa/roteiro-producao.md) | Roteiro de QA em produção, por perfil, e como deixar o banco de teste limpo |
| [email/README.md](email/README.md) | Convite por e-mail: definir a senha, modelo do e-mail e configuração no Supabase |

O desenho das telas, o design system (cores, fontes, cantos e ícones) e os frames de cada card ficam no Figma (links no README da raiz); os tokens em código estão em `src/app/globals.css`.
