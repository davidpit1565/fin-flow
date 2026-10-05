import SwiftUI

/// Applies real Liquid Glass (`.glassEffect`, iOS 26+) where available, and
/// a `.ultraThinMaterial` card (iOS 15+, this app's actual deployment
/// target) everywhere else -- `.glassEffect` itself isn't available below
/// iOS 26, so this isn't a style preference, it's what keeps the app
/// building and running correctly on every OS version Flow still supports.
/// Shared by every native-chrome piece (tab bar, header, ...) so they all
/// fall back the same way.
struct AdaptiveGlass<S: Shape>: ViewModifier {
    let shape: S

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.glassEffect(.regular, in: shape)
        } else {
            content
                .background(.ultraThinMaterial, in: shape)
                .overlay(shape.stroke(Color.primary.opacity(0.12), lineWidth: 1))
                .shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: 4)
        }
    }
}

extension View {
    func adaptiveGlass<S: Shape>(in shape: S) -> some View {
        modifier(AdaptiveGlass(shape: shape))
    }
}

/// Flow's brand green, matching shareCard.ts's `ACCENT` constant exactly --
/// deliberately a fixed brand color rather than the user's chosen in-app
/// theme accent, since wiring the live theme color into native would need
/// its own JS<->native call none of this native-chrome work has made yet.
let flowAccent = Color(red: 0x34 / 255.0, green: 0xc9 / 255.0, blue: 0x8a / 255.0)
