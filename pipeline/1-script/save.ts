import { mkdirSync, writeFileSync } from "node:fs";
import { loadSettings } from "../settings";
import { join } from "node:path";
import type { ScriptOut } from "./schema";

export type FreebieStatus = "none" | "proposed" | "confirmed" | "declined";

export type ScriptFile = ScriptOut & {
  idea: string;
  createdAt: string;
  hook: ScriptOut["hooks"][number] & { pickedBy: "model" | "user" };
  freebieStatus: FreebieStatus;
};

export const followCta = () => loadSettings().followCta;

export const toScriptFile = (idea: string, s: ScriptOut): ScriptFile => ({
  idea,
  createdAt: new Date().toISOString(),
  ...s,
  hook: { ...s.hooks[s.chosenHook], pickedBy: "model" },
  freebieStatus: s.freebie.propose ? "proposed" : "none",
});

export const saveScript = (dir: string, s: ScriptFile) => {
  mkdirSync(join(dir, "audio", "raw"), { recursive: true });
  writeFileSync(join(dir, "idea.txt"), s.idea + "\n");
  writeFileSync(join(dir, "script.json"), JSON.stringify(s, null, 2) + "\n");
  writeFileSync(join(dir, "read-aloud.md"), readAloud(s));
};

const readAloud = (s: ScriptFile): string => {
  const lines = s.scenes.map((sc, i) =>
    i === 0 ? `**${i + 1}. HOOK (high energy, no pause before):** ${sc.narration}` : `**${i + 1}.** ${sc.narration}`,
  );
  const tricky = s.phonetic.length
    ? ["", "## Say it like", ...s.phonetic.map((p) => `- ${p.word}: *${p.say}*`)]
    : [];
  return [
    `# ${s.title}`,
    "",
    "One take, or one file per scene named `01.wav`, `02.wav`... Drop files in `audio/raw/`.",
    "",
    ...lines.flatMap((l) => [l, ""]),
    ...tricky,
    "",
  ].join("\n");
};
