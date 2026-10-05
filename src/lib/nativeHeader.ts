import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isIOSNative } from "./platform";

/** Matches the trailing-icon set NativeHeaderView.swift maps to SF Symbols. */
export type NativeHeaderTrailingIcon = "none" | "settings" | "pencil" | "share";

export interface NativeHeaderState {
  title: string;
  showBack: boolean;
  /** Mirrors `showSmallTitle` in ScreenHeader (src/components/ui.tsx): the
   *  glass background and title fade in together, exactly like the CSS
   *  `.screen-header-bar.scrolled` class they replace. */
  showChrome: boolean;
  trailingIcon: NativeHeaderTrailingIcon;
  trailingDisabled: boolean;
}

interface NativeHeaderNativePlugin {
  setHeader(options: NativeHeaderState): Promise<void>;
  setVisible(options: { visible: boolean }): Promise<void>;
  addListener(eventName: "backTapped", listenerFunc: () => void): Promise<PluginListenerHandle>;
  addListener(eventName: "actionTapped", listenerFunc: () => void): Promise<PluginListenerHandle>;
}

const NativeHeader = registerPlugin<NativeHeaderNativePlugin>("NativeHeader");
const noopHandle: PluginListenerHandle = { remove: () => Promise.resolve() };

/** Pushes the current screen's header content into the native bar. Guarded
 *  (like every function here) so call sites never need to branch on
 *  platform -- a no-op off iOS native. */
export function setNativeHeader(state: NativeHeaderState): void {
  if (!isIOSNative()) return;
  void NativeHeader.setHeader(state).catch(() => {});
}

/** Shows/hides the native header bar entirely -- used the same way as the
 *  tab bar's visibility flag, off during onboarding/splash/load-error. */
export function setNativeHeaderVisible(visible: boolean): void {
  if (!isIOSNative()) return;
  void NativeHeader.setVisible({ visible }).catch(() => {});
}

export function onNativeHeaderBack(callback: () => void): Promise<PluginListenerHandle> {
  if (!isIOSNative()) return Promise.resolve(noopHandle);
  return NativeHeader.addListener("backTapped", callback);
}

export function onNativeHeaderAction(callback: () => void): Promise<PluginListenerHandle> {
  if (!isIOSNative()) return Promise.resolve(noopHandle);
  return NativeHeader.addListener("actionTapped", callback);
}
