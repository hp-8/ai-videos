// One long-running pipeline step at a time (this is a single-person local tool).
// The pipeline reports progress with console.log, so a running job captures those lines.

export type Job = { id: number; reel: string; kind: string; state: "running" | "done" | "failed"; log: string[]; progress: number | null; error?: string };

let current: Job | null = null;
let seq = 0;

export const getJob = () => current;

export const startJob = (reel: string, kind: string, work: () => Promise<unknown>): Job => {
  if (current?.state === "running")
    throw Object.assign(new Error(`Still working on "${current.kind}" for ${current.reel}. Wait for it to finish.`), { status: 409 });
  const job: Job = { id: ++seq, reel, kind, state: "running", log: [], progress: null };
  current = job;
  const original = console.log;
  console.log = (...args: unknown[]) => {
    const line = args.map(String).join(" ");
    job.log.push(...line.split("\n").filter(Boolean));
    const pct = /^Rendering (\d+)%/.exec(line);
    if (pct) job.progress = Number(pct[1]) / 100;
    original(...args);
  };
  work()
    .then(() => { job.state = "done"; job.progress = 1; })
    .catch((e: Error) => { job.state = "failed"; job.error = e.message; })
    .finally(() => { console.log = original; });
  return job;
};
