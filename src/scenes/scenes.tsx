import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline, TimelineScene } from "../../pipeline/4-timeline/build";
import { itemFrames, pop, spokenAt } from "../motion/presets";
import { Words } from "../motion/Words";
import { colors, glass, safe, type as t } from "../theme/tokens";

type P = { scene: TimelineScene; reel: Pick<Timeline, "keyword" | "cta"> };

const Frame: React.FC<{ children: React.ReactNode; center?: boolean }> = ({ children, center }) => (
  <AbsoluteFill style={{ padding: `${safe.top}px ${safe.side}px ${safe.bottom}px`, display: "flex", flexDirection: "column", justifyContent: "center", gap: center ? 56 : 64 }}>
    {children}
  </AbsoluteFill>
);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hook: readable on frame 0, settles within 10 frames, key word gets a yellow sweep under it. */
export const Hook: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame center>
      <div style={{ scale: interpolate(pop(frame, fps, 0, "punchy"), [0, 1], [1.08, 1]) }}>
        <Words text={scene.narration} highlight={scene.highlight} size={112} stagger={1} visibleAtStart />
      </div>
      <div style={{ alignSelf: "center", height: 14, width: 260, borderRadius: 7, background: colors.accent, scale: `${interpolate(frame, [4, 16], [0, 1], clamp)} 1`, transformOrigin: "left" }} />
    </Frame>
  );
};

const parseStat = (v: string) => {
  const m = v.match(/^(\D*)([\d,.]+)(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  return { pre: m[1], n, post: m[3], commas: m[2].includes(","), decimals: (m[2].split(".")[1] ?? "").length };
};

/** Stat: number counts up as it's spoken, overshoots slightly and settles. */
export const Stat: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = spokenAt(scene.words, scene.value, fps) ?? 8;
  const s = parseStat(scene.value);
  const p = pop(frame, fps, at - 6, "punchy");
  const shown = s ? (s.n * p).toFixed(s.decimals) : scene.value;
  const text = s ? `${s.pre}${s.commas ? Number(shown).toLocaleString("en-US", { minimumFractionDigits: s.decimals }) : shown}${s.post}` : scene.value;
  return (
    <Frame center>
      <div style={{ textAlign: "center", fontFamily: t.family, fontWeight: t.weight, letterSpacing: "-0.05em", fontSize: 240, color: colors.accent, fontVariantNumeric: "tabular-nums", scale: interpolate(p, [0, 1], [0.6, 1]), opacity: interpolate(frame, [at - 6, at], [0, 1], clamp) }}>
        {text}
      </div>
      <Words text={scene.headline} highlight={scene.highlight} size={64} delay={at} />
    </Frame>
  );
};

/** Flow: steps top to bottom, teal line draws down to each next step as it's spoken. */
export const Flow: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = itemFrames(scene.words, scene.items, fps);
  return (
    <Frame>
      <Words text={scene.headline} highlight={scene.highlight} size={72} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {scene.items.map((it, i) => {
          const p = pop(frame, fps, at[i], "snappy");
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {i > 0 && <div style={{ width: 6, height: 70, borderRadius: 3, background: colors.connector, scale: `1 ${interpolate(frame, [at[i] - 8, at[i]], [0, 1], clamp)}`, transformOrigin: "top", boxShadow: `0 0 18px ${colors.connector}` }} />}
              <div style={{ ...glass, padding: "30px 56px", fontFamily: t.family, fontWeight: 700, fontSize: 54, color: colors.text, opacity: p, scale: interpolate(p, [0, 1], [0.8, 1]), translate: `0 ${interpolate(p, [0, 1], [40, 0])}px` }}>
                {it}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** List: numbered glass cards slide in from the right, one per spoken item. */
export const List: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = itemFrames(scene.words, scene.items, fps);
  return (
    <Frame>
      <Words text={scene.headline} highlight={scene.highlight} size={72} />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {scene.items.map((it, i) => {
          const p = pop(frame, fps, at[i], "snappy");
          return (
            <div key={i} style={{ ...glass, display: "flex", alignItems: "center", gap: 36, padding: "30px 40px", opacity: p, translate: `${interpolate(p, [0, 1], [260, 0])}px 0` }}>
              <div style={{ flex: "none", width: 84, height: 84, borderRadius: 42, background: colors.accent, color: colors.bg, display: "grid", placeItems: "center", fontFamily: t.family, fontWeight: t.weight, fontSize: 48, scale: interpolate(pop(frame, fps, at[i] + 3, "punchy"), [0, 1], [0, 1]) }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: t.family, fontWeight: 700, fontSize: 52, color: colors.text }}>{it}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** CTA: follow button, or the comment keyword big inside a comment bubble. */
export const CTA: React.FC<P> = ({ scene, reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 10, "punchy");
  const pulse = 1 + 0.04 * Math.max(0, Math.sin((frame - 20) / 6));
  return (
    <Frame center>
      <Words text={scene.headline || scene.narration} highlight={scene.highlight} size={80} />
      {reel.cta === "comment" ? (
        <div style={{ ...glass, alignSelf: "center", borderRadius: "48px 48px 48px 8px", padding: "36px 64px", scale: interpolate(p, [0, 1], [0.5, 1]) * pulse, opacity: p }}>
          <div style={{ fontFamily: t.family, fontWeight: 700, fontSize: 40, color: colors.muted }}>Comment</div>
          <div style={{ fontFamily: t.family, fontWeight: t.weight, fontSize: 130, letterSpacing: "-0.04em", color: colors.accent }}>{reel.keyword.toUpperCase()}</div>
        </div>
      ) : (
        <div style={{ alignSelf: "center", background: colors.accent, color: colors.bg, borderRadius: 60, padding: "30px 90px", fontFamily: t.family, fontWeight: t.weight, fontSize: 60, scale: interpolate(p, [0, 1], [0.5, 1]) * pulse, opacity: p }}>
          Follow
        </div>
      )}
    </Frame>
  );
};

export const SCENES = { Hook, Stat, Flow, List, CTA } satisfies Record<TimelineScene["type"], React.FC<P>>;
