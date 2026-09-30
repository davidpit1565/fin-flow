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

## Pending follow-up: Instagram video script (raised 2026-09-30)
Once the Year-in-Review sharing feature (and the broader "make Flow feel
must-have" direction) is far enough along, circle back and help the user
prepare a script for an Instagram Reel about Flow. Context: the user posts
videos to their "Actually Works" channel, normally drafted by giving Claude
(in a separate project tied to repo `davidpit1565/videos-ai`, app
`actually-works-studio`) rough talking points to turn into a full script.
The user felt the video they were uploading around 2026-09-30 didn't land
the app's actual differentiation strongly enough -- so the new script
should lean on what's genuinely distinct (100% local, no account, no
server, no bank-credential risk -- unlike Mint/Copilot/Monarch/YNAB) rather
than generic budget-app messaging. The user can grant access to the
`davidpit1565/videos-ai` repo/studio if useful context is needed from there.
Do not start this unprompted -- wait until the current feature work has
progressed, then bring it up.
