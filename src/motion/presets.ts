import { spring, type SpringConfig } from "remotion";
import type { Word } from "../../pipeline/3-audio/transcribe";

// Named motion presets shared by every scene type (docs Stage 5).
export const presets = {
  snappy: { damping: 18, stiffness: 220, mass: 0.6 },
  smooth: { damping: 200, stiffness: 90, mass: 1 },
  punchy: { damping: 9, stiffness: 170, mass: 0.8 }, // overshoots, then settles
} satisfies Record<string, Partial<SpringConfig>>;
export type Preset = keyof typeof presets;

export const pop = (frame: number, fps: number, delay = 0, preset: Preset = "snappy") =>
  spring({ frame: frame - delay, fps, config: presets[preset] });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Frame where `phrase` (its first word) is spoken, so visuals land on the word. */
export const spokenAt = (words: Word[], phrase: string, fps: number, after = 0): number | undefined => {
  const first = norm(phrase.split(/\s+/)[0] ?? "");
  if (!first) return undefined;
  const w = words.find((x) => x.startMs / 1000 * fps >= after && (norm(x.text) === first || norm(x.text).startsWith(first)));
  return w ? Math.round((w.startMs / 1000) * fps) : undefined;
};

/** Frame each item appears: when it's spoken, else evenly staggered. Never earlier than the previous item. */
export const itemFrames = (words: Word[], items: string[], fps: number, start = 8, gap = 12): number[] => {
  const out: number[] = [];
  for (const [i, it] of items.entries()) {
    const prev = out[i - 1] ?? start - gap;
    out.push(Math.max(prev + 4, spokenAt(words, it, fps, prev + 1) ?? prev + gap));
  }
  return out;
};
