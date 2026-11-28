# ai-vid

**One sentence in. A finished vertical explainer reel out.**

A local-first pipeline that turns an idea like *"how ChatGPT reads your message in tokens"* into a scripted, narrated, word-synced short-form video, built entirely in code with [Remotion](https://remotion.dev). No editor timeline, no stock templates, and no cloud renders.

```
"how ChatGPT reads your message in tokens"
        │
        ▼
  ┌───────────┐   ┌──────────┐   ┌─────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐
  │ hook bank │ → │  script  │ → │  voice  │ → │ word sync │ → │ timeline │ → │  render  │
  └───────────┘   └──────────┘   └─────────┘   └───────────┘   └──────────┘   └──────────┘
   14 families     Claude picks    your mic,     whisper.cpp     scene ↔ word    1080×1920
   self-pruning    the hook,       a preset,     per-word        alignment       mp4 + cover
                   checks rules    or a clone    timestamps                      + captions
```

---

## The interesting parts

### A hook bank that remembers

The first 1.5 seconds decide whether anyone watches. Instead of a single prompt like "write a catchy hook", hooks come from a library of **14 hook families** (*Misconception bust*, *Analogy first*, *Visual reveal*...). Each family has a template, an emotional trigger and its own on-screen visual treatment.

The picker skips families marked tired and anything used in your last 3 reels, so the feed never repeats itself. The next step is feeding real post analytics back in, so the bank learns what works for *your* audience rather than what trends in general.

### Strict scripts, checked by code

The script step uses Claude, but nothing gets through unchecked. Every draft is parsed against a [Zod](https://zod.dev) schema and then tested against the editorial rules:

- hook under 10 words, and scene 1 is that hook word for word
- 5 to 7 scenes, 90 to 130 spoken words (about 35 to 50 seconds)
- no hook family used twice, and only families that exist in the bank
- a "comment to get" call to action only if a freebie actually exists

The brief itself sets the voice: no jargon in the hook, no hype, no invented numbers, and start from what the viewer already knows.

A failed check returns every problem at once, and the model fixes its own draft until it passes. It runs as a Claude Code slash command (`/reel`), so there's no API key to manage.

### Three ways to get a voice, one pipeline

| Mode | How | Speed |
|---|---|---|
| **Your mic** | Drop a take, or one file per scene, into the video's `audio/raw/` folder | n/a |
| **Preset voice** | [Voicebox](https://voicebox.sh), running locally (Kokoro) | about 1.5 min per reel on a laptop |
| **Your cloned voice** | Clone once from 20 to 30 seconds of speech, reuse forever | about 8.5 min per reel on CPU |

Tempo control works on any source. Every generated reel records which voice made it, so you always know which posts need an AI disclosure.

### Word-level sync

All three voice modes converge on the same audio stage:

1. **Clean:** FFmpeg removes noise, caps pauses at 0.25s and normalizes loudness to −14 LUFS (the social-platform standard).
2. **Transcribe:** whisper.cpp runs **on-device** and returns per-word timestamps.
3. **Align:** a longest-common-subsequence match maps what you *said* onto what the script *says*, so every scene knows its exact start and end, even if you ad-lib.
4. **Flag:** scenes that drift too far from the script are flagged instead of silently guessed.
5. **Trim:** the hook's first word is cut to land on **frame 0**. No dead air, ever.

That timing data drives everything downstream: captions highlight the word being spoken, and key visuals hit on the exact frame the word lands.

### A frame-exact timeline

Each scene is cut from the narration, given a 0.5s breath (none after the hook, so the opening never stalls), and padded to a **whole number of frames** before everything is joined into one track. Audio and visuals can't drift: a 1008-frame timeline produces a narration track of exactly 33.600s.

### Motion built in code, not templates

Five scene types (**Hook, Stat, Flow, List, CTA**) share one set of named spring presets (*snappy, smooth, punchy*) and one set of color and type tokens.

- **Text** slides up word by word out of a masked edge, never a plain fade.
- **Numbers** count up with a slight overshoot and settle.
- **List items and flow steps** arrive on the frame their words are spoken.
- **Transitions** are designed: zoom through, whip pan with blur, an accent-colored wipe.
- **The camera** is never fully still: a slow push in, over a drifting glow with film grain and a vignette.
- **The hook** is readable on frame 0 and settles within 10 frames.

### Captions and packaging

Captions show four words at a time, with the spoken word highlighted, and stay off during the hook. One render command produces the mp4, a cover image, a caption file per platform (Instagram, YouTube Shorts, X) and a hook record that ties the reel back to its hook family for performance learning.

---

## Quick start

```bash
npm i
```

Inside Claude Code:

```
/reel how ChatGPT reads your message in tokens
```

Then pick a voice:

```bash
npm run reel -- audio tokens                           # your own recording
npm run reel -- voice tokens --voice michael --tempo 1.1   # or a generated voice
```

Watch it in Remotion Studio, then render:

```bash
npm run reel -- preview tokens            # opens Studio in the browser
npm run reel -- render tokens --preview   # scene stills + first 3 seconds
npm run reel -- render tokens             # reel.mp4, cover, captions
```

<details>
<summary>All commands</summary>

```
npm run reel -- show <video>                   print the script, hooks and timing
npm run reel -- hook <video> <1-3>             swap to a different hook
npm run reel -- freebie <video> yes|no         accept or drop the proposed freebie
npm run reel -- audio <video>                  clean, transcribe, align, then build the timeline
npm run reel -- timeline <video>               rebuild timeline.json and the narration track
npm run reel -- preview <video>                open the reel in Remotion Studio
npm run reel -- render <video> [--preview]     stills and 3s clip; without --preview also mp4, cover, captions
npm run reel -- voice <video> [--voice <name>] [--tempo 1.1] [--engine <e>] [--default] [--force]
npm run reel -- voices                         list your voices
npm run reel -- presets kokoro                 browse ready-made voices
npm run reel -- voice-add <name> --preset kokoro:am_michael
npm run reel -- voice-add <name> --clone sample.wav [--engine chatterbox_turbo]
```

</details>

**Needs:** Node 20+, FFmpeg, and [Claude Code](https://claude.com/claude-code). [Voicebox](https://voicebox.sh) is only needed for generated voices. whisper.cpp downloads itself on first run.

---

## Status

| Stage | |
|---|---|
| 0. Hook bank | ✅ |
| 1. Script and freebie decision | ✅ |
| 2. Voice generation and cloning | ✅ |
| 3. Cleanup, transcription and scene alignment | ✅ |
| 4. Timeline | ✅ |
| 5. Animated scenes: springs, masked text reveals, designed transitions | ✅ first pass |
| 6. Word-highlight captions | ✅ |
| 7. Render, cover and per-platform captions | ✅ |
| Freebie: matching PDF, landing page and DM pack, built in the same run | ⏳ |
| Performance learning from post analytics | ⏳ |

---

## Layout

```
pipeline/
  0-hooks/     hook bank loading and family picking
  1-script/    brief, schema and rule checker
  2-voice/     Voicebox client: presets, cloning, tempo
  3-audio/     FFmpeg cleanup, whisper.cpp, scene alignment
  4-timeline/  frame-exact scene lengths and the joined narration track
  7-render/    stills, preview clip, mp4, cover, captions, hook record
  cli.ts       one entry point: npm run reel -- <command>
src/
  scenes/      Hook, Stat, Flow, List, CTA
  motion/      spring presets, word reveals, sync helpers
  captions/    word-highlight captions
  theme/       color and type tokens, background
  Reel.tsx     scenes, transitions, camera, audio
hook-bank/     hooks.sample.json (public sample; the full bank stays private)
videos/        one folder per reel (git-ignored)
```

Each reel lives in one folder (`videos/<date>-<keyword>/`) as plain JSON and audio files, with no database. Any reel can be inspected, edited by hand, rebuilt or deleted on its own.

---

Built by [Harsh Patadia](https://harshpatadia.com).
