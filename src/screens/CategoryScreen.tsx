import { useMemo } from "react";
import { useApp } from "../store/AppContext";
import { useNavigation } from "../store/Navigation";
import { ScreenHeader } from "../components/ui";
import { TransactionList } from "../components/TransactionList";

export function CategoryScreen({ categoryId }: { categoryId: string }) {
  const { categories, transactions, settings } = useApp();
  const { back, push } = useNavigation();

  const category = categories.find((c) => c.id === categoryId);
  const items = useMemo(
    () => transactions.filter((t) => t.categoryId === categoryId),
    [transactions, categoryId]
  );

  if (!settings || !category) return null;

  return (
    <div className="screen">
      <ScreenHeader title={category.name} subtitle={`${items.length} ${items.length === 1 ? "transaction" : "transactions"}`} onBack={back} />
      <TransactionList
        transactions={items}
        categories={categories}
        currency={settings.currency}
        onOpen={(id) => push({ tab: "transactions", name: "detail", transactionId: id })}
      />
    </div>
  );
}
