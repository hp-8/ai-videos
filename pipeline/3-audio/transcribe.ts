import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { join } from "node:path";
import { ROOT } from "../paths";

const WHISPER_DIR = join(ROOT, ".whisper");
const VERSION = "1.5.5";
const MODEL = "small.en"; // ~470 MB; try "medium.en" if words come out wrong

export type Word = { text: string; startMs: number; endMs: number };

/** Local transcription with per-word times. First run downloads whisper.cpp and the model. */
export const transcribeWords = async (wav: string): Promise<Word[]> => {
  await installWhisperCpp({ to: WHISPER_DIR, version: VERSION, printOutput: false });
  await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR, printOutput: false });
  const out = await transcribe({
    inputPath: wav,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: VERSION,
    model: MODEL,
    tokenLevelTimestamps: true,
    splitOnWord: true,
    language: "en",
    printOutput: false,
  });
  return toCaptions({ whisperCppOutput: out })
    .captions.map((c) => ({ text: c.text.trim(), startMs: c.startMs, endMs: c.endMs }))
    .filter((w) => w.text);
};
