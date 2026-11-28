import { useEffect, useState } from "react";
import { api, file, type ReelSummary } from "./api";
import { Home } from "./Home";
import { Film, Gear } from "./icons";
import { LiveCircuit } from "./LiveCircuit";
import { ReelPage } from "./ReelPage";
import { Setup } from "./Setup";

/** Hash routes: #/ (home), #/reel/<id>/<tab>, #/settings. */
const useRoute = () => {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => { setHash(location.hash); scrollTo(0, 0); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
};

export const App = () => {
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [path0, ...rest] = useRoute();
  useEffect(() => { api.settings().then((r) => setFirstRun(r.firstRun)); }, []);
  if (firstRun === null) return null;

  const page = firstRun ? "setup" : path0 || "home";
  return (
    <div className="shell">
      <aside className="rail">
        <a className="mark" href="#/" aria-label="ai-vid home"><span>av</span></a>
        {/* Always visible; during first-run setup they're dimmed until setup is saved. */}
        <nav className={`nav${firstRun ? " locked" : ""}`} aria-label="Main">
          <a href={firstRun ? undefined : "#/"} title={firstRun ? "Finish setup first" : undefined} aria-disabled={firstRun}
            aria-current={!firstRun && (page === "home" || page === "reel") ? "page" : undefined}><Film /><span>Reels</span></a>
          <a href={firstRun ? undefined : "#/settings"} title={firstRun ? "Finish setup first" : undefined} aria-disabled={firstRun}
            aria-current={!firstRun && page === "settings" ? "page" : undefined}><Gear /><span>Settings</span></a>
        </nav>
        <LiveCircuit />
      </aside>
      <div className="content">
      {page === "setup" || page === "settings" ? (
        <Setup key={page} onSaved={() => setFirstRun(false)} />
      ) : page === "reel" && rest[0] ? (
        <ReelPage id={rest[0]} tab={rest[1]} />
      ) : (
        <Home />
      )}
      </div>
    </div>
  );
};

export const STATUS: Record<ReelSummary["status"], string> = { "needs-voice": "Needs a voice", ready: "Ready to render", rendered: "Rendered" };

/** 9:16 thumbnail: the cover once rendered, else the title set like a hook frame. */
export const Thumb = ({ r, v = 0 }: { r: ReelSummary; v?: number }) => (
  <div className={r.status === "rendered" ? "thumb" : "thumb unlit"}>
    {r.cover ? <img src={file(r.id, "out/cover.png", v)} alt="" /> : <p className="thumb-title">{r.title}</p>}
    <span className={`status s-${r.status}`}>{STATUS[r.status]}{r.flagged > 0 && ` · ${r.flagged} to fix`}</span>
  </div>
);
