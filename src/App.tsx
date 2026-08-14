import { useEffect, useState } from "react";
import { ArrowLeftRight, BarChart3, Home as HomeIcon, Plus, RefreshCcw } from "lucide-react";
import { useApp } from "./store/AppContext";
import { NavigationProvider, useNavigation, type Route, type TabId } from "./store/Navigation";
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
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { PrivacyScreen, SupportScreen, TermsScreen } from "./screens/Legal";
import { AddTransactionSheet } from "./components/AddTransactionSheet";

function App() {
  const { ready, settings } = useApp();
  const { current, activeTab, navigate } = useNavigation();
  const [adding, setAdding] = useState(false);

  const isDark = useTheme(settings?.theme ?? "system");

  if (!ready) return <Splash />;
  if (!settings || !settings.onboarded) return <Onboarding />;

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
      <main className="app-scroll" key={routeKey(current)}>
        <div className="screen-anim">{screen}</div>
      </main>
      {activeTab !== "settings" && (
        <TabBar
          onAdd={() => setAdding(true)}
          onTab={(tab) => navigate(tab, { tab, name: "root" })}
        />
      )}
      {adding && <AddTransactionSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function routeKey(route: Route): string {
  return JSON.stringify(route);
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

function Splash() {
  return (
    <div className="splash">
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
