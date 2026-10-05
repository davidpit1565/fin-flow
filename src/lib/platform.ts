import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS/Android shell, false in a browser/PWA. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** True only for the native iOS shell specifically (not Android, not web) --
 *  for behavior that depends on an iOS-only native bridge, such as the
 *  native tab bar replacing the CSS one. */
export function isIOSNative(): boolean {
  return Capacitor.getPlatform() === "ios";
}
