import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Mongoose já está na lista padrão do Next; bcryptjs evita bundle desnecessário no servidor.
  serverExternalPackages: ["mongoose", "bcryptjs"],

  experimental: {
    // Cache em disco entre builds — acelera `next build` após a primeira compilação.
    turbopackFileSystemCacheForBuild: true,
    // Barrel imports (ícones, datas, gráficos, BlockNote) — tree-shake mais agressivo.
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@blocknote/core",
      "@blocknote/react",
      "@blocknote/shadcn",
      "@base-ui/react",
    ],
  },

  compiler: isProd
    ? {
        removeConsole: { exclude: ["error", "warn"] },
      }
    : undefined,

  // Logs verbosos só em desenvolvimento; produção fica mais limpa e leve.
  logging: isProd
    ? false
    : {
        incomingRequests: true,
        fetches: { fullUrl: true },
      },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
