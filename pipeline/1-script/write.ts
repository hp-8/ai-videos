import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { candidateFamilies } from "../0-hooks/bank";
import { ROOT, VIDEOS } from "../paths";
import { loadSettings } from "../settings";
import { checkScript } from "./check";
import { brief } from "./prompt";
import { saveScript, toScriptFile } from "./save";
import { ScriptOut } from "./schema";

const ATTEMPTS = 3;
const SCHEMA = z.toJSONSchema(ScriptOut) as Record<string, unknown>;

/** First {...} block in a reply (Claude Code may wrap JSON in prose or a code fence). */
const extractJson = (text: string): unknown => {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("The reply had no JSON in it.");
  return JSON.parse(text.slice(a, b + 1));
};

/** Uses the creator's own Claude Code login: `claude -p`, prompt on stdin. */
const viaClaudeCode = (prompt: string): Promise<string> =>
  new Promise((resolve, reject) => {
    // shell: true so Windows finds claude.cmd; the prompt goes through stdin, never the command line.
    const p = spawn("claude", ["-p", "--output-format", "text"], { shell: true, cwd: ROOT });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", () => reject(new Error("Claude Code isn't installed. Install it, or switch to an API key in Settings.")));
    p.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(err.trim() || `Claude Code stopped (exit ${code}). Run \`claude\` once in a terminal to sign in.`)),
    );
    p.stdin.end(prompt);
  });

const apiKey = () => {
  const env = join(ROOT, ".env");
  const line = existsSync(env) ? readFileSync(env, "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m) : null;
  return line?.[1].trim() ?? process.env.ANTHROPIC_API_KEY;
};

/** Anthropic API with structured output constrained to the script schema. */
const viaApi = async (prompt: string): Promise<string> => {
  const key = apiKey();
  if (!key) throw new Error("No API key saved. Add one in Settings, or switch to Claude Code.");
  const client = new Anthropic({ apiKey: key });
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if a safety check declines, the API retries on a fallback model in the same call
    output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined this topic. Try wording the sentence differently.");
  if (res.stop_reason === "max_tokens") throw new Error("The script came back cut off. Try again.");
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
};

/**
 * One sentence in, a checked script saved to its own video folder out.
 * Failed checks go back to the writer with the exact problems, up to ATTEMPTS times.
 */
export const writeReel = async (idea: string, noFreebie = false, log: (s: string) => void = console.log) => {
  const write = loadSettings().scriptWriter === "api-key" ? viaApi : viaClaudeCode;
  const base = brief(idea, candidateFamilies(), SCHEMA, noFreebie) + "\n\nReply with the JSON object only.";
  let prompt = base;
  for (let i = 1; i <= ATTEMPTS; i++) {
    log(i === 1 ? "Writing the script…" : `Fixing the script (try ${i} of ${ATTEMPTS})…`);
    const text = await write(prompt);
    try {
      const s = toScriptFile(idea, checkScript(extractJson(text)));
      let dir = join(VIDEOS, `${s.createdAt.slice(0, 10)}-${s.keyword}`);
      for (let n = 2; existsSync(dir); n++) dir = join(VIDEOS, `${s.createdAt.slice(0, 10)}-${s.keyword}-${n}`);
      saveScript(dir, s);
      log(`Script ready: ${s.title}`);
      return dir;
    } catch (e) {
      if (i === ATTEMPTS) throw new Error(`Couldn't get a script that passes the checks.\n${(e as Error).message}`);
      prompt = `${base}\n\nYour previous draft:\n${text}\n\nIt failed these checks. Fix every one and reply with the corrected JSON only:\n${(e as Error).message}`;
    }
  }
  throw new Error("unreachable");
};
