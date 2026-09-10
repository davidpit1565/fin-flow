import SwiftUI
import WidgetKit

struct SpendingWidgetView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                WidgetIconBadge(systemName: "banknote.fill")
                Text("This Month")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            Text(snapshot.spentThisMonthLabel)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text("spent so far")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        // Plain `.background` rather than iOS 17's `containerBackground(for:.widget)`
        // so this compiles against a 16.2 deployment target too -- adopt
        // containerBackground instead if you raise the floor to iOS 17+.
        .background(Color(.systemBackground))
    }
}

struct SpendingWidget: Widget {
    let kind = "SpendingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            SpendingWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("This Month's Spending")
        .description("Total spent so far this month.")
        .supportedFamilies([.systemSmall])
    }
}
