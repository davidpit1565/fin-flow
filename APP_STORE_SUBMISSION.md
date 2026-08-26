# Flow — App Store submission checklist

This tracks everything needed to ship Flow to the App Store. Items marked **[DONE]** are already in this repo or otherwise finished. What's left needs an Apple Developer Program membership and, for a couple of steps, a Mac with Xcode — neither of which this environment has, since Apple requires a real Developer account to sign and submit a build, and Xcode only runs on macOS. Nothing below can be skipped or automated around; they're Apple platform requirements, not tooling limitations.

## 1. Native app shell — **[DONE]**

- Wrapped the existing web app with [Capacitor](https://capacitorjs.com) (`capacitor.config.ts`), which generated a real Xcode project at `ios/`.
- Bundle identifier: `com.davidpit.flow`.
- App display name: `Flow`.
- **Universal** (`TARGETED_DEVICE_FAMILY = "1,2"`) — iPhone and iPad, now that the app has a real adaptive layout (sidebar nav + two-column Home at tablet/desktop widths).
- Portrait-only on iPhone; all four orientations on iPad (`UISupportedInterfaceOrientations~ipad`), since the adaptive layout works in either.
- `ITSAppUsesNonExemptEncryption = false` set in `Info.plist`, so App Store Connect won't ask the export-compliance question at every build.
- Ported the three web APIs that don't work the same way inside a native iOS WebView, each with an automatic fallback so the web/PWA build is unaffected:
  - Haptics (`navigator.vibrate`, unsupported on iOS) → `@capacitor/haptics`
  - Scheduled reminders (Notification Triggers API, Chrome-only) → `@capacitor/local-notifications`
  - CSV export (blob download, no download manager in a native WebView) → `@capacitor/filesystem` + `@capacitor/share` (opens the iOS share sheet)
  - Status bar style and splash screen use `@capacitor/status-bar` / `@capacitor/splash-screen`, following the app's light/dark theme.
  - Keyboard resize mode is `"native"`, so the tab bar and layout track the keyboard the same way they do on the web.
- App icon and launch screen generated from the hand-drawn "Flow" mark (`scripts/gen-icons.mjs`) — the full explicit iPhone **and** iPad size set (not the single-1024 "universal" format, which failed to render on a real device during testing), plus the no-alpha 1024×1024 App Store icon Apple's validator requires.

## 2. Bundle identifier — **[DONE]**, but only permanent once registered

`com.davidpit.flow` is set in `capacitor.config.ts` and the Xcode project, matching the personal Apple ID (`davidpit2008@gmail.com`) the Developer account will be enrolled under. It's still freely changeable **right now** (just a config value) — once you register it as an App ID in the Apple Developer portal, it becomes **permanent**: you cannot rename it later, only retire it and start over with a new one. Confirm it once more right before that step.

## 3. App name collision — **[DONE, decision made]**

"Flow" is a very common app name/word. The App Store *listing* title is set to **"Flow: Budget & Subscriptions"** (`ios/fastlane/metadata/en-US/name.txt`) to reduce collision and improve search ranking, while the on-device name stays the short **"Flow"** (`CFBundleDisplayName`) — standard practice (e.g. "Slack: Team Communication"). Change either independently in App Store Connect if you'd rather use something else.

## 4. Screenshots — **[DONE]**

Real screenshots (Home, Subscriptions, Insights, Add transaction) at the exact required pixel dimensions, rendered from the actual running app with realistic sample data, sit in `ios/fastlane/screenshots/en-US/`:
- `iphone_6.9/` — 1290×2796 (the mandatory iPhone size)
- `ipad_13/` — 2048×2732 (now that the app is Universal)

`fastlane deliver` picks these up automatically (`skip_screenshots` is now `false` in the Fastfile). If you'd rather use real device/simulator captures instead, just replace the files in those folders — same filenames, same dimensions.

## 5. Privacy policy & support page — **[DONE]**, one manual step needed

Both pages are written and published:
- Privacy policy: <https://claude.ai/code/artifact/28fab5e5-6faf-43b8-93ef-5f18b81479a5>
- Support / FAQ: <https://claude.ai/code/artifact/e250bc59-e7e9-4d41-a7b0-c4c094a13cf0>

Both URLs are already set in `ios/fastlane/metadata/en-US/privacy_url.txt` and `support_url.txt`.

**Important — do this before submitting:** these pages are private by default. Open each link, use the **Share** menu on the page, and make it public (or "anyone with the link") — otherwise Apple's reviewer hits a login wall and the app gets rejected. This takes 30 seconds per page but has to be done once, by you, since it's a sharing permission on your account.

If you'd rather host these on your own domain later, the source files are just static HTML — ask and I'll hand them over, then update the two `.txt` files above to match.

## 6. Apple Developer account (in progress)

1. Enroll at [developer.apple.com](https://developer.apple.com) — $99/year, individual or organization. **Worth knowing:** the App Store listing's public "Developer" byline is your *legal name* on an Individual account — it can only show a company name like "Actually Works" if you enroll as an **Organization**, which needs a D-U-N-S number (free, but can take 1-2 weeks to verify) and takes longer than the same-day Individual path. If showing "Actually Works" as the seller matters, start the D-U-N-S lookup/registration now, since it's the slow part.
2. In [App Store Connect](https://appstoreconnect.apple.com), create a new app record: platform iOS, name from step 3, primary language, bundle ID from step 2, SKU (any internal string, e.g. `flow-ios-001`).
3. Fill in `ios/fastlane/Appfile`'s two remaining placeholders (`itc_team_id`, `team_id`) — visible in the Developer portal and App Store Connect once you're enrolled. The Apple ID email is already filled in.

## 7. Build on a Mac

This repo can't produce a signed `.ipa` from this Linux environment — that step categorically requires Xcode, which only runs on macOS. Once your Developer account is active:

```bash
git clone <this repo> && cd fin-flow
bun install
bun run build
npx cap sync ios
open ios/App/App.xcodeproj
```

In Xcode: select the `App` target → *Signing & Capabilities* → check "Automatically manage signing" → pick your team (from step 6). Xcode will create the provisioning profile and certificate for you. Then either build/run on a real device or simulator via Xcode's Run button, or use the fastlane lanes below once the Appfile is filled in:

```bash
cd ios && bundle init && bundle add fastlane
bundle exec fastlane beta        # uploads a build to TestFlight
bundle exec fastlane screenshots # pushes the prepared screenshots to App Store Connect on their own
bundle exec fastlane metadata    # pushes the text metadata (name, description, keywords...) on its own
bundle exec fastlane release     # builds + uploads everything for App Store review (submit_for_review is off by default — flip it in the Fastfile once you're ready)
```

## 8. App Privacy ("nutrition label") questionnaire — App Store Connect

Under the app's "App Privacy" section in App Store Connect, answer: **"Data Not Collected."** This is accurate — Flow makes zero network requests and has no backend, so there is nothing to disclose beyond that.

## 9. Age rating questionnaire — App Store Connect

A personal finance tracker with no user-generated content, no chat, no gambling, and no mature content should land at **4+**. Answer the standard questionnaire honestly; nothing in this app should trigger a higher rating.

## 10. App Review notes

Worth adding a note for the reviewer in App Store Connect's "App Review Information": *"Flow stores all data locally on-device via IndexedDB/local storage; there is no account, login, or backend. No demo credentials are needed — all screens are reachable immediately after onboarding."*

## 11. Design: iOS 26 / 27

Apple's current design language (introduced as "Liquid Glass" with iOS 26) is a system-level rendering effect applied by the OS to native UIKit/SwiftUI chrome (navigation bars, tab bars, controls) — it isn't something a web view's HTML/CSS can literally reproduce pixel-for-pixel, since it depends on real-time compositor effects the OS applies to native surfaces. What this app has (verified with real screenshots, not just assumed from the CSS): a translucent, blurred bottom tab bar, full safe-area handling for the Dynamic Island and home indicator, adaptive light/dark theming, a real sidebar-based adaptive layout for iPad/desktop widths, and continuous-corner-style rounded sheets — all standards-based and aligned with the spirit of the current design language. iOS 27 has no public design documentation yet (unreleased as of this writing); nothing here is iOS-26-specific in a way that would need rework — it's all standard, forward-compatible CSS.

## What's genuinely done vs. what's left

**Done:** native shell (Universal, iPhone + iPad), all API bridges, icons/splash for both idioms, Info.plist/Xcode config, adaptive iPad/desktop layout, fastlane skeleton wired to real screenshots, App Store metadata text, a hosted privacy policy and support page, typecheck/build/full e2e suite (52/52) all green.

**Left, and why it can't be done here:** sections 6–7 need an Apple Developer account (in progress) and a Mac with Xcode (this environment is Linux and cannot run Xcode) — the actual build, signing, and submission button. Sections 8–10 are a few minutes of clicking through App Store Connect once the account and app record exist — all the answers are drafted above, nothing left to figure out. There is no way around needing the account and the Mac for the final steps; it's how Apple's platform works for every iOS app, regardless of what tooling built it.
