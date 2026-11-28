import { AbsoluteFill, Sequence } from "remotion";
import type { TimelineScene } from "../pipeline/4-timeline/build";
import { StatCompare } from "./scenes/layouts";
import { LAYOUTS } from "./scenes/scenes";
import { Background } from "./theme/Background";
import { colors, type as t } from "./theme/tokens";

// Every layout once, with sample content, for reviewing the look in Studio (composition "Gallery").
// No audio: items fall back to evenly staggered timing.

const LEN = 105; // 3.5s each
type Sample = Omit<TimelineScene, "from" | "durationInFrames" | "words" | "transition" | "layout">;
const base = { narration: "", headline: "", highlight: "", items: [] as string[], value: "" };

const SAMPLES: Record<keyof typeof LAYOUTS, Sample> = {
  Hook: { ...base, type: "Hook", narration: "You think ChatGPT reads words. It doesn't.", highlight: "words" },
  Stat: { ...base, type: "Stat", value: "75%", headline: "of a word, on average", highlight: "word" },
  Flow: { ...base, type: "Flow", headline: "What happens to your message", items: ["Split into tokens", "Turned into numbers", "Next token predicted"] },
  List: { ...base, type: "List", headline: "Why it miscounts letters", items: ["It sees chunks", "Not single letters", "So it guesses"] },
  CTA: { ...base, type: "CTA", narration: "Follow for more AI, explained simply.", headline: "Follow for more", highlight: "Follow" },
  Chat: { ...base, type: "Chat", items: ["How many r's are in strawberry?", "There are two r's in strawberry."] },
  Myth: { ...base, type: "Myth", items: ["ChatGPT reads your words", "It reads chunks called tokens"] },
  Term: { ...base, type: "Term", headline: "Token", items: ["A small chunk of text", "\"straw\" + \"berry\""] },
  Word: { ...base, type: "Word", highlight: "Tokens.", headline: "Not words. Tokens.", narration: "Tokens." },
};

const entries = (Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).flatMap((type) =>
  LAYOUTS[type].map((C, layout) => ({ type, layout, C, name: `${type}${LAYOUTS[type].length > 1 ? ` · ${layout + 1}/${LAYOUTS[type].length}` : ""}` })),
);
// Extra: the data-driven Stat comparison.
const compare: Sample = { ...base, type: "Stat", headline: "Words vs tokens in this reel", items: ["Words: 100", "Tokens: 133"] };

export const GALLERY_FRAMES = (entries.length + 1) * LEN;

const Label: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", top: 70, left: 70, padding: "14px 26px", borderRadius: 40, background: "rgba(0,0,0,0.55)", color: colors.text, fontFamily: t.family, fontWeight: 700, fontSize: 36, letterSpacing: "0.02em" }}>{text}</div>
);

export const Gallery: React.FC = () => {
  const reel = { keyword: "tokens", cta: "follow" as const };
  return (
    <AbsoluteFill>
      <Background />
      {entries.map(({ type, C, name }, i) => (
        <Sequence key={name} from={i * LEN} durationInFrames={LEN} name={name}>
          <C scene={{ ...SAMPLES[type], from: 0, durationInFrames: LEN, words: [], transition: null }} reel={reel} />
          <Label text={name} />
        </Sequence>
      ))}
      <Sequence from={entries.length * LEN} durationInFrames={LEN} name="Stat · compare">
        <StatCompare scene={{ ...compare, from: 0, durationInFrames: LEN, words: [], transition: null }} reel={reel} />
        <Label text="Stat · compare (two numbers)" />
      </Sequence>
    </AbsoluteFill>
  );
};
