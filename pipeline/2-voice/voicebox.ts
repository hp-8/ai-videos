import { readFileSync } from "node:fs";
import { basename } from "node:path";

// Voicebox (https://voicebox.sh) local API. The desktop app must be running.
const BASE = process.env.VOICEBOX_URL ?? "http://127.0.0.1:17493";

export const ENGINES = ["qwen", "qwen_custom_voice", "luxtts", "chatterbox", "chatterbox_turbo", "tada", "kokoro"] as const;
export type Engine = (typeof ENGINES)[number];

export type Profile = {
  id: string;
  name: string;
  voice_type: "cloned" | "preset" | "designed" | null;
  preset_engine: string | null;
  preset_voice_id: string | null;
  default_engine: string | null;
  sample_count: number;
};

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch {
    throw new Error(`Voicebox isn't running at ${BASE}. Open the Voicebox app and try again.`);
  }
  if (!res.ok) throw new Error(`Voicebox ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
};

const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const listProfiles = () => api<Profile[]>("/profiles");

export const findProfile = async (name: string): Promise<Profile> => {
  const all = await listProfiles();
  const p = all.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!p) throw new Error(`No Voicebox voice named "${name}". Have: ${all.map((x) => x.name).join(", ") || "none"}. Add one with voice-add.`);
  return p;
};

/** Model weights download on first use; wait for them so generation doesn't fail. */
const ensureModel = async (engine: string) => {
  const name = { qwen: "qwen-tts-1.7B", qwen_custom_voice: "qwen-custom-voice-1.7B", chatterbox: "chatterbox-tts", tada: "tada-1b" }[engine] ?? engine.replace("_", "-");
  const status = async () => (await api<{ models: { model_name: string; downloaded: boolean }[] }>("/models/status")).models.find((m) => m.model_name === name);
  if ((await status())?.downloaded !== false) return;
  console.log(`Downloading the ${name} voice model (first use only)…`);
  await post("/models/download", { model_name: name });
  while (!(await status())?.downloaded) await new Promise((r) => setTimeout(r, 3000));
};

export const createPreset = async (name: string, engine: Engine, voiceId: string) => {
  await ensureModel(engine);
  return post<Profile>("/profiles", { name, voice_type: "preset", preset_engine: engine, preset_voice_id: voiceId, default_engine: engine });
};

export const listPresets = (engine: Engine) =>
  api<{ voices: { voice_id: string; name: string; gender: string; language: string }[] }>(`/profiles/presets/${engine}`).then((r) => r.voices);

export const createClone = async (name: string, engine: Engine, samplePath: string, referenceText: string) => {
  const p = await post<Profile>("/profiles", { name, voice_type: "cloned", default_engine: engine });
  const form = new FormData();
  form.append("file", new Blob([readFileSync(samplePath)]), basename(samplePath));
  form.append("reference_text", referenceText);
  await api(`/profiles/${p.id}/samples`, { method: "POST", body: form });
  return p;
};

/** Generate speech and return the WAV bytes. Status is an event stream; read until it settles. */
export const generate = async (profile: Profile, text: string, engine?: Engine): Promise<Buffer> => {
  const use = (engine ?? profile.default_engine ?? profile.preset_engine ?? "qwen") as Engine;
  await ensureModel(use);
  const g = await post<{ id: string }>("/generate", { profile_id: profile.id, text, engine: use, language: "en" });

  for (;;) {
    const res = await fetch(`${BASE}/generate/${g.id}/status`);
    const events = (await res.text()).match(/data: .*/g) ?? [];
    const last = events.length ? (JSON.parse(events.at(-1)!.slice(6)) as { status: string; error: string | null }) : null;
    if (last?.status === "completed") break;
    if (last?.status === "failed") throw new Error(`Voicebox generation failed: ${last.error}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const audio = await fetch(`${BASE}/audio/${g.id}`);
  if (!audio.ok) throw new Error(`Voicebox audio download: ${audio.status}`);
  return Buffer.from(await audio.arrayBuffer());
};
