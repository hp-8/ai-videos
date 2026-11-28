import type { Settings } from "../pipeline/settings";
import type { Check } from "../pipeline/setup/checks";

export type { Settings, Check };
export type SettingsRes = { settings: Settings; defaults: Settings; firstRun: boolean; hasApiKey: boolean };

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
};
