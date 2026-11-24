import type { Word } from "./transcribe";

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "").replace(/'/g, "");

export type SceneTiming = {
  index: number;
  type: string;
  startMs: number;
  endMs: number;
  match: number; // share of script words found in the recording
  flag?: string;
};

const MIN_MATCH = 0.6;

/**
 * Align script words to spoken words (longest common subsequence), then give each scene
 * the span from its first to last matched spoken word. Scenes that match poorly are flagged.
 */
export const matchScenes = (scenes: { type: string; narration: string }[], spoken: Word[]): SceneTiming[] => {
  const script = scenes.flatMap((s, i) => s.narration.split(/\s+/).map(norm).filter(Boolean).map((w) => ({ w, scene: i })));
  const said = spoken.map((w) => norm(w.text));
  const n = script.length;
  const m = said.length;

  // LCS table, then walk back to collect matched pairs.
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = script[i].w === said[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const hits: number[][] = scenes.map(() => []); // spoken indices per scene
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (script[i].w === said[j]) {
      hits[script[i].scene].push(j);
      i++;
      j++;
    }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const timings: SceneTiming[] = scenes.map((s, i) => {
    const total = script.filter((x) => x.scene === i).length;
    const h = hits[i];
    const match = total ? h.length / total : 0;
    return {
      index: i,
      type: s.type,
      startMs: h.length ? spoken[h[0]].startMs : -1,
      endMs: h.length ? spoken[h[h.length - 1]].endMs : -1,
      match: Math.round(match * 100) / 100,
      flag: !h.length ? "not found in recording" : match < MIN_MATCH ? "said very differently from the script" : undefined,
    };
  });

  // Spoken words between scenes (ad-libs, unmatched words) belong to the scene before them.
  for (let i = 0; i < timings.length - 1; i++) {
    const next = timings.slice(i + 1).find((t) => t.startMs >= 0);
    if (timings[i].endMs >= 0 && next) {
      const lastBefore = spoken.filter((w) => w.endMs <= next.startMs).at(-1);
      if (lastBefore) timings[i].endMs = Math.max(timings[i].endMs, lastBefore.endMs);
    }
  }
  const last = timings.at(-1);
  if (last && last.endMs >= 0) last.endMs = Math.max(last.endMs, spoken.at(-1)?.endMs ?? 0);
  return timings;
};
