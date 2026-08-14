import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type TabId = "home" | "transactions" | "subscriptions" | "insights";

export type Route =
  | { tab: TabId; name: "root" }
  | { tab: "home"; name: "category"; categoryId: string }
  | { tab: "transactions"; name: "detail"; transactionId: string }
  | { tab: "subscriptions"; name: "detail"; subscriptionId: string }
  | { tab: "settings"; name: "settings" }
  | { tab: "settings"; name: "budgets" }
  | { tab: "settings"; name: "categories" }
  | { tab: "settings"; name: "notifications" }
  | { tab: "settings"; name: "privacy" }
  | { tab: "settings"; name: "terms" }
  | { tab: "settings"; name: "support" };

export type AnyTab = TabId | "settings";

interface NavigationState {
  stacks: Record<AnyTab, Route[]>;
  activeTab: AnyTab;
  current: Route;
  navigate: (tab: AnyTab, route: Route) => void;
  push: (route: Route) => void;
  back: () => void;
  popToRoot: (tab: AnyTab) => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

function rootFor(tab: AnyTab): Route {
  if (tab === "settings") return { tab: "settings", name: "settings" };
  return { tab, name: "root" };
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const lastTabRef = useRef<AnyTab | null>(null);
  const [stacks, setStacks] = useState<Record<AnyTab, Route[]>>({
    home: [{ tab: "home", name: "root" }],
    transactions: [{ tab: "transactions", name: "root" }],
    subscriptions: [{ tab: "subscriptions", name: "root" }],
    insights: [{ tab: "insights", name: "root" }],
    settings: [{ tab: "settings", name: "settings" }],
  });
  const [activeTab, setActiveTab] = useState<AnyTab>("home");
  const activeTabRef = useRef<AnyTab>("home");
  const stacksRef = useRef(stacks);
  activeTabRef.current = activeTab;
  stacksRef.current = stacks;

  const push = useCallback((route: Route) => {
    if (route.tab !== activeTabRef.current) lastTabRef.current = activeTabRef.current;
    setStacks((prev) => {
      const tab = route.tab;
      const stack = prev[tab];
      // Avoid duplicates directly on top.
      const top = stack[stack.length - 1];
      if (top && JSON.stringify(top) === JSON.stringify(route)) return prev;
      return { ...prev, [tab]: [...stack, route] };
    });
    setActiveTab(route.tab);
  }, []);

  const navigate = useCallback((tab: AnyTab, route: Route) => {
    if (tab !== activeTabRef.current) lastTabRef.current = activeTabRef.current;
    setActiveTab(tab);
    setStacks((prev) => {
      const stack = prev[tab];
      const top = stack[stack.length - 1];
      if (top && JSON.stringify(top) === JSON.stringify(route)) return prev;
      return { ...prev, [tab]: [...stack, route] };
    });
  }, []);

  const back = useCallback(() => {
    const stack = stacksRef.current[activeTabRef.current];
    if (stack.length > 1) {
      setStacks((prev) => {
        const tab = activeTabRef.current;
        return { ...prev, [tab]: prev[tab].slice(0, -1) };
      });
      return;
    }
    if (activeTabRef.current === "settings" && lastTabRef.current) {
      const target = lastTabRef.current;
      lastTabRef.current = null;
      setActiveTab(target);
    }
  }, []);

  const popToRoot = useCallback((tab: AnyTab) => {
    setStacks((prev) => ({ ...prev, [tab]: [rootFor(tab)] }));
  }, []);

  const value = useMemo<NavigationState>(
    () => ({
      stacks,
      activeTab,
      current: stacks[activeTab][stacks[activeTab].length - 1],
      navigate,
      push,
      back,
      popToRoot,
    }),
    [stacks, activeTab, navigate, push, back, popToRoot]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationState {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
