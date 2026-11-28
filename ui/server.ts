import { getAvailableFonts } from "@remotion/google-fonts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { createServer as createVite } from "vite";
import { ROOT } from "../pipeline/paths";
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

const body = async (req: IncomingMessage) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};
const send = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};

const api = async (req: IncomingMessage, res: ServerResponse) => {
  const route = `${req.method} ${req.url?.split("?")[0]}`;
  switch (route) {
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
    if (req.url?.startsWith("/api/")) return api(req, res).catch((e: Error) => send(res, 500, { error: e.message }));
    vite.middlewares(req, res);
  }).listen(PORT, "127.0.0.1", () => console.log(`\n  ai-vid is running. Open http://localhost:${PORT}\n`)),
);
