# Second Brain OS

Este repositório é o Second Brain OS pessoal do GM. O produto deve ser tratado como um sistema de uso diário, não como demo.

## Objetivo Do Produto

Controle financeiro pessoal desenhado para o cenário específico do GM (não é produto genérico): Mercado Pago como banco principal com cofrinhos (Saldo e Fatura), cartão de crédito Nubank com faturas e parcelas, Inter quase parado. O domínio, as regras e o cenário estão em `AGENTS.md` — leia antes de mexer. Referência de experiência: app Pierre (clareza da fatura, avisos proativos, tom de conversa).

## Diretrizes Para Agentes

- Responda e documente em português quando estiver interagindo com o usuário.
- Preserve modularização por feature.
- Não crie abstrações sem necessidade real.
- Não faça mudanças cosméticas aleatórias.
- Não reverta alterações do usuário sem pedido explícito.
- Antes de mexer em um domínio, leia os arquivos da feature correspondente.

## Stack Técnica

- Next.js atual com App Router.
- TypeScript strict.
- Tailwind CSS v4.
- **Shadcn/ui** (estilo `base-nova` com `@base-ui/react`) — componentes em `src/components/ui/`. Adicionar novos: `npx shadcn@latest add <componente>`.
- Zustand para estado client-side.
- MongoDB/Mongoose para persistência.
- `bcryptjs` + `jose` para autenticação pessoal.
- `recharts` para gráficos.
- `sonner` para toasts.

## Estrutura Importante

- `src/app/layout.tsx`: providers globais e metadados.
- `src/app/(app)/layout.tsx`: proteção e shell autenticado.
- `src/app/(auth)/login/page.tsx`: login.
- `src/features/finance/domain/`: regras puras (ciclo do cartão, parcelas, competência, plano do mês, avisos). Mantenha testado.
- `src/features/finance/server/`: `loadFinance` (leitura por requisição), `actions.ts` (todas as escritas, server actions).
- `src/models`: schemas MongoDB.
- `src/lib/auth`: sessão, bootstrap, senha e usuário atual.

## Cuidados

- O app é pessoal e não tem cadastro público.
- Não exponha senha ou dados sensíveis no client.
- Server actions e rotas devem sempre usar `requireCurrentUser()` e filtrar por `userId`.
- Cálculos financeiros devem ser funções puras sempre que possível.
- Componentes client devem receber dados serializáveis.
- Se adicionar novas features, siga a separação `src/features/nome-da-feature`.

## Validação

Rode antes de concluir alterações relevantes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
@AGENTS.md
