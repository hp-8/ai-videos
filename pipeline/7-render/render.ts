import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScriptFile } from "../1-script/save";
import type { Timeline } from "../4-timeline/build";
import { readJson, ROOT } from "../paths";

const COVER_FRAME = 15; // hook text settled, underline drawn

/** Copy a video's timeline and narration to public/current/, where the Reel composition reads them. */
export const stage = (dir: string) => {
  if (!existsSync(join(dir, "timeline.json"))) throw new Error("No timeline.json yet. Run audio (or timeline) first.");
  const cur = join(ROOT, "public", "current");
  mkdirSync(cur, { recursive: true });
  copyFileSync(join(dir, "timeline.json"), join(cur, "timeline.json"));
  copyFileSync(join(dir, "audio", "narration.wav"), join(cur, "narration.wav"));
};

const postCaptions = (s: ScriptFile) => {
  const tags = (n?: number) => s.hashtags.slice(0, n).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const ask = s.cta === "comment" && s.freebieStatus === "confirmed" ? `\n\nComment ${s.keyword.toUpperCase()} for the ${s.freebie.title || s.freebie.type}.` : "";
  const xTags = tags(2);
  const xBody = s.caption.length + xTags.length + 2 > 280 ? s.caption.slice(0, 280 - xTags.length - 3).trimEnd() + "…" : s.caption;
  return {
    "caption-instagram.txt": `${s.caption}${ask}\n\n${tags()}\n`,
    "caption-youtube.txt": `${s.title}\n\n${s.caption}\n\n${tags()} #Shorts\n`,
    "caption-x.txt": `${xBody}\n\n${xTags}\n`,
  };
};

export const render = async (dir: string, previewOnly: boolean) => {
  stage(dir);
  const script = readJson<ScriptFile>(join(dir, "script.json"));
  const timeline = readJson<Timeline>(join(dir, "timeline.json"));
  const prev = join(dir, "previews");
  const out = join(dir, "out");
  mkdirSync(prev, { recursive: true });

  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts") });
  const inputProps = { timeline };
  const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });

  // One still per scene, after its items have arrived but before its exit.
  for (const [i, s] of timeline.scenes.entries()) {
    const frame = s.from + Math.min(s.durationInFrames - 10, Math.max(COVER_FRAME, Math.floor(s.durationInFrames * 0.7)));
    await renderStill({ serveUrl, composition, inputProps, frame, output: join(prev, `scene-${i + 1}-${s.type.toLowerCase()}.png`) });
  }
  console.log(`Stills: ${timeline.scenes.length} in previews/`);

  await renderMedia({ serveUrl, composition, inputProps, codec: "h264", frameRange: [0, Math.min(3 * timeline.fps, composition.durationInFrames) - 1], outputLocation: join(prev, "first-3s.mp4") });
  console.log("Clip: previews/first-3s.mp4");
  if (previewOnly) return;

  mkdirSync(out, { recursive: true });
  let last = -1;
  await renderMedia({
    serveUrl, composition, inputProps, codec: "h264", outputLocation: join(out, "reel.mp4"),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) console.log(`Rendering ${(last = pct)}%`);
    },
  });
  await renderStill({ serveUrl, composition, inputProps, frame: COVER_FRAME, output: join(out, "cover.png") });
  for (const [name, text] of Object.entries(postCaptions(script))) writeFileSync(join(out, name), text);
  // Hook record: Stage 0 matches this to post performance later.
  writeFileSync(join(out, "hook.json"), JSON.stringify({ familyId: script.hook.familyId, text: script.hook.text, keyword: script.keyword, renderedAt: new Date().toISOString() }, null, 2) + "\n");

  console.log(`\nWrote out/reel.mp4 (${(timeline.durationInFrames / timeline.fps).toFixed(1)}s), cover.png, caption files, hook.json`);
  if (existsSync(join(dir, "audio", "voice.json"))) console.log("Generated voice: tick the AI disclosure when you post.");
};
