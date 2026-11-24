import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScriptFile } from "../1-script/save";
import { ffmpeg } from "../3-audio/ffmpeg";
import { ROOT } from "../paths";
import { findProfile, generate, type Engine } from "./voicebox";

// Your default generated voice, saved with --default. Local only.
const CONFIG = join(ROOT, "voice.config.json");

export type VoiceOpts = { voice?: string; engine?: Engine; tempo?: number };

export const loadVoiceConfig = (): VoiceOpts => (existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, "utf8")) : {});
export const saveVoiceConfig = (o: VoiceOpts) => writeFileSync(CONFIG, JSON.stringify(o, null, 2) + "\n");

/** Generate one file per scene into audio/raw/, at the chosen tempo. */
export const generateVoice = async (dir: string, opts: VoiceOpts, force: boolean) => {
  const o = { tempo: 1, ...loadVoiceConfig(), ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) };
  if (!o.voice) throw new Error("No voice chosen. Pass --voice <name> (see: npm run reel -- voices), or save one with --default.");
  if (o.tempo < 0.5 || o.tempo > 2) throw new Error("--tempo must be between 0.5 and 2.0");

  const raw = join(dir, "audio", "raw");
  mkdirSync(raw, { recursive: true });
  if (readdirSync(raw).length && !force)
    throw new Error(`${raw} already has files (your recording?). Add --force to replace them with generated audio.`);
  for (const f of readdirSync(raw)) rmSync(join(raw, f));

  const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8")) as ScriptFile;
  const profile = await findProfile(o.voice);
  console.log(`Generating ${script.scenes.length} scenes with "${profile.name}"${o.engine ? ` (${o.engine})` : ""}, tempo ${o.tempo}…`);

  for (const [i, sc] of script.scenes.entries()) {
    const name = `${String(i + 1).padStart(2, "0")}.wav`;
    const wav = await generate(profile, sc.narration, o.engine);
    const out = join(raw, name);
    if (o.tempo === 1) writeFileSync(out, wav);
    else {
      const tmp = join(raw, `_${name}`);
      writeFileSync(tmp, wav);
      ffmpeg(["-i", tmp, "-filter:a", `atempo=${o.tempo}`, out]);
      rmSync(tmp);
    }
    console.log(`  ${name}  ${sc.narration.slice(0, 60)}${sc.narration.length > 60 ? "…" : ""}`);
  }

  // Kept with the video so you know which reels used a generated voice (platforms ask you to disclose it).
  writeFileSync(
    join(dir, "audio", "voice.json"),
    JSON.stringify({ source: "voicebox", voice: profile.name, voiceType: profile.voice_type, engine: o.engine ?? profile.default_engine, tempo: o.tempo, at: new Date().toISOString() }, null, 2) + "\n",
  );
};
