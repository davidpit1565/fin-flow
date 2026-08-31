import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeftRight, BarChart3, Home as HomeIcon, Plus, RefreshCcw, Settings as SettingsIcon } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useApp } from "./store/AppContext";
import { authenticateWithBiometrics } from "./lib/appLock";
import { isNative } from "./lib/platform";
import { NavigationProvider, useNavigation, type AnyTab, type Route, type TabId } from "./store/Navigation";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Transactions } from "./screens/Transactions";
import { CategoryScreen } from "./screens/CategoryScreen";
import { TransactionDetail } from "./screens/TransactionDetail";
import { Subscriptions } from "./screens/Subscriptions";
import { SubscriptionDetail } from "./screens/SubscriptionDetail";
import { Insights } from "./screens/Insights";
import { Settings } from "./screens/Settings";
import { BudgetsScreen } from "./screens/BudgetsScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { PrivacyScreen, SupportScreen, TermsScreen } from "./screens/Legal";
import { AddTransactionSheet } from "./components/AddTransactionSheet";

function App() {
  const { ready, loadError, retryLoad, settings } = useApp();
  const { current, activeTab, navigate } = useNavigation();
  const [adding, setAdding] = useState(false);

  const isDark = useTheme(settings?.theme ?? "system");
  const currentKey = routeKey(current);
  const scrollRestoration = useScrollRestoration(currentKey);
  const settingsLoaded = ready && (settings?.onboarded ?? false);
  const { locked, unlock } = useAppLock(settings?.appLockEnabled ?? false, settingsLoaded);
  const privacyShielded = usePrivacyShield();

  // The native splash screen (Capacitor) stays up until the app's real UI is
  // ready to paint, so there's no flash of an empty view between the launch
  // image and the first screen.
  useEffect(() => {
    if (ready && isNative()) void SplashScreen.hide();
  }, [ready]);

  if (loadError) return <LoadErrorScreen onRetry={retryLoad} />;
  if (!ready) return <Splash />;
  if (!settings || !settings.onboarded) return <Onboarding />;
  if (locked) return <LockScreen onUnlock={unlock} />;

  const screen = (() => {
    switch (current.tab) {
      case "home":
        return current.name === "category" ? (
          <CategoryScreen categoryId={current.categoryId} />
        ) : (
          <Home onAdd={() => setAdding(true)} />
        );
      case "transactions":
        return current.name === "detail" ? (
          <TransactionDetail transactionId={current.transactionId} />
        ) : (
          <Transactions onAdd={() => setAdding(true)} />
        );
      case "subscriptions":
        return current.name === "detail" ? (
          <SubscriptionDetail subscriptionId={current.subscriptionId} />
        ) : (
          <Subscriptions />
        );
      case "insights":
        return <Insights />;
      case "settings":
        switch (current.name) {
          case "budgets":
            return <BudgetsScreen />;
          case "goals":
            return <GoalsScreen />;
          case "categories":
            return <CategoriesScreen />;
          case "privacy":
            return <PrivacyScreen />;
          case "terms":
            return <TermsScreen />;
          case "support":
            return <SupportScreen />;
          default:
            return <Settings />;
        }
    }
  })();

  return (
    <div className={`app-frame ${isDark ? "dark" : "light"}`}>
      <Sidebar
        activeTab={activeTab}
        onAdd={() => setAdding(true)}
        onTab={(tab) => navigate(tab, { tab, name: "root" })}
        onSettings={() => navigate("settings", { tab: "settings", name: "settings" })}
      />
      <div className="app-main">
        <main className="app-scroll" ref={scrollRestoration}>
          <div className="screen-anim" key={currentKey}>
            {screen}
          </div>
        </main>
        {activeTab !== "settings" && (
          <TabBar
            onAdd={() => setAdding(true)}
            onTab={(tab) => navigate(tab, { tab, name: "root" })}
          />
        )}
      </div>
      {adding && <AddTransactionSheet onClose={() => setAdding(false)} />}
      {privacyShielded && (
        <div className="privacy-shield">
          <FlowMark />
        </div>
      )}
    </div>
  );
}

function routeKey(route: Route): string {
  return JSON.stringify(route);
}

/**
 * Remembers each route's scroll offset and restores it when that route is
 * revisited, instead of always resetting to the top. `.app-scroll` is a
 * single persistent DOM node (the route's content swaps underneath it), so
 * without this a list's scroll position would otherwise be lost the moment
 * you open a detail screen and come back.
 */
function useScrollRestoration(key: string) {
  const elRef = useRef<HTMLElement | null>(null);
  const positions = useRef<Map<string, number>>(new Map());
  const activeKey = useRef(key);

  // Runs synchronously after the new route's content is in the DOM but
  // before paint, so the restored offset is applied before the user sees
  // anything — no flash of the wrong scroll position.
  useLayoutEffect(() => {
    activeKey.current = key;
    const el = elRef.current;
    if (el) el.scrollTop = positions.current.get(key) ?? 0;
  }, [key]);

  const onScroll = useCallback(() => {
    const el = elRef.current;
    if (el) positions.current.set(activeKey.current, el.scrollTop);
  }, []);

  // A ref callback (rather than an effect with `[]` deps) so the listener
  // attaches whenever the scroll node actually appears — e.g. once the
  // Splash/Onboarding screens give way to the real app — not only if it
  // already existed on the very first render.
  const attachRef = useCallback(
    (node: HTMLElement | null) => {
      if (elRef.current) elRef.current.removeEventListener("scroll", onScroll);
      elRef.current = node;
      if (node) {
        node.scrollTop = positions.current.get(activeKey.current) ?? 0;
        node.addEventListener("scroll", onScroll, { passive: true });
      }
    },
    [onScroll]
  );

  return attachRef;
}

function TabBar({ onAdd, onTab }: { onAdd: () => void; onTab: (tab: TabId) => void }) {
  const { activeTab, popToRoot } = useNavigation();
  return (
    <nav className="tabbar" aria-label="Main navigation">
      <div className="tabbar-inner">
        <button
          className={`tabbar-item ${activeTab === "home" ? "active" : ""}`}
          onClick={() => {
            if (activeTab === "home") popToRoot("home");
            else onTab("home");
          }}
        >
          <HomeIcon size={22} strokeWidth={activeTab === "home" ? 2.2 : 1.8} />
          <span>Home</span>
        </button>
        <button
          className={`tabbar-item ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => {
            if (activeTab === "transactions") popToRoot("transactions");
            else onTab("transactions");
          }}
        >
          <ArrowLeftRight size={22} strokeWidth={activeTab === "transactions" ? 2.2 : 1.8} />
          <span>Transactions</span>
        </button>
        <div className="tabbar-add-wrap">
          <button className="tabbar-add" aria-label="Add transaction" onClick={onAdd}>
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>
        <button
          className={`tabbar-item ${activeTab === "subscriptions" ? "active" : ""}`}
          onClick={() => {
            if (activeTab === "subscriptions") popToRoot("subscriptions");
            else onTab("subscriptions");
          }}
        >
          <RefreshCcw size={22} strokeWidth={activeTab === "subscriptions" ? 2.2 : 1.8} />
          <span>Subscriptions</span>
        </button>
        <button
          className={`tabbar-item ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => {
            if (activeTab === "insights") popToRoot("insights");
            else onTab("insights");
          }}
        >
          <BarChart3 size={22} strokeWidth={activeTab === "insights" ? 2.2 : 1.8} />
          <span>Insights</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Persistent nav rail shown at tablet-portrait width and up (see the
 * `min-width: 768px` block in index.css), replacing the bottom TabBar.
 * Unlike the TabBar, this also carries Settings as a regular nav item --
 * on a wide screen there's room for it to be always-visible rather than a
 * screen you push into.
 */
function Sidebar({
  activeTab,
  onAdd,
  onTab,
  onSettings,
}: {
  activeTab: AnyTab;
  onAdd: () => void;
  onTab: (tab: TabId) => void;
  onSettings: () => void;
}) {
  const { popToRoot } = useNavigation();

  const items: { id: TabId; label: string; icon: typeof HomeIcon }[] = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "subscriptions", label: "Subscriptions", icon: RefreshCcw },
    { id: "insights", label: "Insights", icon: BarChart3 },
  ];

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-mark">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect width="64" height="64" rx="16" fill="var(--accent)" />
          <path
            d="M18 42 C 34 44, 42 34, 30 26 C 22 21, 26 14, 42 18"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="42.5" cy="18.5" r="6" fill="#ffffff" />
        </svg>
        <span>Flow</span>
      </div>

      <button className="sidebar-add" onClick={onAdd}>
        <Plus size={17} strokeWidth={2.4} /> Add transaction
      </button>

      <div className="sidebar-nav">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-item ${activeTab === id ? "active" : ""}`}
            onClick={() => {
              if (activeTab === id) popToRoot(id);
              else onTab(id);
            }}
          >
            <Icon size={19} strokeWidth={activeTab === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className={`sidebar-item ${activeTab === "settings" ? "active" : ""}`} onClick={onSettings}>
          <SettingsIcon size={19} strokeWidth={activeTab === "settings" ? 2.2 : 1.8} />
          Settings
        </button>
      </div>
    </nav>
  );
}

function Splash() {
  return (
    <div className="splash">
      <FlowMark />
    </div>
  );
}

/** Shown when the initial load from local storage fails outright -- e.g.
 *  Safari Private Browsing blocks IndexedDB entirely, or the database is
 *  corrupted. Without this, a failed load left the app stuck on the splash
 *  screen forever with no explanation and no way forward. */
function LoadErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="lock-screen">
      <FlowMark />
      <p className="lock-screen-title">Flow couldn't load your data</p>
      <p className="lock-screen-hint">
        This can happen in private browsing mode, or if your browser's storage is blocked. Try again, or switch to
        regular browsing mode.
      </p>
      <button className="btn btn-primary btn-lg" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function FlowMark() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <path
        d="M18 42 C 34 44, 42 34, 30 26 C 22 21, 26 14, 42 18"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42.5" cy="18.5" r="6" fill="#ffffff" />
    </svg>
  );
}

/** Locks the app behind Face ID/Touch ID (native only) once per cold start
 *  when app lock is enabled, and again every time the app returns from the
 *  background -- not when the setting is merely toggled on mid-session,
 *  since enabling it just required a successful Face ID check in Settings. */
function useAppLock(enabled: boolean, settingsLoaded: boolean): { locked: boolean; unlock: () => void } {
  const [locked, setLocked] = useState(false);
  const initializedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (settingsLoaded && !initializedRef.current) {
      initializedRef.current = true;
      if (isNative() && enabledRef.current) setLocked(true);
    }
  }, [settingsLoaded]);

  useEffect(() => {
    if (!isNative()) return undefined;
    let wasBackground = false;
    const handlePromise = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        wasBackground = true;
      } else if (wasBackground) {
        wasBackground = false;
        if (enabledRef.current) setLocked(true);
      }
    });
    return () => {
      void handlePromise.then((handle) => handle.remove());
    };
  }, []);

  const unlock = useCallback(() => setLocked(false), []);
  return { locked: enabled && locked, unlock };
}

/** Covers the screen the instant the app leaves the foreground (native only),
 *  independent of whether app lock is on. iOS snapshots whatever is on
 *  screen for the app-switcher card the moment the app backgrounds -- without
 *  this, real balances and transactions would sit in that snapshot in plain
 *  view, which would defeat the point of the Face ID lock at the one moment
 *  it matters most (and leaks data even for users who never turn lock on). */
function usePrivacyShield(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!isNative()) return undefined;
    const handlePromise = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      setHidden(!isActive);
    });
    return () => {
      void handlePromise.then((handle) => handle.remove());
    };
  }, []);
  return hidden;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = useCallback(async () => {
    setAuthenticating(true);
    setFailed(false);
    const ok = await authenticateWithBiometrics("Unlock Flow");
    setAuthenticating(false);
    if (ok) onUnlock();
    else setFailed(true);
  }, [onUnlock]);

  // Prompt automatically as soon as the lock screen appears, with a manual
  // fallback button for when the user dismisses it or it fails.
  useEffect(() => {
    void tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lock-screen">
      <FlowMark />
      <p className="lock-screen-title">Flow is locked</p>
      {failed && <p className="lock-screen-hint">Face ID didn't confirm it's you.</p>}
      <button className="btn btn-primary btn-lg" onClick={() => void tryUnlock()} disabled={authenticating}>
        {authenticating ? "Checking…" : "Unlock with Face ID"}
      </button>
    </div>
  );
}

/** Applies the resolved theme to <html> and returns whether dark. */
function useTheme(preference: "system" | "light" | "dark"): boolean {
  const [isDark, setIsDark] = useState(() => resolve(preference));
  useEffect(() => {
    const apply = () => {
      const dark = resolve(preference);
      setIsDark(dark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      if (isNative()) {
        void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      }
    };
    apply();
    if (preference === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [preference]);
  return isDark;
}

function resolve(preference: "system" | "light" | "dark"): boolean {
  if (preference === "light") return false;
  if (preference === "dark") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export default function AppRoot() {
  return (
    <NavigationProvider>
      <App />
    </NavigationProvider>
  );
}
