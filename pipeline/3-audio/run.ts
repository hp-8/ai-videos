import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScriptFile } from "../1-script/save";
import { cleanAudio, trimStart } from "./clean";
import { matchScenes } from "./match";
import { transcribeWords } from "./transcribe";

const HOOK_LEAD_MS = 30; // first word must start within this

export const processAudio = async (dir: string) => {
  const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8")) as ScriptFile;
  const { clean, whisper } = cleanAudio(dir);

  console.log("Transcribing (first run downloads whisper.cpp and the model)…");
  let words = await transcribeWords(whisper);
  rmSync(whisper);
  if (!words.length) throw new Error("No speech found in the recording.");

  // Hook delivery: no silence before the first word.
  const lead = words[0].startMs;
  if (lead > HOOK_LEAD_MS) {
    trimStart(clean, lead);
    words = words.map((w) => ({ ...w, startMs: w.startMs - lead, endMs: w.endMs - lead }));
  }

  const scenes = matchScenes(script.scenes, words);
  writeFileSync(join(dir, "audio", "words.json"), JSON.stringify(words, null, 2) + "\n");
  writeFileSync(join(dir, "audio", "scenes.json"), JSON.stringify(scenes, null, 2) + "\n");

  console.log(`\n${words.length} words, ${(words.at(-1)!.endMs / 1000).toFixed(1)}s\n`);
  for (const s of scenes) {
    const span = s.startMs < 0 ? "   —" : `${(s.startMs / 1000).toFixed(2)}–${(s.endMs / 1000).toFixed(2)}s`;
    console.log(`${s.index + 1}. ${s.type.padEnd(5)} ${span.padEnd(14)} ${Math.round(s.match * 100)}% match${s.flag ? `  ⚠ ${s.flag}` : ""}`);
  }
  const flagged = scenes.filter((s) => s.flag);
  if (flagged.length)
    console.log(`\n${flagged.length} scene(s) flagged. Re-record them (per-scene files: replace that file) and run again.`);
  console.log(`\nWrote audio/clean.wav, audio/words.json, audio/scenes.json`);
  return { words, scenes };
};
