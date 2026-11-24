import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const ROOT = process.cwd();
export const VIDEOS = join(ROOT, "videos");
export const HOOK_BANK = join(ROOT, "hook-bank");

export const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

/** Video folders, newest first (names are date-keyword). */
export const videoDirs = (): string[] =>
  existsSync(VIDEOS)
    ? readdirSync(VIDEOS, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(VIDEOS, d.name))
        .sort()
        .reverse()
    : [];
