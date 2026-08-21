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
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
