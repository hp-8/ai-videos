import type { HookFamily } from "../0-hooks/bank";

// Stable system prompt (cacheable). Rules from docs/explaination.md Stage 0-2.
export const SYSTEM = `You write scripts for vertical explainer reels (35-50s) for Harsh Patadia.

Niche: AI and tech explained to people with no technical background. Every reel explains how an AI thing works, why it behaves the way it does, or what a term really means.

Hook rules:
- Spoken in about 1.5 seconds, under 10 words.
- No jargon unless the hook promises to explain it.
- Start from what the viewer already knows (ChatGPT, autocomplete, phone camera, Netflix recommendations), then the AI idea.
- Curiosity, not fear. No hype ("this changes everything", "insane").
- Fill a family's template; never copy its example lines.

Script rules:
- 90 to 130 spoken words total across 5 to 7 scenes.
- Scene 1 is type Hook and its narration is the chosen hook, word for word.
- Pay off the hook's promise in the first body scenes, not at the end.
- The enemy is confusion or hype, never a product, company or group of people.
- One idea, one promise. A story with a turn, not a feature tour.
- Never invent statistics or numbers. Use a Stat scene only for a number you are certain is true and widely documented; otherwise use Flow or List.
- Plain spoken English, short sentences, written to be read aloud.
- Last scene is type CTA:
  - follow (default): "Follow for more AI, explained simply."
  - comment: "Comment '<KEYWORD>' and I'll send you <freebie>." Only if you propose a freebie, and set it up earlier in the script so the ask isn't sudden.

Scene types: Hook (opening line, highlight its key word), Stat (a number that counts up, with label in headline), Flow (2-4 steps top to bottom), List (2-4 numbered cards), CTA.

Freebie: propose one only when the topic naturally leads to something the viewer keeps and uses (a "how to prompt" reel gets a prompt pack; a "what is AI" reel probably doesn't). Max 2 pages. If not proposing, set type "none", cta "follow".`;

export const userPrompt = (idea: string, families: HookFamily[], forceFreebie?: boolean) =>
  [
    `Subject: ${idea}`,
    "",
    "Hook families available (pick 3 that suit the subject, write one hook each):",
    JSON.stringify(
      families.map(({ id, family, template, examples, fits }) => ({ id, family, template, examples, fits })),
      null,
      2,
    ),
    forceFreebie === false ? "\nDo not propose a freebie for this one." : "",
  ].join("\n");

/** Full brief for whoever writes the script (Claude Code, the desktop app, or you). */
export const brief = (idea: string, families: HookFamily[], schema: unknown, noFreebie: boolean) =>
  [
    SYSTEM,
    "",
    "---",
    "",
    userPrompt(idea, families, noFreebie ? false : undefined),
    "",
    "Return one JSON object matching this JSON Schema:",
    JSON.stringify(schema, null, 2),
  ].join("\n");
