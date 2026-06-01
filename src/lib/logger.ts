type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LOG_LEVEL_RANK) {
    return raw as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const minLevel = resolveMinLevel();

function shouldLog(level: LogLevel) {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[minLevel];
}

function formatLine(scope: string, level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const metaSuffix =
    meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}${metaSuffix}`;
}

function write(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }

  const line = formatLine(scope, level, message, meta);

  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => write("debug", scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => write("info", scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => write("warn", scope, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => write("error", scope, message, meta),
  };
}

export function maskMongoUri(uri: string) {
  return uri.replace(/\/\/([^@/]+)@/, "//***@");
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack ? { stack: error.stack } : {}),
    };
  }

  return { message: String(error) };
}
