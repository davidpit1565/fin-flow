import SwiftUI
import UIKit

/// Maps the small closed set of trailing actions the web app's screens
/// actually use (see src/components/ui.tsx's `ScreenHeaderAction`) to SF
/// Symbols. Kept as a plain dictionary rather than an enum since the value
/// crosses the JS bridge as a bare string.
private let trailingSymbols: [String: String] = [
    "settings": "gearshape.fill",
    "pencil": "pencil",
    "share": "square.and.arrow.up",
]

final class NativeHeaderModel: ObservableObject {
    @Published var title: String = ""
    @Published var showBack: Bool = false
    @Published var showChrome: Bool = false
    @Published var trailingIcon: String = "none"
    @Published var trailingDisabled: Bool = false
    var onBackTap: (() -> Void)?
    var onActionTap: (() -> Void)?
}

/// Mirrors `.screen-header-bar` (src/index.css): a full-width bar, flush
/// with the top edge (its glass background runs up behind the status bar),
/// transparent until `showChrome` -- matching the CSS `.scrolled` class,
/// which the same boolean drives on the web side. Unlike the tab bar this
/// has no fixed content: title text and the one trailing icon are supplied
/// by JS per screen (see src/lib/nativeHeader.ts).
struct NativeHeaderView: View {
    @ObservedObject var model: NativeHeaderModel

    var body: some View {
        HStack(spacing: 8) {
            if model.showBack {
                iconButton(systemName: "chevron.backward") {
                    model.onBackTap?()
                }
            }
            Text(model.title)
                .font(.system(size: 17, weight: .semibold))
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .opacity(model.showChrome ? 1 : 0)
            if let symbol = trailingSymbols[model.trailingIcon] {
                iconButton(systemName: symbol, disabled: model.trailingDisabled) {
                    model.onActionTap?()
                }
            } else {
                // Keeps the title truly centered whether or not a trailing
                // button exists -- without a same-size spacer on the other
                // side, the title drifts toward whichever side is empty.
                Color.clear.frame(width: 38, height: 38)
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 44)
        .background {
            Color.clear
                .adaptiveGlass(in: Rectangle())
                .opacity(model.showChrome ? 1 : 0)
                .ignoresSafeArea(edges: .top)
        }
        .animation(.easeInOut(duration: 0.2), value: model.showChrome)
    }

    @ViewBuilder
    private func iconButton(systemName: String, disabled: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(disabled ? Color.secondary.opacity(0.4) : Color.secondary)
                .frame(width: 38, height: 38)
                .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}

/// Owns the one native header bar instance and its placement over the
/// WKWebView, mirroring NativeTabBarController's shape exactly.
final class NativeHeaderController {
    static let shared = NativeHeaderController()

    weak var plugin: NativeHeaderPlugin?

    private let model = NativeHeaderModel()
    private var hostingController: UIHostingController<NativeHeaderView>?

    private init() {
        model.onBackTap = { [weak self] in
            self?.plugin?.notifyListeners("backTapped", data: [:])
        }
        model.onActionTap = { [weak self] in
            self?.plugin?.notifyListeners("actionTapped", data: [:])
        }
    }

    /// Pinned full-width to the top of the webview (see
    /// NativeTabBarController.attach's comment for why `webView` doubles as
    /// the attach point -- CAPBridgeViewController's `view` *is* the
    /// WKWebView). No bottom constraint: the view's own fixed 44pt content
    /// height plus its safe-area-ignoring background determine its size.
    func attach(to webView: UIView) {
        guard hostingController == nil else { return }
        let hosting = UIHostingController(rootView: NativeHeaderView(model: model))
        hosting.view.backgroundColor = .clear
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(hosting.view)
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: webView.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: webView.trailingAnchor),
            hosting.view.topAnchor.constraint(equalTo: webView.topAnchor),
        ])
        hostingController = hosting
    }

    func setHeader(title: String, showBack: Bool, showChrome: Bool, trailingIcon: String, trailingDisabled: Bool) {
        model.title = title
        model.showBack = showBack
        model.showChrome = showChrome
        model.trailingIcon = trailingIcon
        model.trailingDisabled = trailingDisabled
    }

    func setVisible(_ visible: Bool) {
        hostingController?.view.isHidden = !visible
    }
}
