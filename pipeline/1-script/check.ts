import { loadBank } from "../0-hooks/bank";
import { ScriptOut } from "./schema";

/** Parse a drafted script and enforce rules the schema can't express. Throws with every problem found. */
export const checkScript = (raw: unknown): ScriptOut => {
  const parsed = ScriptOut.safeParse(raw);
  if (!parsed.success) throw new Error(`Script doesn't match the schema:\n${parsed.error.message}`);
  const s = parsed.data;

  const familyIds = new Set(loadBank().families.map((f) => f.id));
  const errs: string[] = [];
  const hook = s.hooks[s.chosenHook];
  if (!hook) errs.push(`chosenHook ${s.chosenHook} out of range`);
  if (new Set(s.hooks.map((h) => h.familyId)).size !== s.hooks.length) errs.push("hooks repeat a family");
  for (const h of s.hooks) {
    if (!familyIds.has(h.familyId)) errs.push(`unknown family "${h.familyId}"`);
    if (h.text.split(/\s+/).length > 10) errs.push(`hook over 10 words: "${h.text}"`);
  }
  if (s.scenes.length < 5 || s.scenes.length > 7) errs.push(`${s.scenes.length} scenes (want 5-7)`);
  if (s.scenes[0]?.type !== "Hook") errs.push("first scene is not Hook");
  if (s.scenes.at(-1)?.type !== "CTA") errs.push("last scene is not CTA");
  if (hook && s.scenes[0]?.narration.trim() !== hook.text.trim()) errs.push("scene 1 narration != chosen hook");
  const words = s.scenes.reduce((n, sc) => n + sc.narration.split(/\s+/).filter(Boolean).length, 0);
  if (words < 90 || words > 130) errs.push(`${words} spoken words (want 90-130)`);
  if (!/^[a-z]+$/.test(s.keyword)) errs.push(`bad keyword "${s.keyword}"`);
  if (s.cta === "comment" && !s.freebie.propose) errs.push("comment CTA without a freebie");
  if (errs.length) throw new Error(`Script failed checks:\n- ${errs.join("\n- ")}`);
  return s;
};
