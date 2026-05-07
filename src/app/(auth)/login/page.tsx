import { LoginForm } from "@/components/layout/LoginForm";
import { LoginMotionShell } from "@/components/layout/LoginMotionShell";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="soft-grid flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <LoginMotionShell>
        <LoginForm />
      </LoginMotionShell>
    </main>
  );
}
