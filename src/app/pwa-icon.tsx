import { ImageResponse } from "next/og";

/** Ícone quadrado do app (tela inicial do celular / instalação PWA). */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
          color: "#ffffff",
          fontSize: size * 0.4,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
          fontFamily: "sans-serif",
        }}
      >
        SB
      </div>
    ),
    { width: size, height: size },
  );
}
