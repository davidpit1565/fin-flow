import SwiftUI
import UIKit

/// The four tabs the web `<TabBar>` in src/App.tsx renders, in the same
/// order, with SF Symbols standing in for the lucide-react icons it uses
/// (Home, ArrowLeftRight, RefreshCcw, BarChart3). Labels match
/// src/lib/i18n/en/appShell.ts's tabHome/tabTransactions/tabSubscriptions/
/// tabInsights verbatim -- this view has no i18n system of its own, and the
/// web app is English-only, so these are never translated either.
private let nativeTabs: [(id: String, label: String, systemImage: String)] = [
    ("home", "Home", "house.fill"),
    ("transactions", "Transactions", "arrow.left.arrow.right"),
    ("subscriptions", "Subscriptions", "arrow.triangle.2.circlepath"),
    ("insights", "Insights", "chart.bar.fill"),
]

final class NativeTabBarModel: ObservableObject {
    @Published var activeTab: String = "home"
    var onTabTap: ((String) -> Void)?
    var onAddTap: (() -> Void)?
}

/// Mirrors the CSS `.tabbar` pill's shape and layout (src/index.css):
/// a floating rounded-rect capsule inset from the screen edges, with a
/// circular accent-colored "+" button poking out above its top edge. The
/// one real difference from the CSS version is the material: `.glassEffect`
/// here is iOS 26's actual Liquid Glass API, not a `backdrop-filter`
/// approximation, on devices that support it -- see NativeGlass.swift's
/// `adaptiveGlass` for the pre-26 fallback, shared with the native header.
struct NativeTabBarView: View {
    @ObservedObject var model: NativeTabBarModel

    private let barShape = RoundedRectangle(cornerRadius: 28, style: .continuous)

    var body: some View {
        HStack(spacing: 2) {
            ForEach(nativeTabs, id: \.id) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(height: 56)
        .adaptiveGlass(in: barShape)
        .overlay(alignment: .top) {
            addButton
                .offset(y: -28)
        }
    }

    @ViewBuilder
    private func tabButton(_ tab: (id: String, label: String, systemImage: String)) -> some View {
        let isActive = model.activeTab == tab.id
        Button {
            model.onTabTap?(tab.id)
        } label: {
            VStack(spacing: 3) {
                Image(systemName: tab.systemImage)
                    .font(.system(size: 20, weight: isActive ? .semibold : .regular))
                Text(tab.label)
                    .font(.system(size: 10.5, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(isActive ? flowAccent : Color.secondary)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.label)
    }

    private var addButton: some View {
        Button {
            model.onAddTap?()
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(Color.white)
                .frame(width: 54, height: 54)
                .background(flowAccent, in: Circle())
                .shadow(color: flowAccent.opacity(0.3), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add transaction")
    }
}

/// Owns the one native tab bar instance and its placement over the
/// WKWebView. A singleton (rather than a plain property on
/// MainViewController) because NativeTabBarPlugin needs to reach it as soon
/// as JS calls `setActiveTab`/`setVisible`, which can race with
/// MainViewController's own setup -- `attach(to:)` is safe to call once
/// that view exists, independent of plugin load order.
final class NativeTabBarController {
    static let shared = NativeTabBarController()

    weak var plugin: NativeTabBarPlugin?

    private let model = NativeTabBarModel()
    private var hostingController: UIHostingController<NativeTabBarView>?

    private init() {
        model.onTabTap = { [weak self] tab in
            self?.plugin?.notifyListeners("tabSelected", data: ["tab": tab])
        }
        model.onAddTap = { [weak self] in
            self?.plugin?.notifyListeners("addTapped", data: [:])
        }
    }

    /// Adds the bar as a subview of `webView` itself -- CAPBridgeViewController
    /// sets `view = webView` (confirmed by reading Capacitor's own source,
    /// ios/App/App/Pods or node_modules/@capacitor/ios), so there is no
    /// separate container view to attach to; a WKWebView accepts ordinary
    /// UIKit subviews like any other UIView, and they composite above its
    /// web content, which is exactly the floating-overlay behavior the CSS
    /// `.tabbar` (`position: fixed`) already relied on. Matches the CSS
    /// pill's own geometry: 12pt side insets, a 16pt gap above the safe
    /// area (`--tabbar-float-gap`).
    func attach(to webView: UIView) {
        guard hostingController == nil else { return }
        let hosting = UIHostingController(rootView: NativeTabBarView(model: model))
        hosting.view.backgroundColor = .clear
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(hosting.view)
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: webView.leadingAnchor, constant: 12),
            hosting.view.trailingAnchor.constraint(equalTo: webView.trailingAnchor, constant: -12),
            hosting.view.bottomAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.bottomAnchor, constant: -16),
        ])
        hostingController = hosting
    }

    func setActiveTab(_ tab: String) {
        model.activeTab = tab
    }

    func setVisible(_ visible: Bool) {
        hostingController?.view.isHidden = !visible
    }
}
