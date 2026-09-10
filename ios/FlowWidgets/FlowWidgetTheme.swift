import SwiftUI

/// Shared visual language for every widget in this extension, so they read
/// as one family instead of each looking like its own one-off experiment.
enum FlowWidgetTheme {
    /// The app's brand green, tuned to sit between its light (#0e8a5c) and
    /// dark (#34c98a) mode accent tokens so one value reads well on both a
    /// light and a dark widget background without needing a dynamic color.
    static let accent = Color(red: 0.13, green: 0.62, blue: 0.45)

    /// Maps a budget/health "level" string to a semantic color, shared by
    /// every ring/gauge widget instead of each re-declaring the same switch.
    static func levelColor(_ level: String?) -> Color {
        switch level {
        case "over", "reached", "needs attention": return .red
        case "high": return .orange
        case "close", "fair": return .yellow
        case "excellent": return accent
        default: return accent
        }
    }
}

/// A small colored circle with an SF Symbol centered in it -- the recurring
/// "icon badge" used at the top of every widget instead of a bare caption,
/// so each one reads as a distinct, deliberately designed card rather than
/// a plain box of text.
struct WidgetIconBadge: View {
    let systemName: String
    var tint: Color = FlowWidgetTheme.accent

    var body: some View {
        ZStack {
            Circle().fill(tint.opacity(0.16))
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(tint)
        }
        .frame(width: 24, height: 24)
    }
}

/// A compact progress bar (rounded capsule track + fill) used by the goal
/// and snapshot widgets -- deliberately not a ring, so a widget with two
/// or more values isn't just repeating BudgetRingWidget's shape.
struct WidgetProgressBar: View {
    /// 0...1
    let fraction: Double
    var tint: Color = FlowWidgetTheme.accent

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(tint.opacity(0.18))
                Capsule()
                    .fill(tint)
                    .frame(width: proxy.size.width * min(max(fraction, 0), 1))
            }
        }
        .frame(height: 6)
    }
}
