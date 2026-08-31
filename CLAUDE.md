# Working in this repo

## Language
The user writes in Hebrew. Answer and summarize in Hebrew (עברית) in chat —
not English. Code, comments, commit messages, and PR titles/descriptions stay
in English as usual.

## i18n / RTL
The app UI supports English and Hebrew via `src/lib/i18n/`. Never hardcode a
user-facing string in a component -- add it to the matching namespace in
`src/lib/i18n/en/<name>.ts` and `src/lib/i18n/he/<name>.ts` (TypeScript
enforces the Hebrew file has every key the English one does), then read it
with `const t = useT(); t.<namespace>.<key>`. New namespace: create both
files, then register them in both `src/lib/i18n/en/index.ts` and
`src/lib/i18n/he/index.ts`.

RTL is applied via `dir="rtl"` on `<html>` when the user picks Hebrew (see
`useLanguageEffects` in `src/App.tsx`). Prefer CSS logical properties
(`inset-inline-start/end`, `padding-inline-start/end`, `text-align:
start/end`, `border-inline-start/end`) over physical `left`/`right` so
layout mirrors automatically. For an icon that visually encodes direction
(a back arrow, a forward/expand chevron) rather than a fixed symbol (trash
can, checkmark, plus), add the `icon-directional` class -- `[dir="rtl"]
.icon-directional { transform: scaleX(-1); }` in index.css flips it. Never
add that class to a non-directional icon.
