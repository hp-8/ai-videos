import type { Settings } from "../pipeline/settings";
import type { Check } from "../pipeline/setup/checks";

import type { Timeline } from "../pipeline/4-timeline/build";
import type { Job } from "./jobs";
import type { ReelDetail, ReelSummary } from "./reels";

export type { Settings, Check, Timeline, Job, ReelDetail, ReelSummary };
export type SettingsRes = { settings: Settings; defaults: Settings; firstRun: boolean; hasApiKey: boolean };

const enc = encodeURIComponent;
/** URL of a file inside a reel folder. Bump `v` after a job rewrites it. */
export const file = (id: string, path: string, v = 0) => `/files/${enc(id)}/${path}?v=${v}`;

const call = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
};

export const api = {
  settings: () => call<SettingsRes>("/api/settings"),
  save: (s: Settings) => call("/api/settings", { method: "PUT", body: JSON.stringify(s) }),
  saveKey: (key: string) => call("/api/api-key", { method: "PUT", body: JSON.stringify({ key }) }),
  checks: () => call<Check[]>("/api/checks"),
  fonts: () => call<string[]>("/api/fonts"),
  reels: () => call<ReelSummary[]>("/api/reels"),
  reel: (id: string) => call<ReelDetail>(`/api/reels/${enc(id)}`),
  pickHook: (id: string, index: number) => call(`/api/reels/${enc(id)}/hook`, { method: "POST", body: JSON.stringify({ index }) }),
  freebie: (id: string, yes: boolean) => call(`/api/reels/${enc(id)}/freebie`, { method: "POST", body: JSON.stringify({ yes }) }),
  /** Raw audio upload. `scene` is 1-based; omit it for a whole take. */
  upload: async (id: string, blob: Blob, ext: string, scene?: number) => {
    const q = new URLSearchParams({ ext, ...(scene ? { scene: String(scene) } : {}) });
    const res = await fetch(`/api/reels/${enc(id)}/recording?${q}`, { method: "POST", body: blob });
    if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
  },
  matchAudio: (id: string) => call<Job>(`/api/reels/${enc(id)}/audio`, { method: "POST" }),
  voices: () => call<{ voices: string[] | null; default: { voice?: string; tempo?: number } }>("/api/voices"),
  generateVoice: (id: string, voice: string, tempo: number) => call<Job>(`/api/reels/${enc(id)}/voice`, { method: "POST", body: JSON.stringify({ voice, tempo }) }),
  stage: (id: string) => call<Timeline>(`/api/reels/${enc(id)}/stage`, { method: "POST" }),
  render: (id: string) => call<Job>(`/api/reels/${enc(id)}/render`, { method: "POST" }),
  job: () => call<Job | null>("/api/job"),
};
