import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findFfmpeg } from "../3-audio/ffmpeg";
import { ROOT } from "../paths";

export type Check = { id: string; name: string; ok: boolean; required: boolean; detail: string; fix: string };

// Fixed command strings only; shell lets Windows find .cmd shims like claude.cmd.
const run = (cmd: string) => {
  const r = spawnSync(cmd, { encoding: "utf8", shell: true });
  return r.status === 0 ? r.stdout.trim().split("\n")[0] : null;
};

const voicebox = async () => {
  const base = process.env.VOICEBOX_URL ?? "http://127.0.0.1:17493";
  return fetch(base, { signal: AbortSignal.timeout(1500) }).then(() => true, () => false);
};

/** What's installed, in plain words, with how to fix anything missing. */
export const runChecks = async (): Promise<Check[]> => {
  let ffmpeg: string | null = null;
  try { ffmpeg = findFfmpeg(); } catch { /* missing */ }
  const claude = run("claude --version");
  const vb = await voicebox();
  const whisper = existsSync(join(ROOT, ".whisper"));
  return [
    { id: "node", name: "Node.js", ok: true, required: true, detail: process.version, fix: "" },
    {
      id: "ffmpeg", name: "FFmpeg", ok: !!ffmpeg, required: true,
      detail: ffmpeg ? "Found" : "Not found. Needed to clean up audio.",
      fix: process.platform === "win32" ? "winget install Gyan.FFmpeg" : process.platform === "darwin" ? "brew install ffmpeg" : "sudo apt install ffmpeg",
    },
    {
      id: "claude", name: "Claude Code", ok: !!claude, required: false,
      detail: claude ? claude : "Not found. Writes your scripts with your own Claude login. You can use an Anthropic API key instead.",
      fix: "npm install -g @anthropic-ai/claude-code, then run: claude",
    },
    {
      id: "voicebox", name: "Voicebox", ok: vb, required: false,
      detail: vb ? "Running" : "Not running. Only needed for generated or cloned voices. Recording yourself works without it.",
      fix: "Install Voicebox from voicebox.sh and open it.",
    },
    {
      id: "whisper", name: "Speech-to-text (whisper.cpp)", ok: true, required: true,
      detail: whisper ? "Installed" : "Downloads itself the first time you add audio (about 500 MB).", fix: "",
    },
  ];
};
