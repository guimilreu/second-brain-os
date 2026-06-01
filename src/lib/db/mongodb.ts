import mongoose from "mongoose";
import { createLogger, maskMongoUri, serializeError } from "@/lib/logger";

const log = createLogger("db");

const MONGODB_URI = process.env.MONGODB_URI;

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseConnection: CachedConnection | undefined;
  var mongooseEventsRegistered: boolean | undefined;
}

const cached: CachedConnection = global.mongooseConnection ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseConnection) {
  global.mongooseConnection = cached;
}

function enableMongooseQueryLogging() {
  const enabled =
    process.env.MONGOOSE_DEBUG === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.MONGOOSE_DEBUG !== "false");

  if (!enabled || mongoose.get("debug")) {
    return;
  }

  mongoose.set("debug", (collectionName, method, ...args) => {
    log.debug(`query ${collectionName}.${method}`, {
      args: args.length > 0 ? args : undefined,
    });
  });
}

function registerMongooseEvents() {
  if (global.mongooseEventsRegistered) {
    return;
  }

  global.mongooseEventsRegistered = true;
  enableMongooseQueryLogging();

  mongoose.connection.on("connecting", () => {
    log.info("Mongoose conectando…");
  });

  mongoose.connection.on("connected", () => {
    log.info("Mongoose evento: connected", getDatabaseStatus());
  });

  mongoose.connection.on("open", () => {
    log.info("Mongoose evento: open");
  });

  mongoose.connection.on("disconnected", () => {
    log.warn("Mongoose evento: disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    log.info("Mongoose evento: reconnected", getDatabaseStatus());
  });

  mongoose.connection.on("error", (error) => {
    log.error("Mongoose evento: error", serializeError(error));
  });
}

export function getDatabaseStatus() {
  const { connection } = mongoose;

  return {
    readyState: connection.readyState,
    readyStateLabel: ["desconectado", "conectado", "conectando", "desconectando"][connection.readyState] ?? "desconhecido",
    host: connection.host || null,
    name: connection.name || null,
    port: connection.port || null,
  };
}

export async function connectToDatabase() {
  registerMongooseEvents();

  if (cached.conn) {
    log.debug("Reutilizando conexão MongoDB em cache", getDatabaseStatus());
    return cached.conn;
  }

  if (!MONGODB_URI) {
    log.error("MONGODB_URI não configurada");
    throw new Error("MONGODB_URI não configurada.");
  }

  if (!cached.promise) {
    log.info("Iniciando conexão com MongoDB", {
      uri: maskMongoUri(MONGODB_URI),
    });

    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    log.info("MongoDB conectado com sucesso", getDatabaseStatus());
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    log.error("Falha ao conectar ao MongoDB", serializeError(error));
    throw error;
  }
}
