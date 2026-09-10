# Working in this repo

## Language
The user writes in Hebrew. Answer and summarize in Hebrew (עברית) in chat —
not English. Code, comments, commit messages, and PR titles/descriptions stay
in English as usual.

## Strings
The app is English-only. User-facing strings still live in
`src/lib/i18n/en/<name>.ts` rather than being hardcoded inline -- read them
with `const t = useT(); t.<namespace>.<key>`. New namespace: create the file
under `src/lib/i18n/en/`, then register it in `src/lib/i18n/en/index.ts`.
Keeping strings centralized like this is worth doing even for one language:
it's one place to review copy, and it costs nothing extra.
