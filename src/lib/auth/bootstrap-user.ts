import { connectToDatabase } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/auth/password";
import { createLogger } from "@/lib/logger";
import { User } from "@/models/User";

const log = createLogger("auth");

export async function ensureBootstrapUser() {
  const email = process.env.BOOTSTRAP_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;
  const name = process.env.BOOTSTRAP_NAME || "GM";

  if (!email || !password) {
    log.debug("Bootstrap ignorado — BOOTSTRAP_EMAIL ou BOOTSTRAP_PASSWORD ausentes");
    return;
  }

  await connectToDatabase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    log.debug("Usuário bootstrap já existe", { email });
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  });

  log.info("Usuário bootstrap criado", { email, name });
}
