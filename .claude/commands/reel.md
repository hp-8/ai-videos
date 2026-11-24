---
description: Write a reel script from one sentence (hook pick + script + freebie proposal)
argument-hint: <one sentence naming the subject>
---

Write a reel script for: $ARGUMENTS

1. Run `npm run reel -s -- brief "$ARGUMENTS"` and follow that brief exactly. It holds the rules, the hook families available, and the JSON Schema.
2. Write the script JSON to `videos/_draft.json`. Fill the templates in your own words, and check every claim is true. Never invent numbers.
3. Run `npm run reel -s -- save "$ARGUMENTS" videos/_draft.json`. If it reports failed checks, fix the draft and run it again until it passes.
4. Delete `videos/_draft.json`, then show me the hooks, the pick and why, the scenes, and any freebie proposal. Don't build anything for the freebie; I confirm with `npm run reel -- freebie <keyword> yes|no`.
