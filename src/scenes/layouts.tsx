import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline, TimelineScene } from "../../pipeline/4-timeline/build";
import { itemFrames, pop, spokenAt } from "../motion/presets";
import { Words } from "../motion/Words";
import { colors, glass, safe, type as t } from "../theme/tokens";

// Extra layouts for the existing scene types, plus four new types (Chat, Myth, Term, Word).
// Same world as scenes.tsx: dark ground, glass cards, yellow for the key thing, teal for links.

type P = { scene: TimelineScene; reel: Pick<Timeline, "keyword" | "cta"> };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const font = (size: number, weight = 700): React.CSSProperties => ({ fontFamily: t.family, fontWeight: weight, fontSize: size, color: colors.text, lineHeight: 1.08 });

const Pad: React.FC<{ children: React.ReactNode; justify?: React.CSSProperties["justifyContent"]; gap?: number }> = ({ children, justify = "center", gap = 56 }) => (
  <AbsoluteFill style={{ padding: `${safe.top}px ${safe.side}px ${safe.bottom}px`, display: "flex", flexDirection: "column", justifyContent: justify, gap }}>{children}</AbsoluteFill>
);

/* ---------------- Hook variants ---------------- */

/** Poster: lead line small and left, the key word set huge in yellow, bleeding off the right edge. */
export const HookPoster: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const key = scene.highlight || scene.narration.split(/\s+/).at(-1) || "";
  // Split the line around the key word: lead above it, the rest below.
  const bare = key.replace(/[^\w']/g, "");
  const idx = scene.narration.toLowerCase().indexOf(bare.toLowerCase());
  const lead = idx >= 0 ? scene.narration.slice(0, idx).trim() : scene.narration;
  const tail = idx >= 0 ? scene.narration.slice(idx + bare.length).replace(/^[?.!,]+/, "").trim() : "";
  const p = pop(frame, fps, 0, "punchy");
  return (
    <Pad justify="center" gap={28}>
      <Words text={lead} size={78} align="left" stagger={1} visibleAtStart />
      <div style={{ ...font(330, t.weight), color: colors.accent, letterSpacing: "-0.06em", lineHeight: 0.86, whiteSpace: "nowrap", marginRight: -safe.side - 200,
        translate: `${interpolate(p, [0, 1], [120, 0])}px 0`, opacity: interpolate(frame, [0, 3], [0.6, 1], clamp) }}>
        {key.replace(/[?.!,]+$/, "")}
      </div>
      <div style={{ height: 10, width: interpolate(frame, [6, 20], [0, 380], clamp), borderRadius: 5, background: colors.connector, boxShadow: `0 0 24px ${colors.connector}` }} />
      {tail && <Words text={tail} size={78} align="left" delay={6} stagger={1} />}
    </Pad>
  );
};

/** Question card: the hook sits in a glass card with a big yellow question mark behind it. */
export const HookCard: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 0, "punchy");
  return (
    <Pad>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", right: -20, top: -430, ...font(520, t.weight), color: colors.accent, opacity: 0.22, rotate: `${interpolate(p, [0, 1], [-14, 6])}deg` }}>?</div>
        <div style={{ ...glass, padding: "64px 56px", scale: interpolate(p, [0, 1], [1.06, 1]) }}>
          <Words text={scene.narration} highlight={scene.highlight} size={92} align="left" stagger={1} visibleAtStart />
        </div>
      </div>
    </Pad>
  );
};

/* ---------------- Stat variants ---------------- */

const parse = (v: string) => {
  const m = v.match(/^(\D*)([\d,.]+)(.*)$/);
  return m ? { pre: m[1], n: Number(m[2].replace(/,/g, "")), post: m[3], dec: (m[2].split(".")[1] ?? "").length, commas: m[2].includes(",") } : null;
};
const fmt = (s: NonNullable<ReturnType<typeof parse>>, k: number) => {
  const v = (s.n * k).toFixed(s.dec);
  return `${s.pre}${s.commas ? Number(v).toLocaleString("en-US", { minimumFractionDigits: s.dec }) : v}${s.post}`;
};

/** Bar: number counts up while a bar fills; percentages fill to their value, others fill fully. */
export const StatBar: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = spokenAt(scene.words, scene.value, fps) ?? 8;
  const s = parse(scene.value);
  const k = pop(frame, fps, at - 6, "smooth");
  const fill = s && scene.value.includes("%") ? Math.min(s.n, 100) / 100 : 1;
  return (
    <Pad gap={40}>
      <Words text={scene.headline} highlight={scene.highlight} size={64} align="left" delay={at - 4} />
      <div style={{ ...font(250, t.weight), color: colors.accent, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>{s ? fmt(s, k) : scene.value}</div>
      <div style={{ height: 36, borderRadius: 18, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${fill * k * 100}%`, borderRadius: 18, background: `linear-gradient(90deg, ${colors.connector}, ${colors.accent})`, boxShadow: `0 0 30px ${colors.accent}66` }} />
      </div>
    </Pad>
  );
};

/** Compare: two "label: number" items side by side as bars that grow to their relative size. */
export const StatCompare: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = scene.items.slice(0, 2).map((it) => {
    const [label, val = ""] = it.split(/:\s*/);
    return { label, val, s: parse(val.trim()) };
  });
  const max = Math.max(...rows.map((r) => r.s?.n ?? 0), 1);
  const at = itemFrames(scene.words, rows.map((r) => r.label), fps);
  return (
    <Pad gap={60}>
      <Words text={scene.headline} highlight={scene.highlight} size={68} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 70, height: 720 }}>
        {rows.map((r, i) => {
          const k = pop(frame, fps, at[i], "smooth");
          const h = ((r.s?.n ?? 0) / max) * 560 * k;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: 300 }}>
              <div style={{ ...font(96, t.weight), color: i ? colors.accent : colors.text, fontVariantNumeric: "tabular-nums", opacity: k }}>{r.s ? fmt(r.s, k) : r.val}</div>
              <div style={{ width: 220, height: h, borderRadius: "24px 24px 8px 8px", background: i ? colors.accent : "rgba(255,255,255,0.16)", boxShadow: i ? `0 0 50px ${colors.accent}55` : "none" }} />
              <div style={{ ...font(44), color: colors.muted, textAlign: "center" }}>{r.label}</div>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/* ---------------- Flow variants ---------------- */

/** Pipeline: steps as nodes on one line, a glowing dot travels through each as it's spoken. */
export const FlowPipeline: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items.slice(0, 4);
  const at = itemFrames(scene.words, items, fps);
  const n = items.length;
  // Dot position: 0..n-1, eased between the frames each step is spoken.
  const pos = interpolate(frame, at.length > 1 ? at : [at[0], at[0] + 1], at.length > 1 ? at.map((_, i) => i) : [0, 0], clamp);
  return (
    <Pad gap={90}>
      <Words text={scene.headline} highlight={scene.highlight} size={72} />
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        <div style={{ position: "absolute", left: `${50 / n}%`, right: `${50 / n}%`, top: 58, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", left: `${50 / n}%`, width: `${(pos / Math.max(n - 1, 1)) * (100 - 100 / n)}%`, top: 58, height: 6, borderRadius: 3, background: colors.connector, boxShadow: `0 0 20px ${colors.connector}` }} />
        <div style={{ position: "absolute", top: 40, left: `calc(${(100 / n) * (pos + 0.5)}% - 21px)`, width: 42, height: 42, borderRadius: 21, background: colors.accent, boxShadow: `0 0 40px ${colors.accent}` }} />
        {items.map((it, i) => {
          const p = pop(frame, fps, at[i], "snappy");
          const lit = frame >= at[i];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, opacity: interpolate(p, [0, 1], [0.35, 1]) }}>
              <div style={{ width: 120, height: 120, borderRadius: 60, ...glass, display: "grid", placeItems: "center", ...font(52, t.weight), color: lit ? colors.accent : colors.muted, scale: interpolate(p, [0, 1], [0.8, 1]) }}>{i + 1}</div>
              <div style={{ ...font(n > 3 ? 38 : 44), textAlign: "center", padding: "0 8px" }}>{it}</div>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/** Cycle: steps placed on a ring; a teal arc sweeps round as each one is spoken. */
export const FlowCycle: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items.slice(0, 4);
  const at = itemFrames(scene.words, items, fps);
  const R = 300;
  const sweep = interpolate(frame, [at[0], (at.at(-1) ?? at[0]) + 20], [0, 1], clamp);
  const C = 2 * Math.PI * R;
  return (
    <Pad gap={40}>
      <Words text={scene.headline} highlight={scene.highlight} size={68} />
      <div style={{ position: "relative", width: 2 * R + 260, height: 2 * R + 200, alignSelf: "center" }}>
        <svg width="100%" height="100%" viewBox={`${-R - 130} ${-R - 100} ${2 * R + 260} ${2 * R + 200}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          <circle r={R} fill="none" stroke={colors.connector} strokeWidth={10} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - sweep)} transform="rotate(-90)" style={{ filter: `drop-shadow(0 0 14px ${colors.connector})` }} />
        </svg>
        {items.map((it, i) => {
          const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          const p = pop(frame, fps, at[i], "punchy");
          return (
            <div key={i} style={{ position: "absolute", left: `calc(50% + ${Math.cos(a) * R}px)`, top: `calc(50% + ${Math.sin(a) * R}px)`, translate: "-50% -50%",
              ...glass, padding: "22px 30px", ...font(42), textAlign: "center", maxWidth: 340, opacity: p, scale: interpolate(p, [0, 1], [0.6, 1]) }}>{it}</div>
          );
        })}
      </div>
    </Pad>
  );
};

/* ---------------- List variants ---------------- */

/** Grid: up to four tiles in a 2x2, each flips up as it's spoken. */
export const ListGrid: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items.slice(0, 4);
  const at = itemFrames(scene.words, items, fps);
  return (
    <Pad gap={48}>
      <Words text={scene.headline} highlight={scene.highlight} size={72} align="left" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {items.map((it, i) => {
          const p = pop(frame, fps, at[i], "snappy");
          return (
            <div key={i} style={{ ...glass, aspectRatio: items.length === 3 && i === 2 ? "auto" : "1", gridColumn: items.length === 3 && i === 2 ? "1 / -1" : undefined, minHeight: 240, padding: 34, display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: p,
              transform: `perspective(1200px) rotateX(${interpolate(p, [0, 1], [70, 0])}deg)`, transformOrigin: "bottom" }}>
              <div style={{ ...font(64, t.weight), color: colors.accent }}>0{i + 1}</div>
              <div style={font(48)}>{it}</div>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/** Checklist: rows start dim; each gets a drawn tick and lights up when it's spoken. */
export const ListCheck: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.items.slice(0, 4);
  const at = itemFrames(scene.words, items, fps);
  return (
    <Pad gap={50}>
      <Words text={scene.headline} highlight={scene.highlight} size={72} align="left" />
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {items.map((it, i) => {
          const tick = interpolate(frame, [at[i], at[i] + 10], [0, 1], clamp);
          const on = pop(frame, fps, at[i], "snappy");
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 34, opacity: interpolate(on, [0, 1], [0.32, 1]) }}>
              <svg width={88} height={88} viewBox="0 0 88 88" style={{ flex: "none" }}>
                <rect x={4} y={4} width={80} height={80} rx={22} fill={tick > 0 ? colors.accent : "none"} stroke={tick > 0 ? colors.accent : "rgba(255,255,255,0.25)"} strokeWidth={5} />
                <path d="M24 46 L38 60 L64 30" fill="none" stroke={colors.bg} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
              </svg>
              <div style={{ ...font(56), translate: `${interpolate(on, [0, 1], [20, 0])}px 0` }}>{it}</div>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/* ---------------- New scene types ---------------- */

/** Chat: items[0] is the person's message, items[1] the AI's reply, typed out as it's spoken. Unbranded. */
export const Chat: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [ask = scene.headline, reply = ""] = scene.items;
  const qIn = pop(frame, fps, 2, "snappy");
  const start = spokenAt(scene.words, reply, fps, 6) ?? 18;
  const end = Math.max(start + 10, scene.durationInFrames - 20);
  const chars = Math.round(interpolate(frame, [start, end], [0, reply.length], clamp));
  const thinking = frame > 8 && frame < start;
  return (
    <Pad gap={40}>
      <div style={{ alignSelf: "flex-end", maxWidth: "82%", padding: "30px 38px", borderRadius: "40px 40px 10px 40px", background: colors.text, ...font(50), color: colors.bg,
        opacity: qIn, translate: `0 ${interpolate(qIn, [0, 1], [40, 0])}px` }}>{ask}</div>
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
        <div style={{ flex: "none", width: 76, height: 76, borderRadius: 38, background: `conic-gradient(from 200deg, ${colors.connector}, ${colors.accent}, ${colors.connector})`, boxShadow: `0 0 30px ${colors.connector}88` }} />
        <div style={{ ...glass, borderRadius: "10px 40px 40px 40px", padding: "30px 38px", ...font(50, 600), minHeight: 120, maxWidth: "84%" }}>
          {thinking ? (
            <span style={{ display: "inline-flex", gap: 12 }}>{[0, 1, 2].map((d) => <span key={d} style={{ width: 16, height: 16, borderRadius: 8, background: colors.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame - d * 4) / 5)) }} />)}</span>
          ) : (
            <>{reply.slice(0, chars)}<span style={{ opacity: chars < reply.length && frame % 16 < 8 ? 1 : 0, color: colors.accent }}>▍</span></>
          )}
        </div>
      </div>
    </Pad>
  );
};

/** Myth vs fact: items[0] (the belief) gets struck through and dims, then items[1] (the truth) lands. */
export const Myth: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [myth = "", fact = ""] = scene.items;
  const factAt = spokenAt(scene.words, fact, fps, 10) ?? Math.round(scene.durationInFrames * 0.45);
  const strike = interpolate(frame, [factAt - 14, factAt - 2], [0, 1], clamp);
  const f = pop(frame, fps, factAt, "punchy");
  const label = (txt: string, c: string): React.CSSProperties => ({ ...font(34, t.weight), color: c, letterSpacing: "0.12em" });
  return (
    <Pad gap={70}>
      <div style={{ opacity: interpolate(strike, [0, 1], [1, 0.45]) }}>
        <div style={label("MYTH", colors.muted)}>MYTH</div>
        <div style={{ marginTop: 18, ...font(72, t.weight), letterSpacing: "-0.03em" }}>
          {/* Strike drawn per wrapped line (background on an inline span), growing left to right. */}
          <span style={{ background: "linear-gradient(#ff5a5f, #ff5a5f) no-repeat", backgroundPosition: "0 58%", backgroundSize: `${strike * 100}% 10px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{myth}</span>
        </div>
      </div>
      <div style={{ opacity: f, translate: `0 ${interpolate(f, [0, 1], [60, 0])}px` }}>
        <div style={label("FACT", colors.accent)}>FACT</div>
        <div style={{ ...glass, marginTop: 18, padding: "40px 44px", borderColor: `${colors.accent}66`, boxShadow: `0 0 60px ${colors.accent}22`, ...font(68, t.weight), letterSpacing: "-0.02em" }}>
          {fact}
        </div>
      </div>
    </Pad>
  );
};

/** Term card: headline is the term, items[0] its plain meaning, items[1] an optional example. */
export const Term: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [meaning = "", example = ""] = scene.items;
  const at = itemFrames(scene.words, [meaning, example].filter(Boolean), fps, 14);
  const card = pop(frame, fps, 0, "punchy");
  return (
    <Pad>
      <div style={{ ...glass, padding: "60px 56px", display: "flex", flexDirection: "column", gap: 34, scale: interpolate(card, [0, 1], [0.9, 1]), opacity: card }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
          <div style={{ ...font(120, t.weight), color: colors.accent, letterSpacing: "-0.04em" }}>{scene.headline || scene.highlight}</div>
          <div style={{ ...font(38, 600), color: colors.muted, fontStyle: "italic" }}>noun</div>
        </div>
        <div style={{ height: 4, background: colors.connector, borderRadius: 2, width: interpolate(frame, [6, 20], [0, 100], clamp) + "%", boxShadow: `0 0 16px ${colors.connector}` }} />
        <div style={{ ...font(58), opacity: pop(frame, fps, at[0], "snappy") }}>{meaning}</div>
        {example && (
          <div style={{ ...font(44, 600), color: colors.muted, opacity: pop(frame, fps, at[1] ?? at[0] + 20, "snappy") }}>
            <span style={{ color: colors.connector }}>e.g. </span>{example}
          </div>
        )}
      </div>
    </Pad>
  );
};

/** Big word: one word fills the frame, scales through and crops off both edges. */
export const Word: React.FC<P> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = (scene.highlight || scene.headline || scene.narration.split(/\s+/)[0]).replace(/[?.!,]+$/, "");
  const p = pop(frame, fps, 0, "punchy");
  const drift = interpolate(frame, [0, scene.durationInFrames], [0, -60]);
  const size = Math.min(520, 1900 / Math.max(word.length, 3));
  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", overflow: "hidden" }}>
      <div style={{ ...font(size, t.weight), color: colors.accent, letterSpacing: "-0.06em", whiteSpace: "nowrap", rotate: "-6deg",
        scale: interpolate(p, [0, 1], [1.6, 1]), translate: `${drift}px 0`, textShadow: `0 0 80px ${colors.accent}55` }}>{word}</div>
      {scene.headline && scene.highlight && (
        <div style={{ position: "absolute", bottom: safe.bottom + 40, left: safe.side, right: safe.side }}>
          <Words text={scene.headline} size={58} delay={10} color={colors.muted} />
        </div>
      )}
    </AbsoluteFill>
  );
};
