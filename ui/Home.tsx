import { useEffect, useState } from "react";
import { api, type Job, type ReelSummary } from "./api";
import { Thumb } from "./App";
import { Sparkle } from "./icons";

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const FILTERS: { id: "all" | ReelSummary["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs-voice", label: "Needs a voice" },
  { id: "ready", label: "Ready to render" },
  { id: "rendered", label: "Rendered" },
];

export const Home = () => {
  const [reels, setReels] = useState<ReelSummary[] | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  useEffect(() => { api.reels().then(setReels, (e: Error) => setErr(e.message)); }, []);
  const list = reels?.filter((r) => f === "all" || r.status === f) ?? [];

  return (
    <main className="home">
      <section className="hero">
        <div>
          <h1>Turn one sentence into a reel.</h1>
          <p>Script, voice, captions and motion, made on this computer.</p>
        </div>
        <Composer />
      </section>
      <div className="bar">
        <h2>Your reels</h2>
        <div className="chips" role="tablist">
          {FILTERS.map((x) => (
            <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)}>
              {x.label}<span className="num">{x.id === "all" ? reels?.length ?? 0 : reels?.filter((r) => r.status === x.id).length ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <ul className="grid">
        {list.map((r) => (
          <li key={r.id}>
            <a className="tile" href={`#/reel/${encodeURIComponent(r.id)}`}>
              <Thumb r={r} />
              <span className="tile-t">{r.title}</span>
              <span className="tile-s">{date(r.createdAt)} · {r.keyword}</span>
            </a>
          </li>
        ))}
        {reels && list.length === 0 && <li className="none">No reels here yet.</li>}
      </ul>
    </main>
  );
};

const EXAMPLES = ["Why ChatGPT makes things up", "What an AI agent actually is", "How your phone camera knows it's a face"];

/** One sentence in, a reel folder out. Lands in the new reel's Script step when done. */
const Composer = () => {
  const [idea, setIdea] = useState("");
  const [freebie, setFreebie] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState("");
  const busy = job?.state === "running";
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      const j = await api.job();
      if (!j || j.id !== job!.id) return;
      setJob(j);
      if (j.state === "done") location.hash = `#/reel/${encodeURIComponent(String(j.result))}/script`;
      if (j.state === "failed") setErr(j.error ?? "Something went wrong.");
    }, 1000);
    return () => clearInterval(t);
  }, [busy, job]);
  const go = async () => {
    setErr("");
    try { setJob(await api.newReel(idea, !freebie)); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (!busy && idea.trim()) go(); }}>
      <textarea className="composer-in" rows={2} placeholder="What should this reel explain? One sentence." value={idea} disabled={busy}
        onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
      {!idea && !busy && (
        <div className="examples">{EXAMPLES.map((x) => <button type="button" key={x} onClick={() => setIdea(x)}>{x}</button>)}</div>
      )}
      <div className="composer-bar">
        <button type="button" className={`pill${freebie ? " on" : ""}`} onClick={() => setFreebie(!freebie)} disabled={busy} aria-pressed={freebie}>
          Freebie {freebie ? "allowed" : "off"}
        </button>
        <span className="composer-status">{busy ? job!.log.at(-1) ?? "Starting…" : err ? <span className="error">{err}</span> : "Takes about a minute."}</span>
        <button className="btn btn-grad" disabled={busy || !idea.trim()}><Sparkle />{busy ? "Writing…" : "Make script"}</button>
      </div>
      {busy && <div className="meter"><span className="indeterminate" /></div>}
    </form>
  );
};
