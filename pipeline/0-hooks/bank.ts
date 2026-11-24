import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOOK_BANK, readJson, videoDirs } from "../paths";

export type HookFamily = {
  id: string;
  family: string;
  template: string;
  examples: string[];
  emotion: string;
  fits: string[];
  visual: string;
  status: "fresh" | "working" | "tired" | "draft";
  lastChecked: string;
};

type Bank = { niche: string; families: HookFamily[] };

/** hooks.json if present (private, full bank), else the public sample. */
export const loadBank = (): Bank => {
  const full = join(HOOK_BANK, "hooks.json");
  return readJson<Bank>(existsSync(full) ? full : join(HOOK_BANK, "hooks.sample.json"));
};

/** Families used by the last `n` reels. */
const recentFamilies = (n: number): Set<string> => {
  const ids = videoDirs()
    .map((d) => join(d, "script.json"))
    .filter(existsSync)
    .slice(0, n)
    .map((p) => readJson<{ hook: { familyId: string } }>(p).hook.familyId);
  return new Set(ids);
};

/** Candidate families: not tired, not a draft, not used in the last few reels. */
export const candidateFamilies = (recent = 3): HookFamily[] => {
  const usable = loadBank().families.filter((f) => f.status !== "tired" && f.status !== "draft");
  const skip = recentFamilies(recent);
  const fresh = usable.filter((f) => !skip.has(f.id));
  // Small bank: fall back to all usable rather than starve the picker.
  return fresh.length >= 3 ? fresh : usable;
};
