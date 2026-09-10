import ActivityKit
import SwiftUI
import WidgetKit

/// Dynamic Island + Lock Screen presentation for a subscription that's due
/// today. Started/updated/ended from the app via WidgetBridgePlugin -- see
/// BillDueAttributes in WidgetSharedModels.swift (shared with the app target).
struct BillDueLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BillDueAttributes.self) { context in
            LockScreenBillDueView(name: context.attributes.name, state: context.state)
                .activityBackgroundTint(Color(.systemBackground))
                .activitySystemActionForegroundColor(Color.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.attributes.name).font(.headline).lineLimit(1)
                    } icon: {
                        Image(systemName: "creditcard.fill").foregroundStyle(.orange)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.amountLabel)
                        .font(.system(.headline, design: .rounded, weight: .bold))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Due \(context.state.dueDateLabel)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "creditcard.fill").foregroundStyle(.orange)
            } compactTrailing: {
                Text(context.state.amountLabel)
                    .font(.system(.caption2, design: .rounded, weight: .semibold))
            } minimal: {
                Image(systemName: "creditcard.fill").foregroundStyle(.orange)
            }
        }
    }
}

private struct LockScreenBillDueView: View {
    let name: String
    let state: BillDueAttributes.ContentState

    var body: some View {
        HStack {
            Image(systemName: "creditcard.fill")
                .font(.title3)
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.headline)
                Text("Due \(state.dueDateLabel)").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text(state.amountLabel)
                .font(.system(.title3, design: .rounded, weight: .bold))
        }
        .padding()
    }
}
