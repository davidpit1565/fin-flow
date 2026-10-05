import Capacitor
import Foundation

/// Bridges the native bottom tab bar (see NativeTabBarView.swift, hooked up
/// in MainViewController.swift) to JS. JS stays the single source of truth
/// for which tab is active and whether the bar should be visible at all
/// (hidden on the Settings stack, same as the old CSS `.tabbar` pill) -- this
/// plugin only relays that state into the native view and reports taps back
/// out via `notifyListeners`, mirroring WidgetBridgePlugin.swift's shape.
@objc(NativeTabBarPlugin)
public class NativeTabBarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeTabBarPlugin"
    public let jsName = "NativeTabBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setActiveTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        NativeTabBarController.shared.plugin = self
    }

    @objc func setActiveTab(_ call: CAPPluginCall) {
        guard let tab = call.getString("tab") else {
            call.reject("Missing tab")
            return
        }
        DispatchQueue.main.async {
            NativeTabBarController.shared.setActiveTab(tab)
        }
        call.resolve()
    }

    @objc func setVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? true
        DispatchQueue.main.async {
            NativeTabBarController.shared.setVisible(visible)
        }
        call.resolve()
    }
}
