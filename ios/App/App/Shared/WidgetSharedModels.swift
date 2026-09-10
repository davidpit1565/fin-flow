import ActivityKit
import Foundation

/// Shared between the main app target (which writes this data from JS via
/// WidgetBridgePlugin) and the FlowWidgets extension (which only ever reads
/// it). Add this file to BOTH targets' membership in Xcode's File Inspector --
/// it is not compiled twice, just visible to both.
enum FlowAppGroup {
    static let id = "group.com.davidpit.flow.widgets"
    static let snapshotKey = "widgetSnapshot"
}

/// Everything the Home Screen and Lock Screen widgets render. Built and
/// formatted entirely in JS/TypeScript (currency symbols, locale, RTL-aware
/// number formatting all already live there) and handed over as pre-formatted
/// strings, so the widgets never need to duplicate that logic in Swift.
struct WidgetSnapshot: Codable {
    struct Bill: Codable {
        let name: String
        let amountLabel: String
        let dueLabel: String
        let overdue: Bool
    }

    let currencyCode: String
    let spentThisMonthLabel: String
    /// 0...100+ (over-budget renders past full). Nil when no overall budget is set.
    let budgetPercent: Double?
    let budgetLevel: String? // "ok" | "close" | "high" | "reached" | "over"
    let budgetRemainingLabel: String?
    /// Next few bills, soonest first, already localized and pre-sorted.
    let bills: [Bill]

    /// 0...100. Nil only when there's no basis to compute it at all (a
    /// brand new, empty install) -- see computeFinancialHealthScore in
    /// insights.ts, which this mirrors exactly rather than re-deriving.
    let healthScore: Double?
    let healthTier: String? // "needs attention" | "fair" | "good" | "excellent"

    let incomeThisMonthLabel: String
    let expensesThisMonthLabel: String
    let remainingThisMonthLabel: String

    /// The single most relevant in-progress savings goal, if any exist.
    let goalName: String?
    let goalProgressPercent: Double?
    let goalSavedLabel: String?
    let goalTargetLabel: String?

    let updatedAt: Double

    static func load() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: FlowAppGroup.id),
            let data = defaults.data(forKey: FlowAppGroup.snapshotKey)
        else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func placeholder() -> WidgetSnapshot {
        WidgetSnapshot(
            currencyCode: "USD",
            spentThisMonthLabel: "$0.00",
            budgetPercent: nil,
            budgetLevel: nil,
            budgetRemainingLabel: nil,
            bills: [],
            healthScore: nil,
            healthTier: nil,
            incomeThisMonthLabel: "$0.00",
            expensesThisMonthLabel: "$0.00",
            remainingThisMonthLabel: "$0.00",
            goalName: nil,
            goalProgressPercent: nil,
            goalSavedLabel: nil,
            goalTargetLabel: nil,
            updatedAt: Date().timeIntervalSince1970
        )
    }
}

/// Payload for a single "bill due today" Dynamic Island / Lock Screen Live
/// Activity. One activity per subscription id, started and ended from JS via
/// WidgetBridgePlugin as subscriptions become due or get paid.
struct BillDueActivityPayload: Codable {
    let id: String
    let name: String
    let amountLabel: String
    let dueDateLabel: String
}

/// ActivityKit needs this type visible to both the app (which starts/ends the
/// activity) and the widget extension (which renders it in the Dynamic Island
/// and on the Lock Screen). Live Activities require iOS 16.2+; the main app's
/// deployment target is 15.0, so every call site must guard with
/// `if #available(iOS 16.2, *)`.
@available(iOS 16.2, *)
struct BillDueAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var amountLabel: String
        var dueDateLabel: String
    }

    var name: String
}
