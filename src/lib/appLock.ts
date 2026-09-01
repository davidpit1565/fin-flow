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

/** Prompts Face ID / Touch ID. Resolves true on success, false on any failure
 *  or cancellation -- callers don't need to know which. */
export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await BiometricAuth.authenticate({ reason, allowDeviceCredential: true });
    return true;
  } catch {
    return false;
  }
}
