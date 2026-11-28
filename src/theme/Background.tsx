import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "./tokens";

/** Dark background with depth: drifting glows, grain, vignette. Moves slower than content (parallax). */
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${30 + 12 * Math.sin(f / 90)}% ${28 + 8 * Math.cos(f / 110)}%, ${colors.accent}22, transparent 45%),
            radial-gradient(circle at ${72 + 10 * Math.cos(f / 100)}% ${70 + 10 * Math.sin(f / 120)}%, ${colors.connector}26, transparent 50%)`,
          scale: 1.1 + 0.02 * Math.sin(f / 150),
        }}
      />
      {/* Grain: SVG noise, reseeded every 2 frames so it shimmers like film */}
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(f / 2) % 50} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)" }} />
    </AbsoluteFill>
  );
};
