import { ImageResponse } from "next/og";
import { brainSvg } from "@/components/layout/brainMark";

/** Ícone quadrado do app (tela inicial do celular / instalação PWA); o sistema arredonda os cantos. */
export function renderAppIcon(size: number) {
  const src = `data:image/svg+xml;base64,${Buffer.from(brainSvg(false)).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0c0e11" }}>
        <img src={src} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
