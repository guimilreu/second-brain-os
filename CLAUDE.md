# Second Brain OS

Este repositório é o Second Brain OS pessoal do GM. O produto deve ser tratado como um sistema de uso diário, não como demo.

## Objetivo Do Produto

Centralizar financeiro e trabalho pessoal em uma experiência moderna, rápida, responsiva e expansível. O app começa com dois módulos:

- Financeiro completo: bancos, saldos, entradas, saídas, recorrências, metas, cofrinhos, gráficos e previsibilidade.
- Tarefas semanais: sprint de segunda a domingo, projetos, prioridades, status e progresso.

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
- `src/features/finance/lib/forecast.ts`: cálculos financeiros puros. Mantenha testado.
- `src/features/finance/lib/data.ts`: agregação server-side do dashboard financeiro.
- `src/features/tasks/lib/data.ts`: agregação server-side da sprint semanal.
- `src/models`: schemas MongoDB.
- `src/lib/auth`: sessão, bootstrap, senha e usuário atual.

## Cuidados

- O app é pessoal e não tem cadastro público.
- Não exponha senha ou dados sensíveis no client.
- APIs devem sempre usar `requireCurrentUser()`.
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
