import Capacitor
import Foundation

/// Bridges the native per-screen header bar (see NativeHeaderView.swift,
/// hooked up in MainViewController.swift) to JS. Mirrors
/// NativeTabBarPlugin.swift's shape: JS stays the source of truth for the
/// header's content (title, whether a back button and the one trailing
/// icon button should show, whether the glass "scrolled" chrome should be
/// visible) and calls `setHeader` on every relevant change; native only
/// renders that state and reports taps back via `backTapped`/`actionTapped`.
@objc(NativeHeaderPlugin)
public class NativeHeaderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeHeaderPlugin"
    public let jsName = "NativeHeader"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setHeader", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        NativeHeaderController.shared.plugin = self
    }

    @objc func setHeader(_ call: CAPPluginCall) {
        guard let title = call.getString("title") else {
            call.reject("Missing title")
            return
        }
        let showBack = call.getBool("showBack") ?? false
        let showChrome = call.getBool("showChrome") ?? true
        let trailingIcon = call.getString("trailingIcon") ?? "none"
        let trailingDisabled = call.getBool("trailingDisabled") ?? false
        DispatchQueue.main.async {
            NativeHeaderController.shared.setHeader(
                title: title,
                showBack: showBack,
                showChrome: showChrome,
                trailingIcon: trailingIcon,
                trailingDisabled: trailingDisabled
            )
        }
        call.resolve()
    }

    @objc func setVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? true
        DispatchQueue.main.async {
            NativeHeaderController.shared.setVisible(visible)
        }
        call.resolve()
    }
}
