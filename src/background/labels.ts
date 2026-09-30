import type { LabeledShort } from "../shared/labels";

const DATABASE_NAME = "shorts-flagger";
const STORE_NAME = "labeled-shorts";

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise !== null) {
    return databasePromise;
  }

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "videoId" });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open label database"));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  databasePromise = opening;
  return opening;
}

export async function getLabel(videoId: string): Promise<LabeledShort | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(videoId);

    transaction.oncomplete = () => resolve((request.result as LabeledShort | undefined) ?? null);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not read label"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Label read was aborted"));
  });
}

export async function saveLabel(record: LabeledShort): Promise<LabeledShort> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);

    // A successful put request can still be rolled back. Confirm the transaction commit.
    transaction.oncomplete = () => resolve(record);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save label"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Label save was aborted"));
  });
}
