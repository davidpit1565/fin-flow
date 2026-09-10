import SwiftUI
import WidgetKit

struct HealthScoreWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let snapshot: WidgetSnapshot

    private var fraction: Double {
        guard let score = snapshot.healthScore else { return 0 }
        return min(max(score / 100, 0), 1)
    }

    private var tierColor: Color { FlowWidgetTheme.levelColor(snapshot.healthTier) }

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: fraction) {
                Image(systemName: "waveform.path.ecg")
            } currentValueLabel: {
                Text(snapshot.healthScore.map { "\(Int($0.rounded()))" } ?? "--")
                    .font(.system(size: 11, weight: .semibold))
            }
            .gaugeStyle(.accessoryCircularCapacity)
        default:
            VStack(spacing: 8) {
                HStack(spacing: 6) {
                    WidgetIconBadge(systemName: "waveform.path.ecg", tint: tierColor)
                    Text("Health Score")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Spacer(minLength: 0)
                }
                Spacer(minLength: 0)
                ZStack {
                    Circle()
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 9)
                    Circle()
                        .trim(from: 0, to: fraction)
                        .stroke(tierColor, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text(snapshot.healthScore.map { "\(Int($0.rounded()))" } ?? "--")
                        .font(.system(.callout, design: .rounded, weight: .bold))
                }
                .frame(width: 60, height: 60)
                Text(snapshot.healthTier?.capitalized ?? "Not enough data")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
            .background(Color(.systemBackground))
        }
    }
}

struct HealthScoreWidget: Widget {
    let kind = "HealthScoreWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            HealthScoreWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Financial Health Score")
        .description("Your on-device financial health score, from savings rate, budget adherence, and subscription load.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
