import { createLogger } from "@/lib/logger";

const log = createLogger("api");

export function logApiRequest(request: Request, routeLabel: string) {
  const url = new URL(request.url);
  log.info(`${request.method} ${url.pathname}`, {
    route: routeLabel,
    search: url.search || undefined,
  });
}

export function logApiResponse(routeLabel: string, status: number, startedAt: number) {
  log.info(`${routeLabel} concluída`, {
    status,
    durationMs: Date.now() - startedAt,
  });
}
