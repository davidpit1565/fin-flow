import Capacitor

/// Registers WidgetBridgePlugin -- a local Swift-only plugin (no separate npm
/// package or Objective-C bridge file) -- with the Capacitor bridge as soon as
/// it's ready. This is the officially documented way to add a local plugin:
/// https://capacitorjs.com/docs/plugins/creating-plugins#registering-swift-only-plugins
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
