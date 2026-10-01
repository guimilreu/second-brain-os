import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Second Brain — finanças",
    short_name: "Second Brain",
    description: "Quanto ainda dá para gastar, faturas, parcelas e cofres — do jeito do GM.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fc",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Lançar", url: "/?lancar=1" }],
  };
}
