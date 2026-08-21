# Flow — App Store submission checklist

This tracks everything needed to ship Flow to the App Store. Items marked **[DONE]** are already in this repo. Everything else needs a Mac with Xcode and (for the later steps) an active Apple Developer Program membership — neither of which this environment has, since Xcode only runs on macOS and Apple requires a real Developer account to sign and submit a build. Nothing below can be skipped or automated around; they're Apple platform requirements, not tooling limitations.

## 1. Native app shell — **[DONE]**

- Wrapped the existing web app with [Capacitor](https://capacitorjs.com) (`capacitor.config.ts`), which generated a real Xcode project at `ios/`.
- Bundle identifier: `com.solfaygroup.flow` — **placeholder, see step 2**.
- App display name: `Flow`.
- iPhone-only (`TARGETED_DEVICE_FAMILY = "1"`) — the UI is a fixed mobile layout, not iPad-adapted.
- Portrait-only orientation, matching the app's design.
- `ITSAppUsesNonExemptEncryption = false` set in `Info.plist`, so App Store Connect won't ask the export-compliance question at every build.
- Ported the three web APIs that don't work the same way inside a native iOS WebView, each with an automatic fallback so the web/PWA build is unaffected:
  - Haptics (`navigator.vibrate`, unsupported on iOS) → `@capacitor/haptics`
  - Scheduled reminders (Notification Triggers API, Chrome-only) → `@capacitor/local-notifications`
  - CSV export (blob download, no download manager in a native WebView) → `@capacitor/filesystem` + `@capacitor/share` (opens the iOS share sheet)
  - Status bar style and splash screen now use `@capacitor/status-bar` / `@capacitor/splash-screen`, following the app's light/dark theme.
- App icon and launch screen generated from the existing hand-drawn "Flow" mark (`scripts/gen-icons.mjs`), including the no-alpha 1024×1024 App Store icon Apple's validator requires.

## 2. Decide the bundle identifier — before you register the App ID

`com.solfaygroup.flow` is a placeholder in `capacitor.config.ts` and the Xcode project. It's freely changeable **right now** (just a config value). Once you register it as an App ID in the Apple Developer portal, it becomes **permanent** — you cannot rename it later, only retire it and start over with a new one. Confirm this is the identifier you want before that step.

## 3. App name collision

"Flow" is a very common app name/word. Consider searching the App Store for "Flow" before you lock in the listing. To reduce collision and improve search ranking without giving up the short home-screen name, the App Store *listing* title is set to **"Flow: Budget & Subscriptions"** (`ios/fastlane/metadata/en-US/name.txt`) while the on-device name stays the short **"Flow"** (`CFBundleDisplayName`) — this is standard practice (e.g. "Slack: Team Communication"). Change either independently if you'd rather use a different name.

## 4. Apple Developer account (you said: later)

1. Enroll at [developer.apple.com](https://developer.apple.com) — $99/year, individual or organization (organization requires a D-U-N-S number and takes longer to verify; individual is same-day/next-day).
2. In [App Store Connect](https://appstoreconnect.apple.com), create a new app record: platform iOS, name from step 3, primary language, bundle ID from step 2, SKU (any internal string, e.g. `flow-ios-001`).
3. Fill in `ios/fastlane/Appfile` with your real Apple ID email and both team IDs (visible in the Developer portal and App Store Connect once you're enrolled).

## 5. Build on a Mac

This repo can't produce a signed `.ipa` from this Linux environment — that step categorically requires Xcode, which only runs on macOS. Once you have a Mac (yours, or a cloud Mac CI like Codemagic/Bitrise/GitHub Actions macOS runners if you'd rather not use your own):

```bash
git clone <this repo> && cd fin-flow
bun install
bun run build
npx cap sync ios
open ios/App/App.xcworkspace
```

In Xcode: select the `App` target → *Signing & Capabilities* → check "Automatically manage signing" → pick your team (from step 4). Xcode will create the provisioning profile and certificate for you. Then either build/run on a real device or simulator via Xcode's Run button, or use the fastlane lanes below once the Appfile is filled in:

```bash
cd ios && bundle init && bundle add fastlane
bundle exec fastlane beta      # uploads a build to TestFlight
bundle exec fastlane release   # builds + uploads for App Store review (submit_for_review is off by default — flip it in the Fastfile once you're ready)
```

## 6. Screenshots (must be captured on a Mac/device — not possible from here)

Apple requires screenshots for at least one 6.9" device (iPhone 16 Pro Max class); other sizes are optional but recommended. Easiest path: run the app in the iOS Simulator (comes with Xcode, no physical device needed) on a 6.9" simulator, walk through onboarding → add a transaction → add a subscription → view budgets → view insights, and use `Cmd+S` in the Simulator to save each screenshot. Add them in App Store Connect under the app's "App Store" tab, or drop them in `ios/fastlane/screenshots/en-US/` and set `skip_screenshots: false` in the Fastfile.

## 7. Privacy policy — must be hosted at a real URL before submission

`PRIVACY_POLICY.md` in this repo is the drafted policy text (Flow collects nothing — strong, simple story). Apple **requires** a live URL for it. `ios/fastlane/metadata/en-US/privacy_url.txt` points to `https://solfaygroup.com/flow/privacy` — publish the policy there (or wherever you prefer) before submitting; the URL will fail App Store validation until it's live. Same for `support_url.txt` (`https://solfaygroup.com/flow/support`) — any page or contact-form URL works, it just has to load.

## 8. App Privacy ("nutrition label") questionnaire — App Store Connect

Under the app's "App Privacy" section in App Store Connect, answer: **"Data Not Collected."** This is accurate — Flow makes zero network requests and has no backend, so there is nothing to disclose beyond that.

## 9. Age rating questionnaire — App Store Connect

A personal finance tracker with no user-generated content, no chat, no gambling, and no mature content should land at **4+**. Answer the standard questionnaire honestly; nothing in this app should trigger a higher rating.

## 10. App Review notes

Worth adding a note for the reviewer in App Store Connect's "App Review Information": *"Flow stores all data locally on-device via IndexedDB/local storage; there is no account, login, or backend. No demo credentials are needed — all screens are reachable immediately after onboarding."*

## 11. Design: iOS 26 / 27

Apple's current design language (introduced as "Liquid Glass" with iOS 26) is a system-level rendering effect applied by the OS to native UIKit/SwiftUI chrome (navigation bars, tab bars, controls) — it isn't something a web view's HTML/CSS can literally reproduce pixel-for-pixel, since it depends on real-time compositor effects the OS applies to native surfaces. What this app already had (and this pass double-checked): a translucent, blurred bottom tab bar (`backdrop-filter: blur`), full safe-area handling for the Dynamic Island and home indicator (`env(safe-area-inset-*)`, already applied everywhere it's needed), and adaptive light/dark theming — all standards-based and already aligned with the spirit of the current design language. This pass also increased the bottom sheet's corner radius (22px → 28px) to match iOS 26's more generous "continuous corner" sheet presentation. iOS 27 has no public design documentation yet (unreleased as of this writing); nothing here is iOS-26-specific in a way that would need rework — it's all standard, forward-compatible CSS.

## What's genuinely done vs. what's left

**Done (in this repo, verified):** native shell, all three native-vs-web API bridges, icons/splash, Info.plist/Xcode config, fastlane skeleton, App Store metadata text, privacy policy draft, typecheck/build/full e2e suite all still green.

**Left, and why it can't be done here:** every step in sections 4–9 above needs either an Apple Developer account (doesn't exist yet, by your own choice) or a Mac with Xcode (this environment is Linux and cannot run Xcode) — most steps need both. There is no way around this; it's how Apple's platform works for every iOS app, regardless of what tooling built it.
