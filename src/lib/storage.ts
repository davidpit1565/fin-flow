/** Minimal promise-based IndexedDB wrapper. All Flow data lives on-device. */

const DB_NAME = "flow-db";
const DB_VERSION = 1;

export const STORES = {
  transactions: "transactions",
  subscriptions: "subscriptions",
  categories: "categories",
  budgets: "budgets",
  settings: "settings",
  meta: "meta",
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const store = db.createObjectStore(STORES.transactions, { keyPath: "id" });
        store.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains(STORES.subscriptions)) {
        const store = db.createObjectStore(STORES.subscriptions, { keyPath: "id" });
        store.createIndex("nextPaymentDate", "nextPaymentDate");
      }
      if (!db.objectStoreNames.contains(STORES.categories)) {
        db.createObjectStore(STORES.categories, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.budgets)) {
        db.createObjectStore(STORES.budgets, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open local storage"));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDB();
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Storage error"));
      })
  );
}

function all<T>(store: string): Promise<T[]> {
  return tx(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

function put<T>(store: string, value: T): Promise<IDBValidKey> {
  return tx(store, "readwrite", (s) => s.put(value) as IDBRequest<IDBValidKey>);
}

function remove(store: string, key: string): Promise<undefined> {
  return tx(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
}

function clear(store: string): Promise<undefined> {
  return tx(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

export const storage = {
  getAll: all,
  put,
  remove,
  clear,
  get<T>(store: string, key: string): Promise<T | undefined> {
    return tx(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
  },
};

export async function loadAll<T>(store: string): Promise<T[]> {
  try {
    return await storage.getAll<T>(store);
  } catch {
    return [];
  }
}
