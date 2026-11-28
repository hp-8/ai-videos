import { useEffect, useState } from "react";
import { api, type ReelSummary } from "./api";
import { Thumb } from "./App";
import { Plus } from "./icons";

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
        <div className="create" aria-disabled="true">
          <span className="create-ic"><Plus /></span>
          <span><b>New reel</b><small>Writing scripts here comes next. For now use <code>/reel</code> in Claude Code.</small></span>
        </div>
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
