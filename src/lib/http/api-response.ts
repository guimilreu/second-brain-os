import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createLogger, serializeError } from "@/lib/logger";

const log = createLogger("api");

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

function isNextInternalNavigation(error: unknown) {
  return error instanceof Error && (error.message === "NEXT_REDIRECT" || error.message === "NEXT_NOT_FOUND");
}

export function handleApiError(error: unknown) {
  if (isNextInternalNavigation(error)) {
    throw error;
  }

  if (error instanceof ZodError) {
    log.warn("Validação rejeitada", { issues: error.flatten() });
    return fail("Dados inválidos.", 422, error.flatten());
  }

  if (error instanceof Error) {
    log.error("Erro na rota API", serializeError(error));
    return fail(error.message, 500);
  }

  log.error("Erro inesperado na rota API", { message: String(error) });
  return fail("Erro inesperado.", 500);
}
