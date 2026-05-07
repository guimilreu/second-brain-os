# Second Brain OS

Projeto pessoal hospedável em `os.gmdev.pro`. A ideia é ser um sistema operacional pessoal para centralizar o que hoje fica espalhado entre Notion, planilhas, bloco de notas e caderno.

## Stack

- Next.js App Router com TypeScript e diretório `src/`.
- Tailwind CSS v4 com tokens em `src/app/globals.css`.
- **Shadcn/ui** (estilo `base-nova`, biblioteca `@base-ui/react`) — componentes gerados em `src/components/ui/`. Adicionar novos via `npx shadcn@latest add <componente>`.
- Zustand para estado local de UI/filtros em `src/stores`.
- MongoDB com Mongoose em `src/models`.
- Auth simples com senha, `bcryptjs`, JWT via `jose` e cookie HTTP-only.
- Lucide Icons, Framer Motion, Recharts, Sonner e date-fns.

## Padrões

- Componentes React em PascalCase: `Sidebar`, `LoginForm`, `TasksBoard`.
- Stores em kebab-case: `ui-store.ts`, `tasks-store.ts`, `finance-store.ts`.
- Models em PascalCase: `User`, `Task`, `BankAccount`.
- Arquivos utilitários em camelCase ou kebab-case conforme pasta existente.
- Variáveis em camelCase. Constantes globais em `NOME_CONSTANTE`.
- Evite gambiarras. Resolva pela causa raiz, mantendo KISS, YAGNI, DRY e Clean Code.

## Arquitetura

- `src/app/(auth)`: rotas públicas como login.
- `src/app/(app)`: rotas protegidas com `AppShell`.
- `src/app/api`: APIs internas por domínio.
- `src/features/finance`: componentes, schemas, data loaders e forecast financeiro.
- `src/features/tasks`: componentes, schemas e data loaders de tarefas.
- `src/lib/auth`: sessão, senha, bootstrap e usuário atual.
- `src/lib/db`: conexão MongoDB cacheada.
- `src/components/layout`: shell, sidebar, tema e login.
- `src/components/ui`: componentes pequenos reutilizáveis.

## Domínios Implementados

Financeiro:
- Contas/bancos, transações, recorrências, cofrinhos e metas.
- Previsão mensal com entradas, saídas, valor livre para gastar e alocação para cofrinhos.
- Gráficos de fluxo previsto e gastos por categoria.

Tarefas:
- Projetos, sprint semanal e tarefas.
- Sprint atual criada automaticamente quando não existe.
- Board por status e visão de distribuição por projeto.

## Variáveis De Ambiente

Use `env.example` como referência:

- `MONGODB_URI`
- `AUTH_SECRET`
- `BOOTSTRAP_NAME`
- `BOOTSTRAP_EMAIL`
- `BOOTSTRAP_PASSWORD`

O primeiro usuário é criado automaticamente no login quando `BOOTSTRAP_EMAIL` e `BOOTSTRAP_PASSWORD` estão configurados.

## Comandos

- `npm run dev`: desenvolvimento.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript.
- `npm run test`: testes unitários.
- `npm run build`: build de produção.

## Próximos Passos Naturais

- Formulários completos para criar/editar entidades no próprio app.
- Importação CSV/OFX para financeiro.
- Calendário, notas, hábitos, health tracking e CRM pessoal.
- Regras de alocação mais avançadas para cofrinhos.
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
