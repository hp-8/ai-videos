import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { z } from "zod";
import { candidateFamilies } from "./0-hooks/bank";
import { checkScript } from "./1-script/check";
import { brief } from "./1-script/prompt";
import { generateVoice, saveVoiceConfig, loadVoiceConfig, type VoiceOpts } from "./2-voice/run";
import { createClone, createPreset, ENGINES, listPresets, listProfiles, type Engine } from "./2-voice/voicebox";
import { processAudio } from "./3-audio/run";
import { buildTimeline } from "./4-timeline/build";
import { render, stage } from "./7-render/render";
import { transcribeWords } from "./3-audio/transcribe";
import { ScriptOut } from "./1-script/schema";
import { join } from "node:path";
import { readJson, ROOT, videoDirs, VIDEOS } from "./paths";
import { ffmpeg } from "./3-audio/ffmpeg";
import { followCta, saveScript, toScriptFile, type ScriptFile } from "./1-script/save";

const USAGE = `Usage:
  npm run reel -- brief "<one sentence>" [--no-freebie]   print the script brief
  npm run reel -- save "<one sentence>" <draft.json>     check a drafted script and create the video folder
  (or in Claude Code: /reel <one sentence>)
  npm run reel -- show <video>
  npm run reel -- hook <video> <1-3>         pick a different hook
  npm run reel -- freebie <video> yes|no     confirm or decline the freebie
  npm run reel -- audio <video>              clean recording, word timing, scene match, then timeline
  npm run reel -- preview <video>            open the reel in Remotion Studio (browser)
  npm run reel -- render <video> [--preview] stills + first 3s clip; without --preview also reel.mp4, cover, captions
  npm run reel -- timeline <video>           rebuild timeline.json and audio/narration.wav

Voice: record yourself (drop files in audio/raw/), or generate with Voicebox (app must be open):
  npm run reel -- voice <video> [--voice <name>] [--engine <e>] [--tempo 1.1] [--default] [--force]
                                             generate every scene, then run audio. --default saves the choices
  npm run reel -- voices                     list your Voicebox voices
  npm run reel -- voice-add <name> --preset kokoro:am_michael       a ready-made voice
  npm run reel -- voice-add <name> --clone <sample.wav> [--engine qwen] ["exact words in the sample"]
                                             clone your own voice from 10-30s of clean speech
  npm run reel -- presets <engine>           ready-made voices for kokoro or qwen_custom_voice

<video> is the folder name or its keyword, e.g. tokens.`;

const resolve = (arg: string): string => {
  const hit = videoDirs().find((d) => d.endsWith(arg) || d.endsWith(`-${arg}`));
  if (!hit) throw new Error(`No video folder matching "${arg}" in videos/`);
  return hit;
};

const load = (dir: string) => readJson<ScriptFile>(join(dir, "script.json"));

const show = (dir: string, s: ScriptFile) => {
  console.log(`\n${dir}\n\n${s.title}\n`);
  s.hooks.forEach((h, i) =>
    console.log(`${s.hooks[i].text === s.hook.text ? "→" : " "} ${i + 1}. [${h.familyId}] ${h.text}`),
  );
  console.log(`  picked by ${s.hook.pickedBy}${s.hook.pickedBy === "model" ? `: ${s.chosenReason}` : ""}\n`);
  s.scenes.forEach((sc, i) => console.log(`${i + 1}. ${sc.type.padEnd(5)} ${sc.narration}`));
  const words = s.scenes.reduce((n, sc) => n + sc.narration.split(/\s+/).length, 0);
  console.log(`\n${words} words, ~${Math.round(words / 2.6)}s · CTA: ${s.cta}`);
  if (s.freebieStatus !== "none")
    console.log(`Freebie (${s.freebieStatus}): ${s.freebie.type}, "${s.freebie.title}" · ${s.freebie.reason}`);
  if (s.freebieStatus === "proposed") console.log(`→ npm run reel -- freebie ${s.keyword} yes|no`);
  console.log(`\nRecord from: ${join(dir, "read-aloud.md")}\n`);
};

const main = async () => {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === "brief") {
    const idea = args.filter((a) => !a.startsWith("--")).join(" ").trim();
    if (!idea) throw new Error(USAGE);
    return console.log(brief(idea, candidateFamilies(), z.toJSONSchema(ScriptOut), args.includes("--no-freebie")));
  }

  if (cmd === "save") {
    const [idea, draft] = args;
    if (!idea || !draft) throw new Error(USAGE);
    const s = toScriptFile(idea, checkScript(JSON.parse(readFileSync(draft, "utf8"))));
    let dir = join(VIDEOS, `${s.createdAt.slice(0, 10)}-${s.keyword}`);
    for (let n = 2; existsSync(dir); n++) dir = join(VIDEOS, `${s.createdAt.slice(0, 10)}-${s.keyword}-${n}`);
    saveScript(dir, s);
    return show(dir, s);
  }

  if (cmd === "show") {
    const dir = resolve(args[0] ?? "");
    return show(dir, load(dir));
  }

  if (cmd === "hook") {
    const dir = resolve(args[0] ?? "");
    const s = load(dir);
    const h = s.hooks[Number(args[1]) - 1];
    if (!h) throw new Error(`Pick 1-${s.hooks.length}`);
    s.hook = { ...h, pickedBy: "user" };
    s.scenes[0].narration = h.text;
    saveScript(dir, s);
    return show(dir, s);
  }

  if (cmd === "freebie") {
    const dir = resolve(args[0] ?? "");
    const s = load(dir);
    if (s.freebieStatus === "none") throw new Error("No freebie was proposed for this video.");
    const yes = args[1] === "yes";
    if (!yes && args[1] !== "no") throw new Error("freebie <video> yes|no");
    s.freebieStatus = yes ? "confirmed" : "declined";
    if (!yes) {
      // Fall back to follow CTA. Earlier set-up lines may mention the freebie: review with `show`.
      s.cta = "follow";
      Object.assign(s.scenes[s.scenes.length - 1], { narration: followCta(), headline: "Follow for more", highlight: "Follow" });
    }
    saveScript(dir, s);
    return show(dir, s);
  }

  if (cmd === "audio") {
    const dir = resolve(args[0] ?? "");
    await processAudio(dir);
    buildTimeline(dir);
    return;
  }

  if (cmd === "preview") {
    const dir = existsSync(args[0] ?? "") ? args[0] : resolve(args[0] ?? "");
    stage(dir);
    console.log(`Previewing ${dir}`);
    spawnSync("npx", ["remotion", "studio"], { stdio: "inherit", shell: true });
    return;
  }

  if (cmd === "render") {
    const dir = existsSync(args[0] ?? "") ? args[0] : resolve(args[0] ?? "");
    await render(dir, args.includes("--preview"));
    return;
  }

  if (cmd === "timeline") {
    buildTimeline(resolve(args[0] ?? ""));
    return;
  }

  if (cmd === "voice") {
    const dir = resolve(args[0] ?? "");
    const flag = (k: string) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : undefined; };
    const opts: VoiceOpts = { voice: flag("--voice"), engine: engine(flag("--engine")), tempo: flag("--tempo") ? Number(flag("--tempo")) : undefined };
    if (args.includes("--default")) {
      saveVoiceConfig({ ...loadVoiceConfig(), ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) });
      console.log("Saved as your default voice.");
    }
    await generateVoice(dir, opts, args.includes("--force"));
    await processAudio(dir);
    buildTimeline(dir);
    return;
  }

  if (cmd === "voices") {
    const all = await listProfiles();
    const def = loadVoiceConfig();
    if (!all.length) return console.log("No voices yet. Add one with voice-add.");
    for (const p of all)
      console.log(`${p.name === def.voice ? "→" : " "} ${p.name.padEnd(16)} ${p.voice_type ?? ""}${p.preset_voice_id ? " " + p.preset_voice_id : ""} · ${p.default_engine ?? p.preset_engine ?? ""}`);
    if (def.voice) console.log(`
Default: ${def.voice}${def.engine ? " (" + def.engine + ")" : ""}, tempo ${def.tempo ?? 1}`);
    return;
  }

  if (cmd === "presets") {
    const e = engine(args[0] ?? "kokoro") ?? "kokoro";
    for (const v of await listPresets(e)) console.log(`${v.voice_id.padEnd(14)} ${v.name} (${v.gender}, ${v.language})`);
    return;
  }

  if (cmd === "voice-add") {
    const [name, kind, value, ...rest] = args;
    if (!name || !value) throw new Error(USAGE);
    if (kind === "--preset") {
      const [e, id] = value.split(":");
      const p = await createPreset(name, engine(e) ?? "kokoro", id);
      return console.log(`Added preset voice "${p.name}". Use it: npm run reel -- voice <video> --voice ${p.name}`);
    }
    if (kind === "--clone") {
      if (!existsSync(value)) throw new Error(`No file at ${value}`);
      const ei = rest.indexOf("--engine");
      const e = engine(ei >= 0 ? rest[ei + 1] : "qwen") ?? "qwen";
      let text = rest.filter((_, i) => i !== ei && i !== ei + 1).join(" ").trim();
      if (!text) {
        console.log("Transcribing the sample…");
        const wav16 = join(ROOT, ".whisper", "sample16k.wav");
        ffmpeg(["-i", value, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16]);
        text = (await transcribeWords(wav16)).map((w) => w.text).join(" ");
        console.log(`Heard: "${text}"`);
      }
      const p = await createClone(name, e, value, text);
      return console.log(`Cloned "${p.name}" (${e}). Use it: npm run reel -- voice <video> --voice ${p.name} --default`);
    }
    throw new Error(USAGE);
  }

  console.log(USAGE);
};

const engine = (e?: string): Engine | undefined => {
  if (e === undefined) return undefined;
  if (!(ENGINES as readonly string[]).includes(e)) throw new Error(`Unknown engine "${e}". One of: ${ENGINES.join(", ")}`);
  return e as Engine;
};

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
