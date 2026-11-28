import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./paths";

// Per-user settings. settings.json is git-ignored; anything missing falls back to DEFAULTS.
export type Brand = { bg: string; accent: string; connector: string; text: string; muted: string; font: string };
export type Settings = {
  creator: string;
  niche: string;
  audience: string;
  followCta: string;
  scriptWriter: "claude-code" | "api-key";
  brand: Brand;
};

export const DEFAULTS: Settings = {
  creator: "Harsh Patadia",
  niche:
    "AI and tech explained to people with no technical background. Every reel explains how an AI thing works, why it behaves the way it does, or what a term really means.",
  audience:
    "Start from what the viewer already knows (ChatGPT, autocomplete, phone camera, Netflix recommendations), then the AI idea.",
  followCta: "Follow for more AI, explained simply.",
  scriptWriter: "claude-code",
  brand: { bg: "#0B0B0F", accent: "#FFD23F", connector: "#2EC4B6", text: "#F5F5F7", muted: "#8A8A99", font: "Inter" },
};

export const SETTINGS_FILE = join(ROOT, "settings.json");

export const hasSettings = () => existsSync(SETTINGS_FILE);

export const loadSettings = (): Settings => {
  if (!hasSettings()) return DEFAULTS;
  const saved = JSON.parse(readFileSync(SETTINGS_FILE, "utf8")) as Partial<Settings>;
  return { ...DEFAULTS, ...saved, brand: { ...DEFAULTS.brand, ...saved.brand } };
};

export const saveSettings = (s: Settings) => writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2) + "\n");
