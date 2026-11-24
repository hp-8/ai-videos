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

Preview in Remotion Studio:

```bash
npm run dev
```

<details>
<summary>All commands</summary>

```
npm run reel -- show <video>                   print the script, hooks and timing
npm run reel -- hook <video> <1-3>             swap to a different hook
npm run reel -- freebie <video> yes|no         accept or drop the proposed freebie
npm run reel -- audio <video>                  clean, transcribe and align the narration
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
| 4. Timeline | 🔨 next |
| 5. Animated scenes: springs, masked text reveals, designed transitions | ⏳ |
| 6. Word-highlight captions | ⏳ |
| 7. Render, cover and per-platform captions | ⏳ |
| Freebie: matching PDF, landing page and DM pack, built in the same run | ⏳ |

---

## Layout

```
pipeline/
  0-hooks/     hook bank loading and family picking
  1-script/    brief, schema and rule checker
  2-voice/     Voicebox client: presets, cloning, tempo
  3-audio/     FFmpeg cleanup, whisper.cpp, scene alignment
  cli.ts       one entry point: npm run reel -- <command>
src/           Remotion composition and theme tokens
hook-bank/     hooks.sample.json (public sample; the full bank stays private)
videos/        one folder per reel (git-ignored)
```

Each reel lives in one folder (`videos/<date>-<keyword>/`) as plain JSON and audio files, with no database. Any reel can be inspected, edited by hand, rebuilt or deleted on its own.

---

Built by [Harsh Patadia](https://harshpatadia.com).
