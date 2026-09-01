import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.davidpit.flow",
  appName: "Flow",
  webDir: "dist",
  backgroundColor: "#0e0f11",
  ios: {
    contentInset: "always",
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
