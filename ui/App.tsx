import { useEffect, useState } from "react";
import { api, type Check, type Settings, type SettingsRes } from "./api";
import { Alert, Arrow, Check as CheckIcon, Copy, Dot, Mark, Refresh } from "./icons";

const STEPS = [
  { t: "Tools", s: "What's installed" },
  { t: "Your channel", s: "Niche, audience, sign-off" },
  { t: "Your brand", s: "Colors and font" },
  { t: "Script writing", s: "Claude Code or API key" },
] as const;

export const App = () => {
  const [res, setRes] = useState<SettingsRes | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.settings().then((r) => {
      setRes(r);
      setS(r.settings);
      if (!r.firstRun) setReached(STEPS.length - 1); // settings mode: every section open
    });
  }, []);

  if (!res || !s) return null;
  const firstRun = res.firstRun && !done;
  const go = (i: number) => { setStep(i); setReached((r) => Math.max(r, i)); };
  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch });
  const save = async () => { await api.save(s); setRes({ ...res, firstRun: false }); setDone(true); };

  return (
    <>
      <header className="bar">
        <div className="brand"><Mark />ai-vid</div>
        <span className="bar-note">{firstRun ? "First-time setup" : "Settings"} · everything stays on this computer</span>
      </header>
      <main className="page">
        {done ? (
          <Done s={s} onEdit={() => setDone(false)} />
        ) : (
          <>
            <div className="head">
              <h1>{firstRun ? "Let's get you ready to make reels." : "Settings"}</h1>
              <p>{firstRun ? "Four short steps. You can change any of this later." : "Change your channel, brand or script writer. New reels use these."}</p>
            </div>
            <div className="setup">
              <ol className="steps">
                {STEPS.map((st, i) => (
                  <li key={st.t}>
                    <button
                      className={`step${i < reached || (!firstRun && i !== step) ? " done" : ""}`}
                      aria-current={i === step ? "step" : undefined}
                      disabled={i > reached}
                      onClick={() => go(i)}
                    >
                      <span className="step-n">{i < reached && i !== step ? <CheckIcon /> : i + 1}</span>
                      <span>
                        <span className="step-t">{st.t}</span>
                        <span className="step-s" style={{ display: "block" }}>{st.s}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {step === 0 && <Tools onNext={() => go(1)} />}
              {step === 1 && <Channel s={s} set={set} onNext={() => go(2)} />}
              {step === 2 && <BrandStep s={s} set={set} defaults={res.defaults} onNext={() => go(3)} />}
              {step === 3 && <Writer s={s} set={set} hasKey={res.hasApiKey} onKey={() => setRes({ ...res, hasApiKey: true })} onSave={save} firstRun={firstRun} />}
            </div>
          </>
        )}
      </main>
    </>
  );
};

const Next = ({ onClick, label = "Continue", disabled, note }: { onClick: () => void; label?: string; disabled?: boolean; note?: string }) => (
  <div className="foot">
    <span className="foot-note">{note}</span>
    <button className="btn btn-ink" onClick={onClick} disabled={disabled}>{label}<Arrow /></button>
  </div>
);

const CopyCmd = ({ cmd }: { cmd: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="tool-fix">
      <code>{cmd}</code>
      <button className="btn btn-soft btn-sm" onClick={() => navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
        {copied ? <CheckIcon /> : <Copy />}{copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const Tools = ({ onNext }: { onNext: () => void }) => {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => { setBusy(true); api.checks().then(setChecks).finally(() => setBusy(false)); };
  useEffect(load, []);
  const blocked = checks?.some((c) => c.required && !c.ok);
  return (
    <section className="card" aria-busy={busy}>
      <h2>Tools on this computer</h2>
      <p className="lede">The reel maker uses a few free programs. Anything missing shows how to get it. Copy the line, paste it into a terminal once, then check again.</p>
      <ul className="tools">
        {(checks ?? []).map((c) => (
          <li className="tool" key={c.id}>
            <span className="tool-name">{c.name}</span>
            <span className={`chip ${c.ok ? "chip-ok" : c.required ? "chip-warn" : "chip-opt"}`}>
              {c.ok ? <CheckIcon /> : c.required ? <Alert /> : <Dot />}
              {c.ok ? "Ready" : c.required ? "Needed" : "Optional"}
            </span>
            <span className="tool-detail">{c.detail}</span>
            {!c.ok && c.fix && <CopyCmd cmd={c.fix} />}
          </li>
        ))}
        {!checks && <li className="tool"><span className="tool-detail">Checking…</span></li>}
      </ul>
      <div className="foot">
        <button className="btn btn-text" onClick={load} disabled={busy}><Refresh />{busy ? "Checking…" : "Check again"}</button>
        <button className="btn btn-ink" onClick={onNext} disabled={!checks || blocked}>Continue<Arrow /></button>
      </div>
    </section>
  );
};

type StepProps = { s: Settings; set: (p: Partial<Settings>) => void; onNext: () => void };

const Channel = ({ s, set, onNext }: StepProps) => (
  <section className="card">
    <h2>Your channel</h2>
    <p className="lede">Scripts are written for you, about your topic, in a way your viewers follow.</p>
    <div className="fields">
      <div className="field">
        <label htmlFor="creator">Your name or channel name</label>
        <input id="creator" className="input" value={s.creator} onChange={(e) => set({ creator: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="niche">What your reels explain</label>
        <textarea id="niche" className="input" rows={3} value={s.niche} onChange={(e) => set({ niche: e.target.value })} />
        <span className="hint">One or two sentences. Who it's for and what each reel teaches.</span>
      </div>
      <div className="field">
        <label htmlFor="audience">How to reach your viewers</label>
        <textarea id="audience" className="input" rows={2} value={s.audience} onChange={(e) => set({ audience: e.target.value })} />
        <span className="hint">What they already know, so the opening line starts there.</span>
      </div>
      <div className="field">
        <label htmlFor="cta">Sign-off line</label>
        <input id="cta" className="input" value={s.followCta} onChange={(e) => set({ followCta: e.target.value })} />
        <span className="hint">Spoken at the end of reels that don't offer a freebie.</span>
      </div>
    </div>
    <Next onClick={onNext} disabled={!s.creator.trim() || !s.niche.trim() || !s.followCta.trim()} />
  </section>
);

const COLORS = [
  { k: "bg", n: "Background", d: "Behind everything" },
  { k: "accent", n: "Highlight", d: "Key words and numbers" },
  { k: "connector", n: "Lines", d: "Arrows and connectors" },
  { k: "text", n: "Text", d: "Headlines and captions" },
  { k: "muted", n: "Soft text", d: "Labels and small print" },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

const BrandStep = ({ s, set, defaults, onNext }: StepProps & { defaults: Settings }) => {
  const [fonts, setFonts] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => { api.fonts().then(setFonts); }, []);
  // Preview only: load the chosen face from Google Fonts, the same source the render uses.
  useEffect(() => {
    const id = "brand-font";
    document.getElementById(id)?.remove();
    const link = Object.assign(document.createElement("link"), { id, rel: "stylesheet", href: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(s.brand.font)}:wght@700;900&display=swap` });
    document.head.append(link);
  }, [s.brand.font]);
  const b = s.brand;
  const setColor = (k: string, v: string) => {
    setDraft({ ...draft, [k]: v });
    if (HEX.test(v)) set({ brand: { ...b, [k]: v.toUpperCase() } });
  };
  const fontOk = fonts.length === 0 || fonts.includes(b.font);
  return (
    <section className="card">
      <h2>Your brand</h2>
      <p className="lede">How your reels look. The preview updates as you change things.</p>
      <div className="brand-grid">
        <div className="fields" style={{ marginTop: 0 }}>
          <div className="swatches">
            {COLORS.map(({ k, n, d }) => (
              <div className="swatch" key={k}>
                <input type="color" aria-label={n} value={b[k]} onChange={(e) => setColor(k, e.target.value)} />
                <span className="swatch-name">{n}<span>{d}</span></span>
                <input className="input" aria-label={`${n} hex`} value={draft[k] ?? b[k]} onChange={(e) => setColor(k, e.target.value)} onBlur={() => setDraft({})} spellCheck={false} />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="font">Font</label>
            <input id="font" className="input" list="fonts" value={b.font} onChange={(e) => set({ brand: { ...b, font: e.target.value } })} />
            <datalist id="fonts">{fonts.map((f) => <option key={f} value={f} />)}</datalist>
            {fontOk ? <span className="hint">Any Google Font. Bold weights look best.</span> : <span className="error">No Google Font has that name. Pick one from the list.</span>}
          </div>
          <div>
            <button className="btn btn-text" onClick={() => { setDraft({}); set({ brand: defaults.brand }); }}><Refresh />Reset to the default look</button>
          </div>
        </div>
        <div className="reel" style={{ background: b.bg, color: b.text, fontFamily: `"${b.font}", Inter, sans-serif` }} aria-label="Preview of a reel in your brand">
          <span className="reel-tag">Preview<span>your brand</span></span>
          <p className="reel-hook">Why does ChatGPT <span style={{ color: b.accent }}>forget</span> what you said?</p>
          <div className="reel-line" style={{ background: b.connector }} />
          <p className="reel-sub" style={{ color: b.muted }}>It only reads the last few pages</p>
          <p className="reel-cap">it <span style={{ color: b.accent }}>remembers</span> less</p>
        </div>
      </div>
      <Next onClick={onNext} disabled={!fontOk} />
    </section>
  );
};

const Writer = ({ s, set, hasKey, onKey, onSave, firstRun }: Omit<StepProps, "onNext"> & { hasKey: boolean; onKey: () => void; onSave: () => Promise<void>; firstRun: boolean }) => {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = (w: Settings["scriptWriter"]) => set({ scriptWriter: w });
  const finish = async () => {
    setErr("");
    setBusy(true);
    try {
      if (s.scriptWriter === "api-key" && key) { await api.saveKey(key); onKey(); }
      await onSave();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const needsKey = s.scriptWriter === "api-key" && !hasKey && !key;
  return (
    <section className="card">
      <h2>Who writes your scripts</h2>
      <p className="lede">Claude writes each script from your one sentence. Use the Claude Code you're already signed in to, or an Anthropic API key.</p>
      <div className="choices" role="radiogroup" aria-label="Script writer">
        <button className="choice" role="radio" aria-checked={s.scriptWriter === "claude-code"} onClick={() => pick("claude-code")}>
          <span className="choice-t">Claude Code <span className="chip chip-opt">No key needed</span></span>
          <span className="choice-d">Uses your own Claude login on this computer. Recommended.</span>
        </button>
        <button className="choice" role="radio" aria-checked={s.scriptWriter === "api-key"} onClick={() => pick("api-key")}>
          <span className="choice-t">API key {hasKey && <span className="chip chip-ok"><CheckIcon />Saved</span>}</span>
          <span className="choice-d">For people without Claude Code. Paid per use by Anthropic.</span>
        </button>
      </div>
      {s.scriptWriter === "api-key" && (
        <div className="fields">
          <div className="field">
            <label htmlFor="key">{hasKey ? "Replace your API key" : "Your Anthropic API key"}</label>
            <input id="key" className="input" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
            <span className="hint">Saved in the .env file on this computer. It is never shown again or sent anywhere except Anthropic.</span>
          </div>
        </div>
      )}
      {err && <p className="error" role="alert" style={{ marginTop: 16 }}>{err}</p>}
      <Next onClick={finish} label={busy ? "Saving…" : firstRun ? "Finish setup" : "Save settings"} disabled={busy || needsKey} note={needsKey ? "Paste your key to finish." : undefined} />
    </section>
  );
};

const Done = ({ s, onEdit }: { s: Settings; onEdit: () => void }) => (
  <div className="head done">
    <h1>You're set up.</h1>
    <p>Saved to settings.json in this folder. New reels use these settings.</p>
    <ul className="summary">
      <li><b>Channel</b><span>{s.creator}</span></li>
      <li><b>Sign-off</b><span>{s.followCta}</span></li>
      <li><b>Font</b><span>{s.brand.font}</span></li>
      <li><b>Scripts by</b><span>{s.scriptWriter === "claude-code" ? "Claude Code" : "Anthropic API key"}</span></li>
    </ul>
    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
      <button className="btn btn-soft" onClick={onEdit}>Change settings</button>
    </div>
  </div>
);
