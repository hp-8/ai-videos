import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScriptFile } from "../1-script/save";
import { ffmpeg } from "../3-audio/ffmpeg";
import type { SceneTiming } from "../3-audio/match";
import type { Word } from "../3-audio/transcribe";
import { readJson } from "../paths";
import { video } from "../../src/theme/tokens";

const PAUSE_MS = 500; // after every scene except the hook
const TAIL_MS = 80; // keep the decay of the last word so it isn't clipped
const TRANSITIONS = ["zoom", "whip", "wipe", "match"] as const;

export type TimelineScene = ScriptFile["scenes"][number] & {
  from: number; // frame the scene starts on
  durationInFrames: number;
  words: Word[]; // times relative to the scene start
  transition: (typeof TRANSITIONS)[number] | null; // into the next scene
};
export type Timeline = {
  fps: number;
  durationInFrames: number;
  audio: string;
  keyword: string;
  cta: ScriptFile["cta"];
  scenes: TimelineScene[];
};

export const buildTimeline = (dir: string): Timeline => {
  const script = readJson<ScriptFile>(join(dir, "script.json"));
  const timings = readJson<SceneTiming[]>(join(dir, "audio", "scenes.json"));
  const words = readJson<Word[]>(join(dir, "audio", "words.json"));
  const missing = timings.filter((t) => t.startMs < 0).map((t) => t.index + 1);
  if (missing.length) throw new Error(`Scene(s) ${missing.join(", ")} not in the recording. Re-record, run audio, then timeline.`);

  const { fps } = video;
  const msPerFrame = 1000 / fps;
  let from = 0;
  const cuts: { start: number; len: number; padTo: number }[] = [];

  const scenes: TimelineScene[] = timings.map((t, i) => {
    const start = i === 0 ? 0 : t.startMs; // hook starts on frame 0
    const nextStart = timings[i + 1]?.startMs ?? Infinity;
    const end = Math.min(t.endMs + TAIL_MS, nextStart);
    const durationInFrames = Math.ceil((end - start + (i === 0 ? 0 : PAUSE_MS)) / msPerFrame);
    cuts.push({ start, len: end - start, padTo: durationInFrames * msPerFrame });
    const scene: TimelineScene = {
      ...script.scenes[i],
      from,
      durationInFrames,
      words: words
        .filter((w) => w.startMs >= start && w.startMs < end)
        .map((w) => ({ ...w, startMs: w.startMs - start, endMs: Math.min(w.endMs, end) - start })),
      transition: i < timings.length - 1 ? TRANSITIONS[i % TRANSITIONS.length] : null,
    };
    from += durationInFrames;
    return scene;
  });

  // One ffmpeg pass: cut each scene, pad it with silence to its exact frame length, join.
  const s = (ms: number) => (ms / 1000).toFixed(6);
  const filter =
    cuts.map((c, i) => `[0:a]atrim=${s(c.start)}:${s(c.start + c.len)},asetpts=N/SR/TB,apad=whole_dur=${s(c.padTo)}[a${i}]`).join(";") +
    `;${cuts.map((_, i) => `[a${i}]`).join("")}concat=n=${cuts.length}:v=0:a=1[out]`;
  ffmpeg(["-i", join(dir, "audio", "clean.wav"), "-filter_complex", filter, "-map", "[out]", join(dir, "audio", "narration.wav")]);

  const timeline: Timeline = { fps, durationInFrames: from, audio: "audio/narration.wav", keyword: script.keyword, cta: script.cta, scenes };
  writeFileSync(join(dir, "timeline.json"), JSON.stringify(timeline, null, 2) + "\n");

  console.log(`\nTimeline: ${scenes.length} scenes, ${(from / fps).toFixed(1)}s (${from} frames at ${fps} fps)`);
  for (const [i, sc] of scenes.entries())
    console.log(`${i + 1}. ${sc.type.padEnd(5)} frame ${String(sc.from).padStart(4)}  ${(sc.durationInFrames / fps).toFixed(2)}s  ${sc.words.length} words${sc.transition ? `  → ${sc.transition}` : ""}`);
  console.log(`Wrote timeline.json, audio/narration.wav`);
  return timeline;
};
