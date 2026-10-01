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
          background: "linear-gradient(135deg, #3be0ff 0%, #00b4e6 100%)",
          color: "#08202b",
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
