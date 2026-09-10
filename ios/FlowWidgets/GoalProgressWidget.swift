import SwiftUI
import WidgetKit

struct GoalProgressWidgetView: View {
    let snapshot: WidgetSnapshot

    private var fraction: Double {
        guard let percent = snapshot.goalProgressPercent else { return 0 }
        return min(max(percent / 100, 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                WidgetIconBadge(systemName: "flag.checkered")
                Text("Savings Goal")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if let name = snapshot.goalName {
                Text(name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                WidgetProgressBar(fraction: fraction)
                HStack {
                    Text(snapshot.goalSavedLabel ?? "--")
                        .font(.system(.footnote, design: .rounded, weight: .bold))
                    Spacer()
                    Text(snapshot.goalProgressPercent.map { "\(Int($0.rounded()))%" } ?? "")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(snapshot.goalTargetLabel ?? "--")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Spacer(minLength: 0)
                Text("No savings goals yet")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
    }
}

struct GoalProgressWidget: Widget {
    let kind = "GoalProgressWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            GoalProgressWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Goal Progress")
        .description("How close you are to your most relevant savings goal.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
