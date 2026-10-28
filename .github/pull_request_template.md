## O que muda

<!-- Em uma ou duas frases, para quem não viu o código. Cite o card (FAP-0000). -->

## Como testar

<!-- Passos curtos para conferir a mudança. -->

## Checklist de qualidade (regra do projeto: docs/qualidade-de-software.md)

- [ ] Código limpo: nomes claros, funções e componentes pequenos, textos fora do JSX, sem código morto
- [ ] Regra de negócio em `src/domain` com teste; telas chamam serviços
- [ ] Segurança: sem segredo no código, entrada validada no servidor, permissão conferida no servidor, RLS no banco
- [ ] Dados pessoais só o necessário; auditoria só com ids
- [ ] `npm run typecheck`, `npm run lint` e `npm test` passam
- [ ] Conferido no navegador (claro e escuro, desktop e celular, quando houver tela)
