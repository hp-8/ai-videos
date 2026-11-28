import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { ScriptFile } from "../pipeline/1-script/save";
import type { SceneTiming } from "../pipeline/3-audio/match";
import { readJson, videoDirs } from "../pipeline/paths";

export type Status = "needs-voice" | "ready" | "rendered";
export type ReelSummary = { id: string; title: string; keyword: string; createdAt: string; status: Status; flagged: number; cover: boolean };
export type ReelDetail = ReelSummary & {
  script: ScriptFile;
  scenes: SceneTiming[] | null; // match scores after audio
  raw: string[]; // files in audio/raw
  stills: string[]; // previews/*.png
  generatedVoice: boolean;
  captions: Record<string, string>; // platform -> text
};

const AUDIO = /\.(wav|m4a|mp3|aac|ogg|flac|webm)$/i;

/** Folder by id. Only names that already exist under videos/ resolve, so ids can't escape it. */
export const reelDir = (id: string) => {
  const dir = videoDirs().find((d) => basename(d) === id);
  if (!dir) throw Object.assign(new Error("No reel with that name."), { status: 404 });
  return dir;
};

const ls = (dir: string, re: RegExp) => (existsSync(dir) ? readdirSync(dir).filter((f) => re.test(f)).sort() : []);

const summary = (dir: string): ReelSummary => {
  const s = readJson<ScriptFile>(join(dir, "script.json"));
  const scenesFile = join(dir, "audio", "scenes.json");
  const flagged = existsSync(scenesFile) ? readJson<SceneTiming[]>(scenesFile).filter((x) => x.flag).length : 0;
  const status: Status = existsSync(join(dir, "out", "reel.mp4")) ? "rendered" : existsSync(join(dir, "timeline.json")) ? "ready" : "needs-voice";
  return { id: basename(dir), title: s.title, keyword: s.keyword, createdAt: s.createdAt, status, flagged, cover: existsSync(join(dir, "out", "cover.png")) };
};

export const listReels = () =>
  videoDirs()
    .filter((d) => existsSync(join(d, "script.json")))
    .map(summary)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const reelDetail = (id: string): ReelDetail => {
  const dir = reelDir(id);
  const scenesFile = join(dir, "audio", "scenes.json");
  const out = join(dir, "out");
  const names: Record<string, string> = { "caption-instagram.txt": "Instagram", "caption-youtube.txt": "YouTube Shorts", "caption-x.txt": "X" };
  return {
    ...summary(dir),
    script: readJson<ScriptFile>(join(dir, "script.json")),
    scenes: existsSync(scenesFile) ? readJson<SceneTiming[]>(scenesFile) : null,
    raw: ls(join(dir, "audio", "raw"), AUDIO),
    stills: ls(join(dir, "previews"), /\.png$/i),
    generatedVoice: existsSync(join(dir, "audio", "voice.json")),
    captions: Object.fromEntries(Object.entries(names).filter(([f]) => existsSync(join(out, f))).map(([f, n]) => [n, readFileSync(join(out, f), "utf8")])),
  };
};

/**
 * Save a recording into audio/raw/. `scene` (1-based) names it 01, 02 … so per-scene takes join in order;
 * without it the upload is the whole take and replaces everything there.
 */
export const saveRecording = (id: string, data: Buffer, ext: string, scene?: number) => {
  if (!/^(webm|wav|m4a|mp3|aac|ogg|flac)$/i.test(ext)) throw Object.assign(new Error("Use a wav, mp3, m4a, ogg, flac or webm file."), { status: 400 });
  const raw = join(reelDir(id), "audio", "raw");
  mkdirSync(raw, { recursive: true });
  const existing = ls(raw, AUDIO);
  if (scene) {
    // Replace only this scene's file; drop a whole-take file so the two don't get joined.
    for (const f of existing) if (f.startsWith(String(scene).padStart(2, "0") + ".") || !/^\d{2}\./.test(f)) rmSync(join(raw, f));
    writeFileSync(join(raw, `${String(scene).padStart(2, "0")}.${ext}`), data);
  } else {
    for (const f of existing) rmSync(join(raw, f));
    writeFileSync(join(raw, `take.${ext}`), data);
  }
  // A new recording replaces any generated voice.
  rmSync(join(reelDir(id), "audio", "voice.json"), { force: true });
};
