import { DonutRing } from "@/components/charts/DonutRing";
import { WeekBars } from "@/components/charts/WeekBars";
import { BrandMark } from "@/components/layout/BrandMark";
import { LoginForm } from "@/components/layout/LoginForm";

export const metadata = {
  title: "Entrar",
};

// Vitrine decorativa: valores de exemplo, não dados de ninguém.
const SAMPLE_SEGMENTS = [
  { key: "a", value: 34, color: "#00d0ff" },
  { key: "b", value: 26, color: "#9b87ff" },
  { key: "c", value: 18, color: "#ff5ca8" },
  { key: "d", value: 12, color: "#ff8a3d" },
  { key: "e", value: 10, color: "#c6f432" },
];
const SAMPLE_WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label, index) => ({
  label,
  value: [42, 96, 58, 130, 74, 0, 0][index],
  isToday: index === 4,
  isFuture: index > 4,
  title: label,
}));

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[0.9375rem] font-semibold tracking-tight">Second Brain</span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-6xl leading-[1.02] font-semibold tracking-[-0.045em]">
            Seu dinheiro,
            <br />
            <span className="bg-[linear-gradient(90deg,#00d0ff,#7ce8ff_40%,#c6f432)] bg-clip-text text-transparent">
              no ritmo certo.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Quanto ainda dá para gastar, a fatura que vem, para onde foi cada real. Tudo num olhar.
          </p>
        </div>

        <div className="relative h-56">
          <div className="tile absolute top-2 left-0 w-56 rotate-[-4deg] p-5 shadow-lg animate-rise">
            <p className="text-xs text-muted-foreground">Gastos do mês</p>
            <DonutRing segments={SAMPLE_SEGMENTS} className="mx-auto mt-3 w-28">
              <p className="display text-lg">72%</p>
            </DonutRing>
          </div>
          <div className="tile absolute top-10 left-60 w-72 rotate-[3deg] p-5 shadow-lg animate-rise [animation-delay:120ms]">
            <p className="text-xs text-muted-foreground">Essa semana</p>
            <p className="display mt-2 text-3xl">R$ 400,00</p>
            <WeekBars bars={SAMPLE_WEEK} className="mt-3 h-20" />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="glass w-full max-w-sm rounded-[2rem] p-7 shadow-lg animate-rise sm:p-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
