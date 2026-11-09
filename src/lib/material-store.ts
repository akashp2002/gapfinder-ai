import type { StoredMaterial } from "@/lib/materials";
import type { QuizAttempt } from "@/lib/quiz";
import {
  DEFAULT_STUDY_SCHEDULE,
  type StudySchedulePreferences,
} from "@/lib/study-plan";

const DATABASE_NAME = "gapfinder-demo";
const STORE_NAME = "materials";
const ATTEMPT_STORE_NAME = "quiz-attempts";
const SETTINGS_STORE_NAME = "settings";
const DATABASE_VERSION = 3;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support local material storage."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ATTEMPT_STORE_NAME)) {
        database.createObjectStore(ATTEMPT_STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        database.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local material storage."));
    request.onblocked = () =>
      reject(new Error("Close other GapFinder tabs to finish updating local storage."));
  });
}

export async function listMaterials(): Promise<StoredMaterial[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll() as IDBRequest<StoredMaterial[]>;

    request.onsuccess = () => {
      resolve(
        request.result.sort(
          (left, right) =>
            new Date(right.uploadedAt).getTime() -
            new Date(left.uploadedAt).getTime(),
        ),
      );
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not load saved materials."));
  });
}

export async function saveMaterial(material: StoredMaterial): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(material);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save this material."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving this material was cancelled."));
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not delete this material."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Deleting this material was cancelled."));
  });
}

export async function listQuizAttempts(): Promise<QuizAttempt[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction(ATTEMPT_STORE_NAME, "readonly")
      .objectStore(ATTEMPT_STORE_NAME)
      .getAll() as IDBRequest<QuizAttempt[]>;

    request.onsuccess = () => {
      resolve(
        request.result.sort(
          (left, right) =>
            new Date(right.completedAt).getTime() -
            new Date(left.completedAt).getTime(),
        ),
      );
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not load previous quiz attempts."));
  });
}

export async function saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ATTEMPT_STORE_NAME, "readwrite");
    transaction.objectStore(ATTEMPT_STORE_NAME).put(attempt);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save this quiz attempt."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving this quiz attempt was cancelled."));
  });
}

export async function getStudySchedule(): Promise<StudySchedulePreferences> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction(SETTINGS_STORE_NAME, "readonly")
      .objectStore(SETTINGS_STORE_NAME)
      .get(DEFAULT_STUDY_SCHEDULE.id) as IDBRequest<
      StudySchedulePreferences | undefined
    >;

    request.onsuccess = () => resolve(request.result ?? DEFAULT_STUDY_SCHEDULE);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not load your study schedule."));
  });
}

export async function saveStudySchedule(
  schedule: StudySchedulePreferences,
): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SETTINGS_STORE_NAME, "readwrite");
    transaction.objectStore(SETTINGS_STORE_NAME).put(schedule);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save your study schedule."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving your study schedule was cancelled."));
  });
}
