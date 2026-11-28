import { Composition, staticFile } from "remotion";
import type { Timeline } from "../pipeline/4-timeline/build";
import { Reel, type ReelProps } from "./Reel";
import { video } from "./theme/tokens";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={video.fps * 10}
    fps={video.fps}
    width={video.width}
    height={video.height}
    defaultProps={{ timeline: null } as ReelProps}
    // The video being previewed is copied to public/current/ by `npm run reel -- preview <video>`.
    calculateMetadata={async ({ props }) => {
      const res = await fetch(staticFile("current/timeline.json")).catch(() => null);
      const timeline = props.timeline ?? (res?.ok ? ((await res.json()) as Timeline) : null);
      return timeline ? { props: { timeline }, durationInFrames: timeline.durationInFrames, fps: timeline.fps } : {};
    }}
  />
);
