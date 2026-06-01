import { createLogger, maskMongoUri, serializeError } from "@/lib/logger";

const log = createLogger("server");

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  log.info("Second Brain OS — servidor Node iniciando", {
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "(padrão)",
  });

  const envChecks = {
    mongodbUri: Boolean(process.env.MONGODB_URI),
    authSecret: Boolean(process.env.AUTH_SECRET),
    bootstrapEmail: Boolean(process.env.BOOTSTRAP_EMAIL),
    bootstrapPassword: Boolean(process.env.BOOTSTRAP_PASSWORD),
  };

  log.info("Variáveis de ambiente", envChecks);

  if (!process.env.MONGODB_URI) {
    log.warn("MONGODB_URI ausente — rotas que usam o banco vão falhar");
    return;
  }

  log.info("URI do MongoDB (mascarada)", {
    uri: maskMongoUri(process.env.MONGODB_URI),
  });

  try {
    const { connectToDatabase, getDatabaseStatus } = await import("@/lib/db/mongodb");
    await connectToDatabase();
    log.info("Banco de dados pronto na inicialização", getDatabaseStatus());
  } catch (error) {
    log.error("Falha ao conectar ao MongoDB na inicialização", serializeError(error));
  }

  if (envChecks.bootstrapEmail && envChecks.bootstrapPassword) {
    log.info("Bootstrap de usuário configurado (criado no primeiro login se não existir)");
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const apiLog = createLogger("api");
  apiLog.error("Erro não tratado na requisição", {
    method: request.method,
    path: request.path,
    ...context,
    ...serializeError(error),
  });
}
