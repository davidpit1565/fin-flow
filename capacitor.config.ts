import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.davidpit.flow",
  appName: "Flow",
  webDir: "dist",
  backgroundColor: "#0e0f11",
  ios: {
    // "always" makes the native WKWebView reserve its own safe-area inset on
    // top of the app's own CSS -- this app already handles every safe area
    // itself via `env(safe-area-inset-*)` (see .tabbar, .sheet, .app-frame in
    // index.css) plus `viewport-fit=cover` in index.html, so "always" just
    // doubles up the bottom inset into a large dead gap of plain background
    // below the tab bar instead of the tab bar sitting flush with the real
    // screen edge. "never" lets the WebView render truly edge-to-edge and
    // leaves all inset handling to the CSS, which already does it correctly.
    contentInset: "never",
    backgroundColor: "#0e0f11",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0e0f11",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
    },
    // "native" resizes the actual WKWebView frame when the keyboard shows, so
    // the app's own 100vh/sticky-bottom layout (the tab bar included) shrinks
    // and repositions consistently -- "body" only toggled the <body> element's
    // height, which the app's fixed-height frame didn't follow, producing the
    // tab bar jump / bad-fit-to-screen symptom during e.g. Add subscription.
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
