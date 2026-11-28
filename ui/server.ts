import { getAvailableFonts } from "@remotion/google-fonts";
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { createServer as createVite } from "vite";
import { followCta, saveScript } from "../pipeline/1-script/save";
import { generateVoice, loadVoiceConfig } from "../pipeline/2-voice/run";
import { listProfiles } from "../pipeline/2-voice/voicebox";
import { processAudio } from "../pipeline/3-audio/run";
import { buildTimeline } from "../pipeline/4-timeline/build";
import { render, stage } from "../pipeline/7-render/render";
import { readJson, ROOT } from "../pipeline/paths";
import type { ScriptFile } from "../pipeline/1-script/save";
import { getJob, startJob } from "./jobs";
import { listReels, reelDetail, reelDir, saveRecording } from "./reels";
import { runChecks } from "../pipeline/setup/checks";
import { DEFAULTS, hasSettings, loadSettings, saveSettings, type Settings } from "../pipeline/settings";

const PORT = Number(process.env.PORT ?? 4321);
const ENV = join(ROOT, ".env");

const readEnv = () => (existsSync(ENV) ? readFileSync(ENV, "utf8") : "");
const hasApiKey = () => /^ANTHROPIC_API_KEY=.+$/m.test(readEnv());
/** Writes the key into the local .env only. It is never sent back to the page. */
const saveApiKey = (key: string) => {
  const rest = readEnv().split(/\r?\n/).filter((l) => l && !l.startsWith("ANTHROPIC_API_KEY="));
  writeFileSync(ENV, [...rest, `ANTHROPIC_API_KEY=${key}`].join("\n") + "\n");
};

const fonts = getAvailableFonts().map((f) => f.fontFamily);

const bytes = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};
const body = async (req: IncomingMessage) => {
  const raw = (await bytes(req)).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".png": "image/png", ".wav": "audio/wav", ".webm": "audio/webm", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json" };
/** Stream a file from inside `base`, with range support so video and audio can seek. */
const serveFile = (req: IncomingMessage, res: ServerResponse, base: string, rel: string) => {
  const path = normalize(join(base, decodeURIComponent(rel)));
  if (!path.startsWith(base + sep) || !existsSync(path)) return send(res, 404, { error: "Not found" });
  const size = statSync(path).size;
  const type = TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (range) {
    const start = Number(range[1] || 0);
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1, "cache-control": "no-store" });
    return createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes", "cache-control": "no-store" });
  createReadStream(path).pipe(res);
};

const audioThenTimeline = async (dir: string) => {
  await processAudio(dir);
  buildTimeline(dir);
};
const send = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};

const api = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", "http://x");
  const route = `${req.method} ${url.pathname}`;
  const reel = /^\/api\/reels\/([^/]+)(\/.*)?$/.exec(url.pathname);
  if (reel) {
    const id = decodeURIComponent(reel[1]);
    const dir = reelDir(id);
    switch (`${req.method} ${reel[2] ?? ""}`) {
      case "GET ":
        return send(res, 200, reelDetail(id));
      case "POST /hook": {
        const { index } = (await body(req)) as { index: number };
        const s = readJson<ScriptFile>(join(dir, "script.json"));
        const h = s.hooks[index];
        if (!h) return send(res, 400, { error: "No hook with that number." });
        s.hook = { ...h, pickedBy: "user" };
        s.scenes[0].narration = h.text;
        saveScript(dir, s);
        return send(res, 200, { ok: true });
      }
      case "POST /freebie": {
        const { yes } = (await body(req)) as { yes: boolean };
        const s = readJson<ScriptFile>(join(dir, "script.json"));
        if (s.freebieStatus === "none") return send(res, 400, { error: "No freebie was proposed for this reel." });
        s.freebieStatus = yes ? "confirmed" : "declined";
        if (!yes) {
          s.cta = "follow";
          Object.assign(s.scenes[s.scenes.length - 1], { narration: followCta(), headline: "Follow for more", highlight: "Follow" });
        }
        saveScript(dir, s);
        return send(res, 200, { ok: true });
      }
      case "POST /recording": {
        const scene = Number(url.searchParams.get("scene")) || undefined;
        saveRecording(id, await bytes(req), url.searchParams.get("ext") ?? "webm", scene);
        return send(res, 200, { ok: true });
      }
      case "POST /audio":
        return send(res, 202, startJob(id, "Matching your recording", () => audioThenTimeline(dir)));
      case "POST /voice": {
        const { voice, tempo } = (await body(req)) as { voice: string; tempo?: number };
        return send(res, 202, startJob(id, "Generating the voice", async () => {
          await generateVoice(dir, { voice, tempo }, true);
          await audioThenTimeline(dir);
        }));
      }
      case "POST /stage":
        stage(dir);
        return send(res, 200, readJson(join(dir, "timeline.json")));
      case "POST /render":
        return send(res, 202, startJob(id, "Rendering", () => render(dir, false)));
    }
    return send(res, 404, { error: "Not found" });
  }
  switch (route) {
    case "GET /api/reels":
      return send(res, 200, listReels());
    case "GET /api/job":
      return send(res, 200, getJob());
    case "GET /api/voices": {
      const voices = await listProfiles().then((p) => p.map((v) => v.name), () => null); // null: Voicebox not running
      return send(res, 200, { voices, default: loadVoiceConfig() });
    }
    case "GET /api/settings":
      return send(res, 200, { settings: loadSettings(), defaults: DEFAULTS, firstRun: !hasSettings(), hasApiKey: hasApiKey() });
    case "PUT /api/settings": {
      const s = (await body(req)) as Settings;
      saveSettings({ ...DEFAULTS, ...s, brand: { ...DEFAULTS.brand, ...s.brand } });
      return send(res, 200, { ok: true });
    }
    case "PUT /api/api-key": {
      const { key } = (await body(req)) as { key?: string };
      if (!key?.trim().startsWith("sk-ant-")) return send(res, 400, { error: "That doesn't look like an Anthropic key. It starts with sk-ant-." });
      saveApiKey(key.trim());
      return send(res, 200, { ok: true });
    }
    case "GET /api/checks":
      return send(res, 200, await runChecks());
    case "GET /api/fonts":
      return send(res, 200, fonts);
    default:
      return send(res, 404, { error: "Not found" });
  }
};

void createVite({
  root: join(ROOT, "ui"),
  server: { middlewareMode: true },
  appType: "spa",
  oxc: { jsx: { runtime: "automatic" } },
}).then((vite) =>
  createServer((req, res) => {
    const fail = (e: Error & { status?: number }) => send(res, e.status ?? 500, { error: e.message });
    if (req.url?.startsWith("/api/")) return api(req, res).catch(fail);
    // Reel files (video, cover, stills, recordings) and the staged preview the Player reads.
    const file = /^\/files\/([^/]+)\/(.+)$/.exec(req.url?.split("?")[0] ?? "");
    if (file) { try { return serveFile(req, res, reelDir(decodeURIComponent(file[1])), file[2]); } catch (e) { return fail(e as Error); } }
    if (req.url?.startsWith("/current/")) return serveFile(req, res, join(ROOT, "public", "current"), req.url.slice(9).split("?")[0]);
    vite.middlewares(req, res);
  }).listen(PORT, "127.0.0.1", () => console.log(`\n  ai-vid is running. Open http://localhost:${PORT}\n`)),
);
