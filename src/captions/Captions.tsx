import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../../pipeline/3-audio/transcribe";
import { pop } from "../motion/presets";
import { colors, type as t } from "../theme/tokens";

const GROUP = 4; // words on screen at once
export const CAPTION_TOP = 1340; // just under the content area, above the app's bottom buttons

/** Spoken words, four at a time, the current word yellow and slightly enlarged. Times are relative to the scene. */
export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const f = (m: number) => Math.round((m / 1000) * fps);

  const groups = Array.from({ length: Math.ceil(words.length / GROUP) }, (_, i) => words.slice(i * GROUP, i * GROUP + GROUP));
  const gi = groups.filter((g) => g[0].startMs <= ms).length - 1;
  if (gi < 0) return null;
  const group = groups[gi];
  const enter = pop(frame, fps, f(group[0].startMs), "snappy");

  return (
    <AbsoluteFill style={{ top: CAPTION_TOP, height: "auto", bottom: "auto", padding: "0 90px", display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: 18, rowGap: 4 }}>
      {group.map((w, i) => {
        const active = ms >= w.startMs && ms < (group[i + 1]?.startMs ?? w.endMs + 250);
        const on = pop(frame, fps, f(w.startMs), "snappy");
        return (
          <span
            key={i}
            style={{
              fontFamily: t.family,
              fontWeight: t.weight,
              fontSize: 64,
              letterSpacing: "-0.02em",
              color: active ? colors.accent : colors.text,
              WebkitTextStroke: "10px rgba(0,0,0,0.85)",
              paintOrder: "stroke fill",
              scale: active ? interpolate(on, [0, 1], [1, 1.12]) : 1,
              translate: `0 ${interpolate(enter, [0, 1], [24, 0])}px`,
              opacity: enter,
            }}
          >
            {w.text.trim()}
          </span>
        );
      })}
    </AbsoluteFill>
  );
};
