import ActivityKit
import Capacitor
import Foundation
import WidgetKit

/// Bridges the web app's data (which only ever exists inside the WKWebView's
/// IndexedDB) out to the FlowWidgets extension and to Dynamic Island/Lock
/// Screen Live Activities, neither of which can reach into the WebView.
///
/// JS calls `updateSnapshot` after any change to transactions/budgets/
/// subscriptions; this writes a small pre-formatted JSON blob into the
/// `group.com.davidpit.flow.widgets` App Group's shared UserDefaults and
/// asks WidgetKit to reload. `startBillDueActivity`/`endBillDueActivity`
/// manage one Live Activity per subscription id, keyed so a repeat call for
/// the same id updates it instead of creating a duplicate.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    // CAPBridgedPlugin requires these as `static` -- the bridge reads them
    // via `type(of: instance)` before/without needing an instance, so an
    // instance-level `let` here would silently fail to satisfy the protocol.
    public static let identifier = "WidgetBridgePlugin"
    public static let jsName = "WidgetBridge"
    public static let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBillDueActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endBillDueActivity", returnType: CAPPluginReturnPromise),
    ]

    @objc func updateSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("Missing json")
            return
        }
        // Round-trip through WidgetSnapshot rather than storing the raw
        // string, so a shape mismatch fails loudly here instead of silently
        // inside the widget extension later.
        guard (try? JSONDecoder().decode(WidgetSnapshot.self, from: data)) != nil else {
            call.reject("Malformed snapshot json")
            return
        }
        guard let defaults = UserDefaults(suiteName: FlowAppGroup.id) else {
            call.reject("App Group unavailable -- is the App Groups capability configured?")
            return
        }
        defaults.set(data, forKey: FlowAppGroup.snapshotKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    /// ActivityKit assigns each Activity its own system-generated id that has
    /// nothing to do with our subscription id, so a repeat call for the same
    /// subscription can't be matched by looking at `Activity.id` directly.
    /// This small App Group-shared map remembers subscriptionId -> system
    /// activityId, so `start` can update-in-place instead of duplicating, and
    /// `end` knows which live Activity to tear down.
    @available(iOS 16.2, *)
    private static func activityIdMap(_ defaults: UserDefaults) -> [String: String] {
        defaults.dictionary(forKey: "billDueActivityIds") as? [String: String] ?? [:]
    }

    @objc func startBillDueActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve() // Live Activities don't exist pre-16.2; treat as a silent no-op.
            return
        }
        guard let json = call.getString("json"), let data = json.data(using: .utf8),
            let payload = try? JSONDecoder().decode(BillDueActivityPayload.self, from: data)
        else {
            call.reject("Missing or malformed json")
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            // User has Live Activities disabled in iOS Settings -- not our error to report.
            call.resolve()
            return
        }
        guard let defaults = UserDefaults(suiteName: FlowAppGroup.id) else {
            call.reject("App Group unavailable -- is the App Groups capability configured?")
            return
        }
        let state = BillDueAttributes.ContentState(amountLabel: payload.amountLabel, dueDateLabel: payload.dueDateLabel)
        var idMap = Self.activityIdMap(defaults)
        if let existingActivityId = idMap[payload.id],
            let existing = Activity<BillDueAttributes>.activities.first(where: { $0.id == existingActivityId }) {
            Task { await existing.update(ActivityContent(state: state, staleDate: nil)) }
            call.resolve()
            return
        }
        do {
            let attributes = BillDueAttributes(name: payload.name)
            let activity = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil), pushType: nil)
            idMap[payload.id] = activity.id
            defaults.set(idMap, forKey: "billDueActivityIds")
            call.resolve()
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    @objc func endBillDueActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        guard let id = call.getString("id") else {
            call.reject("Missing id")
            return
        }
        guard let defaults = UserDefaults(suiteName: FlowAppGroup.id) else {
            call.resolve()
            return
        }
        var idMap = Self.activityIdMap(defaults)
        let activityId = idMap.removeValue(forKey: id)
        defaults.set(idMap, forKey: "billDueActivityIds")
        Task {
            for activity in Activity<BillDueAttributes>.activities where activity.id == activityId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        call.resolve()
    }
}
