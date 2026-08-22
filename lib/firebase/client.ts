import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getFirebaseAdminApp(): App | null {
  if (app) {
    return app;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    console.log(`[Firebase] Admin SDK initialized for project: ${projectId}`);
    return app;
  } catch (error) {
    console.error("[Firebase] Initialization error:", error);
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  if (db) return db;
  const firebaseApp = getFirebaseAdminApp();
  if (!firebaseApp) return null;
  const firestore = getFirestore(firebaseApp);
  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Settings can only be applied once per process; safely ignore if already applied
  }
  db = firestore;
  return db;
}

export function getStorageBucket() {
  const firebaseApp = getFirebaseAdminApp();
  if (!firebaseApp) return null;
  try {
    return getStorage(firebaseApp).bucket();
  } catch {
    return null;
  }
}
