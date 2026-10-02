# Second Brain OS

Sistema financeiro pessoal do GM, hospedável em `gm.socialsell.ai`. Usuário único: tudo é desenhado para o cenário dele, não para "qualquer pessoa".

## O cenário (a razão de cada regra)

- **Mercado Pago** é o banco principal; toda entrada cai lá. Saldo em conta rende 105% do CDI; cofrinhos rendem 120%. Ele não deixa dinheiro no saldo: usa o cofre **Saldo** (dinheiro do dia a dia, `purpose: "operating"`) e o cofre **Fatura** (`purpose: "card_reserve"`), onde guarda durante o mês o valor das compras no cartão.
- Pagar algo por PIX = tirar do cofre Saldo e pagar → no sistema é **um gasto saindo do cofre Saldo**.
- **Nubank** é o cartão de crédito: vence dia 5 e fecha **7 dias antes do vencimento**, então o dia do fechamento muda a cada mês (setembro fechou 28/09, outubro fecha 29/10) — configurável por cartão e por fatura. Pagar a fatura = **uma transferência** do cofre Fatura para o cartão, marcada com a fatura paga (o caminho intermediário MP → conta Nubank não precisa ser registrado).
- **Inter** quase não é usado.
- Compra no cartão em 30/09 cai na **fatura de outubro** (fecha 28/10) e é paga em 05/11. A fatura é chamada pelo mês em que fecha. Parcela: cada uma cai numa fatura seguida e conta como gasto daquele mês.

## Regras do domínio (`src/features/finance/domain`, puras e testadas)

- **Dinheiro em centavos inteiros**; **datas sem hora** (`YYYY-MM-DD`) e meses `YYYY-MM`. Nunca `new Date("YYYY-MM-DD")` para exibir (desloca fuso): use `dates.ts`/`labels.ts`.
- **Competência**: mês em que o lançamento conta no orçamento. Cartão → mês da fatura; resto → mês da data. Transferência nunca é gasto nem renda; pagar fatura é transferência.
- **Ciclo do cartão** (`card.ts`): o cartão guarda `dueDay` e `closingDaysBeforeDue`; fechamento = vencimento nominal − N dias. Vencimento em fim de semana ou feriado bancário (calendário da FEBRABAN, `nextBusinessDay` em `dates.ts`) passa para o próximo dia útil; o fechamento não muda (Nubank: 05/09/2026 sábado → vence 08/09, fechou 29/08). Compra no dia do fechamento ou depois vai para a fatura seguinte. Datas de uma fatura podem ser ajustadas (`cycleOverrides`); compras são reposicionadas, exceto as movidas à mão (`invoiceLocked`).
- **Histórico do cartão**: não existe "valor da fatura" digitado. O que já estava no cartão entra como compra com a data real (parcelados antigos também) ou pela importação, e cai sozinho na fatura certa. `card.settledThroughMonth` marca até qual fatura tudo já estava pago antes do app (`isSettledOutside`): as compras dela contam nos gastos do mês, mas não na dívida, no limite usado nem na reserva. Só fatura que fechou antes de o cartão entrar no app pode ser marcada; depois disso, o pagamento é registrado.
- **Saldos derivados** (`ledger.ts`): saldo inicial (`openingBalanceCents` na `openingDate`) + lançamentos a partir dessa data. Cartão não tem saldo inicial: saldo negativo = dívida (inclui parcelas futuras → limite usado; exclui faturas pagas antes do app).
- **Reserva da fatura**: o cofre ligado ao cartão (`card.reserveAccountId`) deve ter o que falta pagar das faturas fechadas + a aberta (`cardReserveNeededCents`). O sistema sugere "Guarde R$ X na Fatura".
- **Plano do mês** (`plan.ts`): Entradas (recebidas + previstas) − Fixas (pagas + previstas) − Parcelas − Guardar (metas) = **Para o dia a dia**; menos o gasto do dia a dia = **Ainda pode gastar** (e por dia, no mês atual). Entrada que cai direto em cofre de meta/reserva não conta como dinheiro do mês.
- **Fixas** (`recurring.ts`): ocorrência lançada = transação com `recurringId` + `recurringMonth` (índice único). `autoPost` (assinatura no cartão) é lançada sozinha pelo loader; as demais pedem confirmação ou podem ser puladas no mês.
- **Avisos** (`insights.ts`): fatura vencendo/atrasada, reserva faltando, fixa não confirmada, mês estourado, categoria acima do limite/ritmo/média, parcela terminando, cobrança duplicada, assinatura com preço novo, dinheiro parado rendendo menos, conferência de saldos atrasada, meta do mês atrasada.
- **Conferência de saldos**: o usuário informa o saldo real do app; a diferença vira "Rendimento" (conta que rende) ou "Ajuste de saldo". O mesmo vale para o total de uma fatura.
- **Lançamento rápido** (`quickEntry.ts`): entende "ifood 42,90 nubank", "notebook 3600 12x 10/06", "uber 23 pix ontem" (banco citado sem meio: o cofre do dia a dia dele; sem cofre, o cartão — "nubank" num gasto é o cartão); `suggestions.ts` aprende categoria/conta pelo histórico e `merchants.ts` dá o palpite inicial por estabelecimento (iFood → Alimentação, Uber → Transporte) enquanto não há histórico.
- **Importar fatura** (`importNubank.ts` + `/import`): CSV do Nubank (`date,title,amount`). "Parcela k/n" gera a parcela k na fatura escolhida e as seguintes nas próximas; estornos viram estorno; pagamentos ficam de fora; o que já está lançado vem desmarcado.

## Arquitetura

- `src/app/(app)`: `/` Hoje · `/transactions` Lançamentos · `/month` Mês · `/cards/[id]` Cartão · `/accounts` Contas e cofres · `/recurring` Fixas · `/settings` · `/setup` (configuração inicial pré-preenchida com o cenário: contas com o saldo de hoje, padrões do cartão, fixas; ao concluir, leva ao cartão para lançar o histórico) · `/import` (fatura do cartão).
- Leitura: páginas são Server Components e chamam `loadFinance()` (`server/data.ts`, cacheado por requisição; carrega tudo do usuário em memória e calcula com o domínio).
- Escrita: **server actions** em `server/actions.ts` (zod + `requireCurrentUser` + `refresh()`), chamadas no client via `useAction()`. Sem API REST, exceto `GET /api/export`.
- Lançar/editar qualquer coisa passa pelo `EntrySheet` único (`useEntryStore`), inclusive atalhos (guardar na fatura, pagar fatura, mover dinheiro).
- Models: `Account` (contas, cofrinhos, cartão com `card`, metas com `goal`), `Transaction`, `Recurring`, `Category` (seed em `server/defaults.ts`; `systemKey` = categorias do sistema), `User` (`cdiAnnualPct`, `timezone`).
- Dados do app antigo: categorias antigas são arquivadas (não apagadas) e trocadas pelas novas; lançamentos no formato antigo são ignorados (`server/indexes.ts`); os índices são alinhados ao schema uma vez por processo.
- Extras de uso diário: PWA (instalável na tela inicial, atalho "Lançar"), atalho `N` para lançar, ⌘K para buscar e lançar, botão de ocultar valores.
- UI: tokens em `src/app/globals.css` (neutro frio + ciano `#00d0ff` como primária — texto sobre ela é escuro; para texto/link na cor da marca use `text-primary-ink`; `positive`/`negative`/`warning`/`info`; `num` para valores); primitivos em `src/components/ui` (`Money` recebe **centavos**); componentes de domínio em `src/features/finance/components/<área>`.

## Stack

Next.js 16 (App Router), TypeScript strict, Tailwind v4, shadcn `base-nova` (`@base-ui/react`), Zustand (estado de UI), MongoDB/Mongoose, `bcryptjs` + `jose`, Recharts, Sonner, Lucide. Fontes Manrope e JetBrains Mono. Sem framer-motion: animações só CSS.

## Padrões

- Componentes em PascalCase; stores em kebab-case; models em PascalCase.
- Regra financeira nova → função pura em `domain/` com teste. Escrita nova → action em `server/actions.ts`.
- Resolva pela causa raiz; KISS, YAGNI, DRY.

## Variáveis de ambiente

`MONGODB_URI`, `AUTH_SECRET`, `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` (ver `env.example`). O primeiro usuário é criado no login quando `BOOTSTRAP_*` está definido.

## Comandos

`npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`

## Próximos passos naturais

- Importar extrato do Mercado Pago e OFX do Inter — depende de arquivos reais para acertar os formatos (a fatura do Nubank já importa).
- Antecipação de parcelas e estorno de compra parcelada como fluxos guiados.
- Assistente em linguagem natural sobre os próprios dados (exige integração com API de IA).
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
