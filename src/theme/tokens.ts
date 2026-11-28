import { loadFont } from "@remotion/google-fonts/Inter";

// Single source for look: colors, type, layout. See docs Stage 5.
export const colors = {
  bg: "#0B0B0F",
  accent: "#FFD23F", // key word / number
  connector: "#2EC4B6", // teal lines
  text: "#F5F5F7",
  muted: "#8A8A99",
};

const { fontFamily } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });

export const type = {
  family: fontFamily,
  weight: 900,
  tracking: "-0.03em",
};

export const video = { width: 1080, height: 1920, fps: 30 };

// Content stays inside this box: clear of the app's top bar, side buttons and the caption band.
export const safe = { top: 260, bottom: 620, side: 90 };

export const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(24px)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
  borderRadius: 36,
};
