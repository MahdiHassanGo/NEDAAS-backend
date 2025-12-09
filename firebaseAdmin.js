// backend/firebaseAdmin.js
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("❌ Firebase Admin env vars missing");
  console.error("FIREBASE_PROJECT_ID:", FIREBASE_PROJECT_ID);
  console.error("FIREBASE_CLIENT_EMAIL:", FIREBASE_CLIENT_EMAIL);
} else if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Error initializing Firebase Admin:", err);
  }
} else {
  console.log("ℹ️ Firebase Admin already initialized");
}

export default admin;
