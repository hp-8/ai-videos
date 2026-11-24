import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ffmpeg } from "./ffmpeg";

const AUDIO = /\.(wav|m4a|mp3|aac|ogg|flac|webm)$/i;

// Cleanup chain, in order. Tune strength here.
const FILTERS = [
  "highpass=f=80", // rumble, desk bumps
  "afftdn=nf=-25", // background noise
  // Trim silence at the start, and cap every pause longer than 0.4s down to 0.25s.
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0:stop_periods=-1:stop_duration=0.4:stop_threshold=-45dB:stop_silence=0.25",
  "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", // trim the tail
  "loudnorm=I=-14:TP=-1:LRA=11", // social platform loudness
].join(",");

/** Raw files in name order (one take, or 01.wav, 02.wav ... per scene), joined and cleaned. */
export const cleanAudio = (dir: string): { clean: string; whisper: string } => {
  const rawDir = join(dir, "audio", "raw");
  const files = readdirSync(rawDir).filter((f) => AUDIO.test(f)).sort();
  if (!files.length) throw new Error(`No recordings in ${rawDir}. Record from read-aloud.md and drop the files there.`);

  const list = join(dir, "audio", "inputs.txt");
  writeFileSync(list, files.map((f) => `file '${join(rawDir, f).replaceAll("\\", "/")}'`).join("\n"));

  const clean = join(dir, "audio", "clean.wav");
  const whisper = join(dir, "audio", "whisper.wav");
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-af", FILTERS, "-ar", "48000", "-ac", "1", clean]);
  ffmpeg(["-i", clean, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", whisper]); // whisper.cpp wants 16 kHz
  console.log(`Cleaned ${files.length} file(s): ${files.join(", ")}`);
  return { clean, whisper };
};

/** Cut the start so the first word lands on frame 0. */
export const trimStart = (path: string, ms: number) => {
  const tmp = path.replace(/\.wav$/, ".tmp.wav");
  ffmpeg(["-ss", (ms / 1000).toFixed(3), "-i", path, tmp]);
  ffmpeg(["-i", tmp, path]);
};
