# Second Brain OS

Controle financeiro pessoal do GM, hospedável em [gm.socialsell.ai](https://gm.socialsell.ai). Feito para um cenário só: Mercado Pago com cofrinhos (Saldo e Fatura), cartão Nubank com faturas e parcelas, Inter quase parado.

- **Hoje**: quanto ainda dá para gastar no mês (e por dia), avisos do que merece atenção, fatura e próximos lançamentos.
- **Lançar** em segundos, inclusive em linguagem natural ("ifood 42,90 nubank", "notebook 3600 12x"), já mostrando em qual fatura cai e o impacto no mês.
- **Cartão**: cada fatura com compras, parcelas e assinaturas; reserva no cofre Fatura; o que já está comprometido nos próximos meses.
- **Mês**: entradas − fixas − parcelas − guardar − gastos, por categoria, e os 12 meses seguintes.
- **Contas e cofres**: saldos por instituição, rendimento estimado pelo CDI e conferência com os apps.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4, Shadcn/ui (`base-nova`)
- MongoDB + Mongoose, Zustand, Recharts
- Auth pessoal: bcryptjs + JWT (`jose`) em cookie HTTP-only

## Desenvolvimento

Configure variáveis a partir de `env.example` (`MONGODB_URI`, `AUTH_SECRET`, `BOOTSTRAP_*`).

```bash
npm install
npm run dev
```

Comandos úteis: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

Documentação para agentes e convenções do repositório: [AGENTS.md](./AGENTS.md).
