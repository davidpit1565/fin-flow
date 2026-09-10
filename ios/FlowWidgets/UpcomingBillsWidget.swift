import SwiftUI
import WidgetKit

struct UpcomingBillsWidgetView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                WidgetIconBadge(systemName: "calendar")
                Text("Upcoming Bills")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            if snapshot.bills.isEmpty {
                Spacer(minLength: 0)
                Text("Nothing due soon")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
            } else {
                Spacer(minLength: 4)
                ForEach(Array(snapshot.bills.prefix(3).enumerated()), id: \.offset) { _, bill in
                    HStack(spacing: 10) {
                        ZStack {
                            Circle().fill((bill.overdue ? Color.red : FlowWidgetTheme.accent).opacity(0.16))
                            Text(bill.name.prefix(1).uppercased())
                                .font(.system(.footnote, design: .rounded, weight: .bold))
                                .foregroundStyle(bill.overdue ? .red : FlowWidgetTheme.accent)
                        }
                        .frame(width: 28, height: 28)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(bill.name)
                                .font(.subheadline.weight(.semibold))
                                .lineLimit(1)
                            Text(bill.dueLabel)
                                .font(.caption2)
                                .foregroundStyle(bill.overdue ? .red : .secondary)
                        }
                        Spacer()
                        Text(bill.amountLabel)
                            .font(.system(.footnote, design: .rounded, weight: .semibold))
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
    }
}

struct UpcomingBillsWidget: Widget {
    let kind = "UpcomingBillsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            UpcomingBillsWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Upcoming Bills")
        .description("Your next few subscription payments.")
        .supportedFamilies([.systemMedium])
    }
}
