import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, type as t } from "../theme/tokens";
import { pop } from "./presets";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]/g, "");

/** Text revealed word by word: each word slides up out of a hidden edge (masked), key word in yellow. */
export const Words: React.FC<{
  text: string;
  highlight?: string;
  size: number;
  delay?: number;
  stagger?: number;
  visibleAtStart?: boolean; // hook rule: readable on frame 0, motion is a settle, not a reveal
  align?: "center" | "left";
  color?: string;
}> = ({ text, highlight = "", size, delay = 0, stagger = 3, visibleAtStart = false, align = "center", color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keys = new Set(highlight.split(/\s+/).map(norm).filter(Boolean));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "left" ? "flex-start" : "center", columnGap: size * 0.25, fontFamily: t.family, fontWeight: t.weight, letterSpacing: t.tracking, fontSize: size, lineHeight: 1.05, color: color ?? colors.text, textAlign: align }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => {
        const p = pop(frame, fps, delay + i * stagger, "snappy");
        const key = keys.has(norm(w));
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <span
              style={{
                display: "inline-block",
                color: key ? colors.accent : undefined,
                translate: visibleAtStart ? `0 ${interpolate(p, [0, 1], [size * 0.18, 0])}px` : `0 ${interpolate(p, [0, 1], [110, 0])}%`,
                rotate: `${interpolate(p, [0, 1], [visibleAtStart ? 0 : 6, 0])}deg`,
                scale: key ? interpolate(pop(frame, fps, delay + i * stagger + 4, "punchy"), [0, 1], [0.85, 1]) : undefined,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};
