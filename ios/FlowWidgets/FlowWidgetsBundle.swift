import SwiftUI
import WidgetKit

/// Entry point for the FlowWidgets extension target. Set this target's
/// deployment target to iOS 16.2+ in Xcode (Signing & Capabilities ->
/// Deployment Info) -- that's the floor for Lock Screen accessory widgets
/// and for the Live Activity below, and it means nothing in this target
/// needs `@available` guards.
@main
struct FlowWidgetsBundle: WidgetBundle {
    var body: some Widget {
        SpendingWidget()
        BudgetRingWidget()
        UpcomingBillsWidget()
        HealthScoreWidget()
        SnapshotWidget()
        GoalProgressWidget()
        BillDueLiveActivity()
    }
}
