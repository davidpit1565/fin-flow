import SwiftUI
import WidgetKit

struct BudgetRingWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let snapshot: WidgetSnapshot

    private var fraction: Double {
        guard let percent = snapshot.budgetPercent else { return 0 }
        return min(Double(percent) / 100, 1.0)
    }

    private var ringColor: Color { FlowWidgetTheme.levelColor(snapshot.budgetLevel) }

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: fraction) {
                Image(systemName: "chart.pie.fill")
            } currentValueLabel: {
                Text(snapshot.budgetPercent.map { "\(min(Int($0.rounded()), 999))%" } ?? "--")
                    .font(.system(size: 11, weight: .semibold))
            }
            .gaugeStyle(.accessoryCircularCapacity)
        default:
            VStack(spacing: 8) {
                HStack(spacing: 6) {
                    WidgetIconBadge(systemName: "target", tint: ringColor)
                    Text("Budget")
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
                        .stroke(ringColor, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text(snapshot.budgetPercent.map { "\(Int($0.rounded()))%" } ?? "--")
                        .font(.system(.callout, design: .rounded, weight: .bold))
                }
                .frame(width: 60, height: 60)
                Text(snapshot.budgetRemainingLabel.map { "\($0) left" } ?? "No budget set")
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

struct BudgetRingWidget: Widget {
    let kind = "BudgetRingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            BudgetRingWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Budget Ring")
        .description("How close you are to your budget for this period.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}
