import { useEffect, useState } from "react";
import { api, type Job } from "./api";

/** Rail widget: the tube hums while a pipeline step is running, and goes dark when idle. */
export const LiveCircuit = () => {
  const [job, setJob] = useState<Job | null>(null);
  useEffect(() => {
    const tick = () => api.job().then(setJob, () => undefined);
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, []);
  const on = job?.state === "running";
  return (
    <div className={`live${on ? " on" : ""}`} role="status" aria-live="polite">
      <div className="live-top"><span className="live-dot" />{on ? "Working" : "Idle"}</div>
      <svg viewBox="0 0 200 34" aria-hidden="true">
        <path className="wave-glass" strokeDasharray="40 8 16 0" d="M2 17 C 18 2, 30 2, 42 17 S 66 32, 82 17 S 106 2, 122 17 S 146 32, 162 17 S 186 2, 198 17" />
      </svg>
      <div className="live-b">
        {on ? <><b>{job!.kind}</b>{job!.progress !== null && <span className="num">{Math.round(job!.progress * 100)}%</span>}</> : <span>Nothing running</span>}
      </div>
    </div>
  );
};
