import Capacitor

/// Registers WidgetBridgePlugin and NativeTabBarPlugin -- local Swift-only
/// plugins (no separate npm package or Objective-C bridge file) -- with the
/// Capacitor bridge as soon as it's ready. This is the officially documented
/// way to add a local plugin:
/// https://capacitorjs.com/docs/plugins/creating-plugins#registering-swift-only-plugins
///
/// `capacitorDidLoad()` runs inside `loadView()`, right after Capacitor sets
/// `view = webView` -- so `self.view` here already *is* the WKWebView, which
/// is exactly what NativeTabBarController attaches its SwiftUI overlay to.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(NativeTabBarPlugin())
        NativeTabBarController.shared.attach(to: self.view)
    }
}
