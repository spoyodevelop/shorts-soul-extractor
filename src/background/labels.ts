import { nextLabel, type LabeledShort } from "../shared/labels.ts";

const DATABASE_NAME = "shorts-flagger";
const STORE_NAME = "labeled-shorts";

let databasePromise: Promise<IDBDatabase> | null = null;

function withObservedAt(record: LabeledShort): LabeledShort {
  if (Number.isSafeInteger(record.observedAt) && record.observedAt > 0) {
    return record;
  }

  // Records saved before automatic observation used labeledAt as their first timestamp.
  return { ...record, observedAt: record.labeledAt };
}

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

    transaction.oncomplete = () => {
      const record = request.result as LabeledShort | undefined;
      resolve(record === undefined ? null : withObservedAt(record));
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not read label"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Label read was aborted"));
  });
}

export async function observeShort(videoId: string, observedAt: number): Promise<LabeledShort> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(videoId);
    let record: LabeledShort;

    request.onsuccess = () => {
      const existing = request.result as LabeledShort | undefined;
      if (existing !== undefined) {
        record = withObservedAt(existing);
        if (record !== existing) {
          store.put(record);
        }
        return;
      }

      record = { videoId, label: "unflag", observedAt, labeledAt: observedAt };
      store.put(record);
    };

    // Reading and inserting share one transaction so a revisit cannot overwrite Flag.
    transaction.oncomplete = () => resolve(record);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not record Short"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Short observation was aborted"));
  });
}

export async function toggleLabel(videoId: string, labeledAt: number): Promise<LabeledShort> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(videoId);
    let record: LabeledShort;

    request.onsuccess = () => {
      const existing = request.result as LabeledShort | undefined;
      const currentLabel = existing === undefined ? "unflag" : existing.label;
      const observedAt = existing === undefined ? labeledAt : withObservedAt(existing).observedAt;
      record = { videoId, label: nextLabel(currentLabel), observedAt, labeledAt };
      store.put(record);
    };

    // Read and write together so simultaneous tabs toggle the latest stored state.
    transaction.oncomplete = () => resolve(record);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save label"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Label save was aborted"));
  });
}
