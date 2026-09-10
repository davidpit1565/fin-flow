import WidgetKit

/// Shared by every Home Screen/Lock Screen widget in this bundle -- they all
/// read the same `WidgetSnapshot` the app pushes into the App Group. There's
/// nothing to poll on a timer: the app calls `WidgetCenter.reloadAllTimelines()`
/// itself every time it writes a fresh snapshot, so a single, never-expiring
/// entry per reload is correct and cheapest on the widget budget.
struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .placeholder())
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load() ?? .placeholder()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load() ?? .placeholder())
        completion(Timeline(entries: [entry], policy: .never))
    }
}
