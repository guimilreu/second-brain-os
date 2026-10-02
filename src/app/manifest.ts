import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Second Brain — finanças",
    short_name: "Second Brain",
    description: "Quanto ainda dá para gastar, faturas, parcelas e cofres — do jeito do GM.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e11",
    theme_color: "#00d0ff",
    lang: "pt-BR",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Lançar", url: "/?lancar=1" }],
  };
}
