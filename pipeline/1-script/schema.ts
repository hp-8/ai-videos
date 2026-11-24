import { z } from "zod";

export const SceneType = z.enum(["Hook", "Stat", "Flow", "List", "CTA"]);

export const Scene = z.object({
  type: SceneType,
  narration: z.string().describe("Exact words spoken in this scene"),
  headline: z.string().describe("Short on-screen text, max ~6 words; empty if none"),
  highlight: z.string().describe("The key word or number shown in yellow; empty if none"),
  items: z.array(z.string()).describe("Flow steps or List items, max 4, each max ~4 words; empty otherwise"),
  value: z.string().describe("Stat only: the number, e.g. '100,000'; empty otherwise"),
});

export const Hook = z.object({
  familyId: z.string(),
  text: z.string().describe("Spoken in ~1.5s, under 10 words"),
});

export const ScriptOut = z.object({
  keyword: z.string().describe("One lowercase word for the topic, a-z only, e.g. 'tokens'"),
  hooks: z.array(Hook).describe("3 hook options, each from a different family"),
  chosenHook: z.number().int().describe("Index into hooks of the best option"),
  chosenReason: z.string().describe("One sentence on why"),
  title: z.string(),
  caption: z.string().describe("Post caption, no hashtags"),
  hashtags: z.array(z.string()).describe("3 to 6, without #"),
  scenes: z.array(Scene).describe("5 to 7 scenes. First is Hook (narration = chosen hook word for word), last is CTA"),
  cta: z.enum(["follow", "comment"]),
  freebie: z.object({
    propose: z.boolean(),
    reason: z.string(),
    type: z.enum(["cheat sheet", "prompt pack", "step by step guide", "checklist", "none"]),
    title: z.string(),
  }),
  phonetic: z.array(z.object({ word: z.string(), say: z.string() })).describe("Tricky words to spell out for recording; may be empty"),
});

export type ScriptOut = z.infer<typeof ScriptOut>;
