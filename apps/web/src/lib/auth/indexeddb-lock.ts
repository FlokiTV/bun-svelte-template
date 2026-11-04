/**
 * Cross-tab fallback for browsers without the Web Locks API.
 *
 * An IndexedDB readwrite transaction atomically claims a short-lived lease.
 * The lease is renewed while a request is active; a crashed tab leaves an
 * expiring record instead of indefinitely blocking sign-in.
 *
 * Only an owner nonce and lease expiration are stored, never auth tokens.
 */
const DB_NAME = "vibe-auth-coordination";
const STORE_NAME = "locks";
const LOCK_NAME = "vibe-auth-cookie";
const LEASE_MS = 30_000;
const RENEW_MS = 3_000;
const RETRY_MS = 125;

type Lease = {
  name: string;
  owner: string;
  expiresAt: number;
};

type LeaseAction = "acquire" | "renew" | "release";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is required for cross-tab authentication without Web Locks"),
    );
  }

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
    let blocked = false;
    request.onerror = () => reject(request.error ?? new Error("Unable to open auth lock DB"));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Auth lock DB upgrade is blocked"));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        // The rejected open request may still succeed after another tab closes.
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

/**
 * Each change is a single readwrite transaction, which IndexedDB serializes
 * across same-origin tabs. A former owner can never remove a successor's lease.
 */
function changeLease(db: IDBDatabase, owner: string, action: LeaseAction): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = db.transaction(STORE_NAME, "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    let changed = false;
    transaction.oncomplete = () => resolve(changed);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Auth lock transaction aborted"));

    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(LOCK_NAME);
    request.onsuccess = () => {
      const current = request.result as Lease | undefined;
      const now = Date.now();

      if (action === "acquire" && (!current || current.expiresAt <= now)) {
        store.put({ name: LOCK_NAME, owner, expiresAt: now + LEASE_MS } satisfies Lease);
        changed = true;
      } else if (action === "renew" && current?.owner === owner && current.expiresAt > now) {
        store.put({ ...current, expiresAt: now + LEASE_MS } satisfies Lease);
        changed = true;
      } else if (action === "release" && current?.owner === owner) {
        store.delete(LOCK_NAME);
        changed = true;
      }
    };
  });
}

export async function withIndexedDbCookieLock<T>(operation: () => Promise<T>): Promise<T> {
  const database = await openDatabase();
  const owner = crypto.randomUUID();
  let acquired = false;

  try {
    while (!acquired) {
      acquired = await changeLease(database, owner, "acquire");
      if (!acquired) {
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }

    let leaseLost = false;
    let renewal: Promise<void> | undefined;

    const heartbeat = setInterval(() => {
      if (renewal) return;
      renewal = changeLease(database, owner, "renew")
        .then((renewed) => {
          if (!renewed) leaseLost = true;
        })
        .catch(() => {
          leaseLost = true;
        })
        .finally(() => {
          renewal = undefined;
        });
    }, RENEW_MS);

    try {
      const result = await operation();
      if (renewal) await renewal;
      // A suspended tab must not silently accept a result after its lease expired.
      if (leaseLost || !(await changeLease(database, owner, "renew"))) {
        throw new Error("Cross-tab auth lock was lost during the request");
      }
      return result;
    } finally {
      clearInterval(heartbeat);
      if (renewal) await renewal;
    }
  } finally {
    try {
      if (acquired) await changeLease(database, owner, "release");
    } finally {
      database.close();
    }
  }
}
