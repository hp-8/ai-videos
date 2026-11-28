import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reel } from "../src/Reel";
import { api, file, type Job, type ReelDetail, type Timeline } from "./api";
import { STATUS } from "./App";
import { Alert, Arrow, Back, Check as CheckIcon, Copy, Export, Mic, Stop, Upload } from "./icons";

const TABS = [
  { id: "script", t: "Script" },
  { id: "voice", t: "Voice" },
  { id: "preview", t: "Preview" },
  { id: "render", t: "Render" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Polls the one running job; calls onDone once when it finishes. */
const useJob = (reel: string, onDone: () => void) => {
  const [job, setJob] = useState<Job | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const track = useCallback((j: Job) => setJob(j), []);
  useEffect(() => {
    api.job().then((j) => j && j.reel === reel && j.state === "running" && setJob(j)); // resume after a reload
  }, [reel]);
  useEffect(() => {
    if (job?.state !== "running") return;
    const t = setInterval(async () => {
      const j = await api.job();
      if (!j || j.id !== job.id) return;
      setJob(j);
      if (j.state !== "running") done.current();
    }, 1000);
    return () => clearInterval(t);
  }, [job?.id, job?.state]);
  return { job, track, busy: job?.state === "running" };
};

export const ReelPage = ({ id, tab }: { id: string; tab?: string }) => {
  const [r, setR] = useState<ReelDetail | null>(null);
  const [v, setV] = useState(0); // bumps after jobs so media reloads
  const [err, setErr] = useState("");
  const [tl, setTl] = useState<Timeline | null>(null);
  const player = useRef<PlayerRef>(null);
  const load = useCallback(() => api.reel(id).then((d) => { setR(d); setV((x) => x + 1); }, (e: Error) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const jobs = useJob(id, load);
  const hasVoice = r !== null && r.status !== "needs-voice";
  // Stage the timeline for the Player whenever the voice changes.
  useEffect(() => {
    if (!hasVoice) return setTl(null);
    api.stage(id).then(setTl, (e: Error) => setErr(e.message));
  }, [id, hasVoice, v]);

  if (err) return <main className="page"><p className="error" role="alert">{err}</p><a className="btn btn-soft" href="#/">Back to your reels</a></main>;
  if (!r) return null;
  const fallback: Tab = r.status === "rendered" ? "render" : r.status === "ready" ? "preview" : "voice";
  const current = (TABS.some((t) => t.id === tab) ? tab : fallback) as Tab;
  const doneTab: Record<Tab, boolean> = { script: true, voice: hasVoice, preview: hasVoice, render: r.status === "rendered" };
  const href = (t: Tab) => `#/reel/${encodeURIComponent(id)}/${t}`;
  const showVideo = current === "render" && r.status === "rendered" && !jobs.busy;

  return (
    <main className="studio">
      <header className="topbar">
        <div className="tb-l">
          <a className="iconbtn" href="#/" aria-label="All reels"><Back /></a>
          <div className="tb-title"><b>{r.title}</b><span>{STATUS[r.status]}</span></div>
        </div>
        <nav className="tabs" aria-label="Steps for this reel">
          {TABS.map((t, i) => (
            <a key={t.id} href={href(t.id)} className={`tab${doneTab[t.id] ? " done" : ""}`} aria-current={t.id === current ? "page" : undefined}>
              <i>{doneTab[t.id] && t.id !== current ? <CheckIcon /> : i + 1}</i>{t.t}
            </a>
          ))}
        </nav>
        <a className={`btn btn-grad${hasVoice ? "" : " is-disabled"}`} aria-disabled={!hasVoice} href={hasVoice ? href("render") : undefined}><Export />Render</a>
      </header>
      <section className="stage" aria-label="Your reel">
        <div className="canvas">
          {showVideo ? (
            <video controls src={file(r.id, "out/reel.mp4", v)} />
          ) : tl ? (
            <Player ref={player} component={Reel} inputProps={{ timeline: tl }} durationInFrames={tl.durationInFrames} fps={tl.fps} compositionWidth={1080} compositionHeight={1920} controls style={{ width: "100%", height: "100%" }} acknowledgeRemotionLicense />
          ) : (
            <div className="canvas-empty"><p>{r.script.hook.text}</p><span>Plays once it has a voice</span></div>
          )}
        </div>
      </section>
      <aside className="inspector">
        {jobs.job && (jobs.busy || jobs.job.state === "failed") && <JobBar job={jobs.job} />}
        {current === "script" && <ScriptTab r={r} reload={load} next={href("voice")} />}
        {current === "voice" && <VoiceTab r={r} v={v} reload={load} jobs={jobs} next={href("preview")} />}
        {current === "preview" && <PreviewTab r={r} tl={tl} player={player} next={href("render")} />}
        {current === "render" && <RenderTab r={r} v={v} jobs={jobs} />}
      </aside>
      <SceneTimeline r={r} tl={tl} player={player} />
    </main>
  );
};

const TYPE_HUE: Record<string, string> = { Hook: "#ff5c8a", Stat: "#ffb547", Flow: "#4ea8ff", List: "#7c6cff", CTA: "#2fd4a7" };

/** CapCut-style strip: one block per scene, width = its length, with a moving playhead. Click to jump. */
const SceneTimeline = ({ r, tl, player }: { r: ReelDetail; tl: Timeline | null; player: React.RefObject<PlayerRef | null> }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = () => setFrame(p.getCurrentFrame());
    p.addEventListener("frameupdate", on);
    return () => p.removeEventListener("frameupdate", on);
  }, [tl, player]);
  // Without a voice yet, estimate widths from word counts.
  const blocks = tl
    ? tl.scenes.map((s) => ({ type: s.type, text: s.narration, len: s.durationInFrames, from: s.from }))
    : r.script.scenes.map((s) => ({ type: s.type, text: s.narration, len: s.narration.split(/\s+/).length, from: -1 }));
  const total = blocks.reduce((n, b) => n + b.len, 0);
  const secs = tl ? tl.durationInFrames / tl.fps : 0;
  return (
    <footer className="timeline">
      <div className="tl-head">
        <span>Scenes</span>
        <span className="num">{tl ? `${(frame / tl.fps).toFixed(1)}s / ${secs.toFixed(1)}s` : "Timing appears after the voice is added"}</span>
      </div>
      <div className="tl-track">
        {blocks.map((b, i) => {
          const m = r.scenes?.[i];
          return (
            <button key={i} className={`clip${m?.flag ? " weak" : ""}`} style={{ flexGrow: b.len, ["--hue" as string]: TYPE_HUE[b.type] ?? "#888" }}
              disabled={!tl} onClick={() => { player.current?.seekTo(b.from); player.current?.play(); }} title={b.text}>
              <span className="clip-t">{i + 1} · {b.type}</span>
              <span className="clip-n">{b.text}</span>
              {m && <span className="clip-m">{m.flag ? <Alert /> : null}{Math.round(m.match * 100)}%</span>}
            </button>
          );
        })}
        {tl && <span className="playhead" style={{ left: `${(frame / tl.durationInFrames) * 100}%` }} />}
      </div>
      {!tl && total === 0 && null}
    </footer>
  );
};

/* ---------- Preview ---------- */

const PreviewTab = ({ r, tl, player, next }: { r: ReelDetail; tl: Timeline | null; player: React.RefObject<PlayerRef | null>; next: string }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = () => setFrame(p.getCurrentFrame());
    p.addEventListener("frameupdate", on);
    return () => p.removeEventListener("frameupdate", on);
  }, [tl, player]);

  if (r.status === "needs-voice") return <section className="card"><h2>Nothing to watch yet</h2><p className="lede">Add a voice first. The preview is built from your recording's timing.</p></section>;
  if (!tl) return <p className="lede">Loading the preview…</p>;
  const at = tl.scenes.findIndex((s) => frame >= s.from && frame < s.from + s.durationInFrames);
  return (
    <section className="card">
      <h2>Scene by scene</h2>
      <p className="lede">Press play on the reel, or pick a scene to jump straight to it.</p>
      <ol className="jump">
        {tl.scenes.map((s, i) => (
          <li key={i}>
            <button aria-current={i === at ? "true" : undefined} onClick={() => { player.current?.seekTo(s.from); player.current?.play(); }}>
              <span className="num">{(s.from / tl.fps).toFixed(1)}s</span>
              <span><b>{s.type}</b> {s.narration}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="foot"><span className="foot-note">Something sounds off? Re-record that scene on the Voice step.</span><a className="btn btn-ink" href={next}>Looks good, render it<Arrow /></a></div>
    </section>
  );
};

/* ---------- Render ---------- */

const CopyText = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn btn-soft btn-sm" onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}>
      {ok ? <CheckIcon /> : <Copy />}{ok ? "Copied" : "Copy"}
    </button>
  );
};

const RenderTab = ({ r, v, jobs }: { r: ReelDetail; v: number; jobs: Jobs }) => {
  const [err, setErr] = useState("");
  const go = async () => { setErr(""); try { jobs.track(await api.render(r.id)); } catch (e) { setErr((e as Error).message); } };
  if (r.status === "needs-voice") return <section className="card"><h2>Not ready to render</h2><p className="lede">Add a voice first, then come back here.</p></section>;
  const rendering = jobs.busy && jobs.job?.kind === "Rendering";
  const done = r.status === "rendered" && !rendering;
  return (
    <section className="card">
      <h2>{done ? "Your reel is ready" : "Make the final video"}</h2>
      <p className="lede">{done ? "Download the video and cover, then copy the caption for each app." : "Takes about 2 to 3 minutes. You can leave this page and come back."}</p>
      {r.generatedVoice && <p className="note"><Alert />This reel uses a generated voice. Turn on the AI label when you post it.</p>}
      <div className="row actions">
        {done && (
          <>
            <a className="btn btn-ink" href={file(r.id, "out/reel.mp4", v)} download={`${r.keyword}.mp4`}>Download video</a>
            <a className="btn btn-soft" href={file(r.id, "out/cover.png", v)} download={`${r.keyword}-cover.png`}>Download cover</a>
          </>
        )}
        <button className={`btn ${done ? "btn-text" : "btn-ink"}`} disabled={jobs.busy} onClick={go}>{done ? "Render again" : "Render the reel"}</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {done && Object.keys(r.captions).length > 0 && (
        <>
          <h3 className="sub">Captions</h3>
          <ul className="captions">
            {Object.entries(r.captions).map(([app, text]) => (
              <li key={app}>
                <div className="cap-top"><b>{app}</b><CopyText text={text} /></div>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {done && <div className="cover-row"><img src={file(r.id, "out/cover.png", v)} alt="Cover image" /><span className="hint">Cover image, shown before the reel plays.</span></div>}
    </section>
  );
};

const JobBar = ({ job }: { job: Job }) => (
  <div className={`job ${job.state}`} role="status">
    <div className="job-top">
      <b>{job.state === "failed" ? `${job.kind} stopped` : `${job.kind}…`}</b>
      {job.progress !== null && job.state === "running" && <span className="num">{Math.round(job.progress * 100)}%</span>}
    </div>
    {job.state === "running" && <div className="meter"><span style={{ width: job.progress === null ? undefined : `${job.progress * 100}%` }} className={job.progress === null ? "indeterminate" : ""} /></div>}
    <p className="job-log">{job.state === "failed" ? job.error : job.log.at(-1) ?? "Starting…"}</p>
  </div>
);

type Jobs = ReturnType<typeof useJob>;

/* ---------- Script ---------- */

const ScriptTab = ({ r, reload, next }: { r: ReelDetail; reload: () => void; next: string }) => {
  const s = r.script;
  const [err, setErr] = useState("");
  const act = (p: Promise<unknown>) => p.then(reload, (e: Error) => setErr(e.message));
  const locked = r.status !== "needs-voice"; // voice already matches this script
  return (
    <section className="card">
      <h2>Pick the opening line</h2>
      <p className="lede">{locked ? "Changing it means re-recording scene 1." : "Pick the one you'd stop scrolling for."}</p>
      <div className="hooks" role="radiogroup" aria-label="Opening line">
        {s.hooks.map((h, i) => (
          <button key={i} className="choice hook" role="radio" aria-checked={h.text === s.hook.text} onClick={() => h.text !== s.hook.text && act(api.pickHook(r.id, i))}>
            <span className="hook-text">{h.text}</span>
            <span className="choice-d">{h.familyId.replaceAll("-", " ")}</span>
          </button>
        ))}
      </div>
      {s.freebieStatus !== "none" && (
        <div className="freebie">
          <div>
            <h3>Freebie: {s.freebie.title || s.freebie.type}</h3>
            <p className="choice-d">{s.freebie.reason}</p>
          </div>
          {s.freebieStatus === "proposed" ? (
            <div className="row">
              <button className="btn btn-soft btn-sm" onClick={() => act(api.freebie(r.id, false))}>No freebie</button>
              <button className="btn btn-ink btn-sm" onClick={() => act(api.freebie(r.id, true))}>Offer it</button>
            </div>
          ) : (
            <span className={`chip ${s.freebieStatus === "confirmed" ? "chip-ok" : "chip-opt"}`}>{s.freebieStatus === "confirmed" ? "Offering it" : "Not offering"}</span>
          )}
        </div>
      )}
      {err && <p className="error" role="alert">{err}</p>}
      <div className="foot"><span className="foot-note">The full script is on the Voice step, scene by scene.</span><a className="btn btn-ink" href={next}>Record the voice<Arrow /></a></div>
    </section>
  );
};

/* ---------- Voice ---------- */

const pickMime = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

/** One recording at a time. Returns the blob when stopped. */
const useRecorder = () => {
  const [recording, setRecording] = useState<number | "take" | null>(null);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const start = async (slot: number | "take", onBlob: (b: Blob, ext: string) => void) => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
      const mime = pickMime();
      const m = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      m.ondataavailable = (e) => chunks.push(e.data);
      m.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onBlob(new Blob(chunks, { type: m.mimeType }), m.mimeType.includes("mp4") ? "m4a" : "webm");
        setRecording(null);
      };
      m.start();
      rec.current = m;
      setRecording(slot);
    } catch {
      setErr("The browser couldn't use your microphone. Allow microphone access for this page (the icon in the address bar), then try again.");
    }
  };
  const stop = () => rec.current?.stop();
  return { recording, start, stop, err };
};

const VoiceTab = ({ r, v, reload, jobs, next }: { r: ReelDetail; v: number; reload: () => void; jobs: Jobs; next: string }) => {
  const [mode, setMode] = useState<"record" | "generate">(r.generatedVoice ? "generate" : "record");
  return (
    <section className="card">
      <div className="card-top">
        <h2>Give it a voice</h2>
        <div className="seg-ctl" role="tablist">
          <button role="tab" aria-selected={mode === "record"} onClick={() => setMode("record")}>Record yourself</button>
          <button role="tab" aria-selected={mode === "generate"} onClick={() => setMode("generate")}>Use a voice</button>
        </div>
      </div>
      {mode === "record" ? <Record r={r} v={v} reload={reload} jobs={jobs} /> : <Generate r={r} jobs={jobs} />}
      <div className="foot">
        <span className="foot-note">{r.status === "needs-voice" ? "Preview opens once the voice is matched." : "Voice matched. You can still re-record any scene."}</span>
        <a className={`btn btn-ink${r.status === "needs-voice" ? " is-disabled" : ""}`} aria-disabled={r.status === "needs-voice"} href={r.status === "needs-voice" ? undefined : next}>Watch the preview<Arrow /></a>
      </div>
    </section>
  );
};

const Record = ({ r, v, reload, jobs }: { r: ReelDetail; v: number; reload: () => void; jobs: Jobs }) => {
  const rec = useRecorder();
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false); // new audio not matched yet
  const upload = (scene?: number) => (b: Blob, ext: string) =>
    api.upload(r.id, b, ext, scene).then(() => { setDirty(true); reload(); }, (e: Error) => setErr(e.message));
  const perScene = r.raw.some((f) => /^\d{2}\./.test(f));
  const take = r.raw.find((f) => f.startsWith("take."));
  const match = async () => { setErr(""); try { jobs.track(await api.matchAudio(r.id)); setDirty(false); } catch (e) { setErr((e as Error).message); } };
  const fileFor = (i: number) => r.raw.find((f) => f.startsWith(String(i + 1).padStart(2, "0") + "."));

  return (
    <>
      <div className="take">
        <div>
          <b>All in one take</b> <span className="hint">· easiest</span>
          <p className="choice-d">Read every scene below in order, without stopping. Easiest for most people.</p>
          {take && <audio controls src={file(r.id, `audio/raw/${take}`, v)} />}
        </div>
        <div className="row">
          <label className="btn btn-soft btn-sm">
            <Upload />Upload a file
            <input type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload()(f, f.name.split(".").pop() ?? "wav"); e.target.value = ""; }} />
          </label>
          {rec.recording === "take" ? (
            <button className="btn btn-rec btn-sm" onClick={rec.stop}><Stop />Stop</button>
          ) : (
            <button className="btn btn-ink btn-sm" disabled={rec.recording !== null || jobs.busy} onClick={() => rec.start("take", upload())}><Mic />{take ? "Record again" : "Record"}</button>
          )}
        </div>
      </div>
      <h3 className="sub">Or one scene at a time</h3>
      <ol className="scenes rec">
        {r.script.scenes.map((sc, i) => {
          const m = r.scenes?.[i];
          const f = fileFor(i);
          const live = rec.recording === i + 1;
          return (
            <li key={i} className={live ? "live" : undefined}>
              <span className="scene-type">{i + 1}. {sc.type}</span>
              <p className="read">{sc.narration}</p>
              <div className="scene-side">
                {m && !dirty && (
                  <span className={`chip ${m.flag ? "chip-warn" : "chip-ok"}`} title={m.flag}>
                    {m.flag ? <Alert /> : <CheckIcon />}{Math.round(m.match * 100)}% match
                  </span>
                )}
                {f && perScene && <audio controls src={file(r.id, `audio/raw/${f}`, v)} />}
                {live ? (
                  <button className="btn btn-rec btn-sm" onClick={rec.stop}><Stop />Stop</button>
                ) : (
                  <button className={`btn btn-sm ${m?.flag ? "btn-ink" : "btn-soft"}`} disabled={rec.recording !== null || jobs.busy} onClick={() => rec.start(i + 1, upload(i + 1))}>
                    <Mic />{f || m ? "Re-record" : "Record"}
                  </button>
                )}
              </div>
              {m?.flag && !dirty && <p className="flag">{m.flag === "not found in recording" ? "We couldn't hear this scene. Record it again." : "This came out quite different from the script. Record it again, reading it as written."}</p>}
            </li>
          );
        })}
      </ol>
      {(rec.err || err) && <p className="error" role="alert">{rec.err || err}</p>}
      {r.raw.length > 0 && (
        <div className="row end">
          <button className="btn btn-ink" disabled={jobs.busy || rec.recording !== null} onClick={match}>{r.scenes && !dirty ? "Check again" : "Check my recording"}</button>
        </div>
      )}
    </>
  );
};

const Generate = ({ r, jobs }: { r: ReelDetail; jobs: Jobs }) => {
  const [voices, setVoices] = useState<string[] | null | undefined>(undefined);
  const [voice, setVoice] = useState("");
  const [tempo, setTempo] = useState(1);
  const [err, setErr] = useState("");
  const load = () => api.voices().then((d) => { setVoices(d.voices); setVoice(d.default.voice ?? d.voices?.[0] ?? ""); setTempo(d.default.tempo ?? 1); });
  useEffect(() => { load(); }, []);
  const go = async () => {
    setErr("");
    if (r.raw.length && !r.generatedVoice && !confirm("This replaces your own recording with the generated voice. Continue?")) return;
    try { jobs.track(await api.generateVoice(r.id, voice, tempo)); } catch (e) { setErr((e as Error).message); }
  };
  if (voices === undefined) return <p className="choice-d gen">Looking for Voicebox…</p>;
  if (voices === null)
    return (
      <div className="gen">
        <p className="choice-d">Voicebox isn't running. Open the Voicebox app, then check again. Don't have it? Get it free from voicebox.sh. Recording yourself works without it.</p>
        <button className="btn btn-soft btn-sm" onClick={load}>Check again</button>
      </div>
    );
  if (!voices.length) return <p className="choice-d gen">Voicebox has no voices yet. Add one in the Voicebox app (a ready-made voice, or a clone of your own voice), then come back.</p>;
  return (
    <div className="gen fields">
      <div className="field">
        <label htmlFor="voice">Voice</label>
        <select id="voice" className="input" value={voice} onChange={(e) => setVoice(e.target.value)}>
          {voices.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tempo">Speed <span className="num">{tempo.toFixed(2)}×</span></label>
        <input id="tempo" type="range" min={0.8} max={1.3} step={0.05} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        <span className="hint">Reels usually sound best a little fast, around 1.1×.</span>
      </div>
      <p className="hint">Clone only your own voice, or one you have permission to use. Platforms ask you to mark generated voices as AI when you post.</p>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row end"><button className="btn btn-ink" disabled={!voice || jobs.busy} onClick={go}>{r.generatedVoice ? "Generate again" : "Generate the voice"}</button></div>
    </div>
  );
};

