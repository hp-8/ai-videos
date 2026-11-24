import { AbsoluteFill, Composition } from "remotion";
import { colors, video } from "./theme/tokens";

const Reel: React.FC = () => <AbsoluteFill style={{ backgroundColor: colors.bg }} />;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={video.fps * 45}
    fps={video.fps}
    width={video.width}
    height={video.height}
  />
);
