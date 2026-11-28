import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline, TimelineScene } from "../pipeline/4-timeline/build";
import { Captions } from "./captions/Captions";
import { pickLayout } from "./scenes/scenes";
import { Background } from "./theme/Background";
import { getAvailableFonts } from "@remotion/google-fonts";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { applyBrand, colors, type } from "./theme/tokens";

export type ReelProps = { timeline: Timeline | null };

const IN = 10; // entrance frames
const OUT = 8; // exit frames
const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.7, 0, 0.3, 1) } as const;

// Scenes sit back to back (no overlap) so they stay locked to the narration.
// Each transition = the outgoing scene's exit + the incoming scene's entrance.
// chisle: "match" is a scale-through continuity move, not a true shared-element match cut yet.
const motion = (kind: TimelineScene["transition"], t: number, out: boolean): React.CSSProperties => {
  // t: 0→1 through the move. Exits run 0→1 forward, entrances 1→0 (arriving).
  switch (kind) {
    case "zoom":
      return out ? { scale: 1 + 1.4 * t, opacity: 1 - 0.75 * t, filter: `blur(${12 * t}px)` } : { scale: 1 - 0.3 * t, opacity: 1 - 0.6 * t }; // never fully empty
    case "whip":
      return { translate: `${(out ? -1 : 1) * 1080 * t}px 0`, filter: `blur(${30 * t}px)` };
    case "match":
      return { scale: 1 + 0.15 * t, opacity: 1 - t * 0.6 };
    default:
      return {}; // wipe: covered by the accent panel, scenes switch underneath
  }
};

const SceneShell: React.FC<{ scene: TimelineScene; index: number; enter: TimelineScene["transition"]; reel: Timeline }> = ({ scene, index, enter, reel }) => {
  const frame = useCurrentFrame();
  const C = pickLayout(scene, index, reel.keyword);
  const d = scene.durationInFrames;
  const style = {
    ...(enter ? motion(enter, interpolate(frame, [0, IN], [1, 0], ease), false) : {}),
    ...(scene.transition ? motion(scene.transition, interpolate(frame, [d - OUT, d], [0, 1], ease), true) : {}),
  };
  return (
    // Camera: slow push in for the whole scene, never fully still.
    <AbsoluteFill style={{ scale: interpolate(frame, [0, d], [1, 1.04]) }}>
      <AbsoluteFill style={style}>
        <C scene={scene} reel={reel} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Wipe: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: colors.accent, translate: `0 ${interpolate(frame, [0, 14], [100, -100], ease)}%`, rotate: "-4deg", scale: 1.3 }} />;
};

const Progress: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(frame / total) * 100}%`, background: colors.accent }} />;
};

/** Loads a non-default Google font from the brand settings before the first frame. */
const useBrandFont = (font: string | undefined) => {
  const [handle] = useState(() => (font && font !== "Inter" ? delayRender(`font ${font}`) : null));
  useEffect(() => {
    if (handle === null) return;
    const entry = getAvailableFonts().find((f) => f.fontFamily === font);
    if (!entry) return continueRender(handle); // unknown name: keep Inter
    entry
      .load()
      .then((m) => {
        const f = m.loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
        type.family = f.fontFamily;
        return f.waitUntilDone();
      })
      .catch(() => undefined) // font lacks 700/900: keep Inter
      .finally(() => continueRender(handle));
  }, [font, handle]);
};

export const Reel: React.FC<ReelProps> = ({ timeline }) => {
  const { durationInFrames } = useVideoConfig();
  applyBrand(timeline?.brand);
  useBrandFont(timeline?.brand?.font);
  if (!timeline)
    return (
      <AbsoluteFill style={{ background: colors.bg, color: colors.text, fontSize: 48, padding: 120, justifyContent: "center", fontFamily: "sans-serif" }}>
        No timeline loaded. Run: npm run reel -- preview &lt;video&gt;
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      <Background />
      {timeline.scenes.map((s, i) => (
        <Sequence key={i} name={`${i + 1}. ${s.type}`} from={s.from} durationInFrames={s.durationInFrames}>
          <SceneShell scene={s} index={i} enter={timeline.scenes[i - 1]?.transition ?? null} reel={timeline} />
          {/* Captions off during the hook so they don't compete with the hook text */}
          {s.type !== "Hook" && s.type !== "Chat" && <Captions words={s.words} />}
        </Sequence>
      ))}
      {timeline.scenes.map((s, i) =>
        s.transition === "wipe" ? (
          <Sequence key={`w${i}`} name="wipe" from={s.from + s.durationInFrames - 7} durationInFrames={14}>
            <Wipe />
          </Sequence>
        ) : null,
      )}
      <Progress total={durationInFrames} />
      <Audio src={staticFile(`current/${timeline.audio.split("/").pop()}`)} />
    </AbsoluteFill>
  );
};
