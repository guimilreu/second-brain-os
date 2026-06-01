# Second Brain OS

Sistema operacional pessoal hospedável em [os.gmdev.pro](https://os.gmdev.pro). Centraliza o que hoje fica espalhado entre Notion, planilhas, bloco de notas e caderno — com foco em decisão diária, não em demo.

## Três pilares

1. **Dinheiro** — Ledger derivado com contas, transações, recorrências, cofrinhos, metas, cartão, importação e previsibilidade (`livre para gastar`, cenários, alertas determinísticos).
2. **Execução** — Sprint semanal de tarefas com projetos, prioridades e board por status; inbox unificada no dashboard **Hoje**.
3. **Intenção** — Lista de compras (wishlist) com caps mensais, comparada ao livre para gastar; anotações rápidas; busca global.

O dashboard **Hoje** cruza os três pilares: orçamento diário, inbox (alertas, tarefas, recorrências) e compras planejadas do mês.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4, Shadcn/ui (`base-nova`)
- MongoDB + Mongoose, Zustand, Recharts, Framer Motion, date-fns
- Auth pessoal: bcryptjs + JWT (`jose`) em cookie HTTP-only

## Desenvolvimento

Configure variáveis a partir de `env.example` (`MONGODB_URI`, `AUTH_SECRET`, `BOOTSTRAP_*`).

```bash
npm install
npm run dev
```

Comandos úteis: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

Documentação para agentes e convenções do repositório: [AGENTS.md](./AGENTS.md).
