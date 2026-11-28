# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Phase 2 UI: Vite + React page, served by a small `node:http` server that imports the pipeline functions directly. Remotion Player embeds the reel for Preview. Runs locally via `npm run ui`; never deployed.

## Users

Non-technical creators who have never used a terminal. They clone the public repo (following the README), run one command, and from then on make short vertical explainer reels by clicking through screens on their own laptop. Setup has to guide them through every missing tool in plain words.

The repo owner (Harsh Patadia) also uses it daily for AI-explainer reels; his brand, niche and CTA are the shipped defaults.

## Product Purpose

Turn one sentence into a finished vertical explainer reel (35–50s): hook pick, script, voiceover with word timing, animated scenes, captions, rendered mp4, cover and per-platform post captions. Success: a creator goes from sentence to postable reel without touching the terminal or editing code.

## Positioning

Fully local and owned: scripts come from the user's own Claude Code login or Anthropic API key, voices from their own recording or local Voicebox, and every reel, recording, hook bank and setting stays on their machine as plain files. No accounts, no cloud, no subscription beyond what they already have.

## Operating Context

- One reel at a time, roughly one a day. Each reel is a folder `videos/<date>-<keyword>/` of plain JSON and audio.
- Flow: Setup (first run) → Home → Script → Voice → Preview → Render.
- Long-running steps: voice cloning (~8.5 min), render (~2.5 min). Progress must be visible.
- Recording happens in the browser; mic permission is asked once per browser.
- External tools: Node, FFmpeg, Claude Code (optional), Voicebox (optional), whisper.cpp (self-downloads).

## Capabilities and Constraints

- The pipeline (Stages 0–7) does not change; the UI calls the same steps as the CLI.
- Personal settings live in a git-ignored local file: brand (colors, font, logo), niche, audience, CTA line, script-writing option. Defaults = Harsh's.
- Hook bank: ships `hooks.sample.json`; each user grows their own locally.
- Script writing: Claude Code `claude -p` (default) or an Anthropic API key stored in local `.env`.
- Tested on Windows only; Mac/Linux unverified.
- Remotion license: free for individuals and small companies; README must say so.
- Voice cloning: ask users to clone only their own voice or one they have permission for.
- AI disclosure reminder at render for generated voices.
- Freebie pages: optional, off by default.

## Brand Commitments

- Reel brand (default): dark `#0B0B0F`, accent yellow `#FFD23F`, teal `#2EC4B6`, Inter 900. This is the *reel's* look and a user setting, not the UI's identity.
- UI should be a quiet workshop tool: the reel is the loudest thing on screen; brand shows in small accents only.
- Voice: plain, simple English. No hype.

## Evidence on Hand

- `examples/`: sample reels safe to share.
- `hook-bank/hooks.sample.json`: public hook sample.
- No testimonials, user counts or benchmarks exist; do not invent them.

## Product Principles

1. Never make the user open a terminal after `npm run ui`.
2. Say what's missing and exactly how to fix it, in plain words.
3. Everything stays on the user's machine, and the UI says so.
4. The reel is the hero; the interface steps back.
5. Same pipeline as the CLI. The UI adds no hidden behavior.

## Accessibility & Inclusion

Non-technical audience: plain-language copy, no jargon in labels or errors, keyboard-usable controls. No stricter standard established.
