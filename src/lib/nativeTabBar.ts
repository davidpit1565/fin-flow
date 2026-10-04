import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { AnyTab } from "../store/Navigation";
import { isIOSNative } from "./platform";

/** The iOS-only native tab bar (see ios/App/App/NativeTabBarPlugin.swift and
 *  NativeTabBarView.swift) replaces the CSS `<TabBar>` pill so the real
 *  system Liquid Glass material (iOS 26's `.glassEffect()`) renders it,
 *  rather than a `backdrop-filter` approximation. JS stays the source of
 *  truth for *which* tab is active and whether the bar should show at all
 *  (hidden on the Settings stack, same as the old CSS bar) -- native only
 *  renders that state and reports taps back. */
interface NativeTabBarNativePlugin {
  setActiveTab(options: { tab: string }): Promise<void>;
  setVisible(options: { visible: boolean }): Promise<void>;
  addListener(eventName: "tabSelected", listenerFunc: (data: { tab: AnyTab }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "addTapped", listenerFunc: () => void): Promise<PluginListenerHandle>;
}

const NativeTabBar = registerPlugin<NativeTabBarNativePlugin>("NativeTabBar");

const noopHandle: PluginListenerHandle = { remove: () => Promise.resolve() };

/** Mirrors the active tab into the native bar's selected item. Guarded (like
 *  every function here) so every call site in App.tsx can call these
 *  unconditionally on any platform, matching the existing widgetBridge.ts
 *  convention of guarding inside the exported function rather than at each
 *  call site. */
export function setActiveNativeTab(tab: AnyTab): void {
  if (!isIOSNative()) return;
  void NativeTabBar.setActiveTab({ tab }).catch(() => {});
}

/** Shows/hides the native bar -- mirrors the old `activeTab !== "settings"`
 *  check that hid the CSS pill while a Settings sub-screen is open. */
export function setNativeTabBarVisible(visible: boolean): void {
  if (!isIOSNative()) return;
  void NativeTabBar.setVisible({ visible }).catch(() => {});
}

/** Fires when the user taps one of the four native tab buttons. Returns the
 *  unsubscribe handle the same way any other Capacitor listener does; a
 *  harmless no-op handle off iOS native, so callers never need to branch. */
export function onNativeTabSelected(callback: (tab: AnyTab) => void): Promise<PluginListenerHandle> {
  if (!isIOSNative()) return Promise.resolve(noopHandle);
  return NativeTabBar.addListener("tabSelected", (data) => callback(data.tab));
}

/** Fires when the user taps the native bar's center "+" button. */
export function onNativeAddTapped(callback: () => void): Promise<PluginListenerHandle> {
  if (!isIOSNative()) return Promise.resolve(noopHandle);
  return NativeTabBar.addListener("addTapped", callback);
}
