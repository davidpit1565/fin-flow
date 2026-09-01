import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { isNative } from "./platform";

/** Face ID / Touch ID app lock. Native only -- there is no way for a website
 *  to access biometric hardware the way a native app can, so this is a no-op
 *  everywhere else (checkBiometryAvailable() resolves false on web). */

export async function checkBiometryAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

// If the native biometric prompt never settles (observed: hangs indefinitely
// in the iOS Simulator when Face ID is enrolled but no matching/non-matching
// face is ever fed to it from the Features menu), the caller's "Checking..."
// state would never clear -- LockScreen disables its manual retry button
// while authenticating, so a hang leaves the user locked out of the app with
// no way back in. Racing a timeout guarantees this call always settles.
const AUTH_TIMEOUT_MS = 20_000;

function timeout<T>(ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(resolve, ms) as unknown as void).then(() => {
    throw new Error("Biometric authentication timed out");
  });
}

/** Prompts Face ID / Touch ID. Resolves true on success, false on any failure,
 *  cancellation, or timeout -- callers don't need to know which, and this
 *  call is guaranteed to settle within AUTH_TIMEOUT_MS even if the native
 *  side never calls back. */
export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Promise.race([BiometricAuth.authenticate({ reason, allowDeviceCredential: true }), timeout<void>(AUTH_TIMEOUT_MS)]);
    return true;
  } catch {
    return false;
  }
}
