// Server-side Firebase Admin SDK initialization.
//
// Used by all /api routes for Firestore reads/writes (bypasses client-side
// security rules — server is trusted). Auth verification can use this too.
//
// To set up: in .env.local, set FIREBASE_SERVICE_ACCOUNT_JSON to the entire
// JSON content of a Firebase service account key (downloaded from
// Firebase Console → Project Settings → Service Accounts → Generate new
// private key). Single-line JSON (newlines escaped as \n inside private_key).

import { initializeApp, getApps, cert, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON. " +
        "Paste the full service-account-key.json content as a single-line value."
    );
  }
}

let app: App | null = null;
let _db: Firestore | null = null;

function ensureApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const serviceAccount = loadServiceAccount();
  app = initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount) }
      : { credential: applicationDefault() }
  );
  return app;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(ensureApp());
  return _db;
}

export { ensureApp as adminApp };
