import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS/Android shell, false in a browser/PWA. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
