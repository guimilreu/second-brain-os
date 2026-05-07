import { connectToDatabase } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/auth/password";
import { User } from "@/models/User";

export async function ensureBootstrapUser() {
  const email = process.env.BOOTSTRAP_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;
  const name = process.env.BOOTSTRAP_NAME || "GM";

  if (!email || !password) {
    return;
  }

  await connectToDatabase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  });
}
