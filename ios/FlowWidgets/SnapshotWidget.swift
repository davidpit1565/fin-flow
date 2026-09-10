import SwiftUI
import WidgetKit

struct SnapshotWidgetView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                WidgetIconBadge(systemName: "chart.bar.fill")
                Text("This Month")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            HStack(alignment: .top, spacing: 0) {
                column(icon: "arrow.down.circle.fill", tint: FlowWidgetTheme.accent, label: "Income", value: snapshot.incomeThisMonthLabel)
                Spacer(minLength: 8)
                column(icon: "arrow.up.circle.fill", tint: .orange, label: "Expenses", value: snapshot.expensesThisMonthLabel)
                Spacer(minLength: 8)
                column(icon: "dollarsign.circle.fill", tint: .blue, label: "Remaining", value: snapshot.remainingThisMonthLabel)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
    }

    private func column(icon: String, tint: Color, label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(.footnote, design: .rounded, weight: .bold))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SnapshotWidget: Widget {
    let kind = "SnapshotWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            SnapshotWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Financial Snapshot")
        .description("Income, expenses, and what's left this month.")
        .supportedFamilies([.systemMedium])
    }
}
