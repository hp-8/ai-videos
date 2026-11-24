import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** ffmpeg on PATH, else the winget install location (PATH only refreshes in new shells). */
const findFfmpeg = (): string => {
  if (spawnSync("ffmpeg", ["-version"]).status === 0) return "ffmpeg";
  const pkgs = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  const pkg = existsSync(pkgs) ? readdirSync(pkgs).find((d) => d.startsWith("Gyan.FFmpeg")) : undefined;
  const build = pkg && readdirSync(join(pkgs, pkg)).find((d) => d.startsWith("ffmpeg-"));
  const exe = build && join(pkgs, pkg, build, "bin", "ffmpeg.exe");
  if (exe && existsSync(exe)) return exe;
  throw new Error("ffmpeg not found. Install it: winget install Gyan.FFmpeg");
};

let bin: string | undefined;
export const ffmpeg = (args: string[]) => {
  bin ??= findFfmpeg();
  execFileSync(bin, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
};
