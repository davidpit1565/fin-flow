import Capacitor

/// Registers the local Swift-only Capacitor plugins (no separate npm
/// package or Objective-C bridge file) as soon as the bridge is ready. This
/// is the officially documented way to add a local plugin:
/// https://capacitorjs.com/docs/plugins/creating-plugins#registering-swift-only-plugins
///
/// `capacitorDidLoad()` runs inside `loadView()`, right after Capacitor sets
/// `view = webView` -- so `self.view` here already *is* the WKWebView, which
/// is exactly what NativeTabBarController/NativeHeaderController attach
/// their SwiftUI overlays to.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(NativeTabBarPlugin())
        bridge?.registerPluginInstance(NativeHeaderPlugin())
        NativeTabBarController.shared.attach(to: self.view)
        NativeHeaderController.shared.attach(to: self.view)
    }
}
