import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Firestore,
} from "firebase/firestore";
import { Match } from "./match";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "strategyboard-app.firebaseapp.com",
  projectId: "strategyboard-app",
  storageBucket: "strategyboard-app.firebasestorage.app",
  messagingSenderId: "297403143958",
  appId: "1:297403143958:web:c140044272f5e73dca6237",
  measurementId: "G-EMLW1J5N8X",
};

let db: Firestore | null = null;

/**
 * Retrieves a Firestore database instance.
 *
 * @returns The Firestore database instance for the initialized Firebase app.
 */
function getDb(): Firestore {
  if (!db) {
    if (!firebaseConfig.apiKey) {
      console.warn(
        "[Cloud] VITE_FIREBASE_API_KEY is not set. Firebase may not initialize correctly — check your .env or CI settings.",
      );
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

/**
 * Generates a random share code for collaborative access.
 *
 * @returns A randomly generated 6-character share code containing uppercase letters and digits.
 */
function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Uploads a match to Firestore and generates a shareable code.
 *
 * @param match - The Match object to upload
 * @returns A promise that resolves to a share code string for accessing the uploaded match
 * @throws Will throw an error if the Firestore operation fails
 */
export async function uploadMatch(match: Match): Promise<string> {
  const firestore = getDb();
  const shareCode = generateShareCode();
  const packet = match.getAsPacket();

  const packetWithoutId = [...packet];
  packetWithoutId[7] = null;

  const dataString = JSON.stringify(packetWithoutId);

  await setDoc(doc(firestore, "matches", shareCode), {
    data: dataString,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    version: 1,
  });

  return shareCode;
}

/**
 * Downloads a match from Firestore using a share code.
 *
 * @param shareCode - The 6-character share code to retrieve the match. Will be trimmed and converted to uppercase.
 * @returns A Promise that resolves to the Match object if found and valid, or null if the document doesn't exist.
 * @throws {Error} If the share code format is invalid (not exactly 6 characters after trimming).
 * @throws {Error} If the share code has expired based on the expiresAt timestamp.
 */
export async function downloadMatch(shareCode: string): Promise<Match | null> {
  const firestore = getDb();

  const normalizedCode = shareCode.trim().toUpperCase();

  if (normalizedCode.length !== 6) {
    throw new Error("Invalid share code format");
  }

  const docSnap = await getDoc(doc(firestore, "matches", normalizedCode));

  if (!docSnap.exists()) {
    return null;
  }

  const docData = docSnap.data();

  if (docData.expiresAt && Date.now() > docData.expiresAt) {
    throw new Error("This share code has expired");
  }

  const packet = JSON.parse(docData.data);
  return Match.fromPacket(packet);
}

/**
 * Checks if a given share code exists in the Firestore database.
 *
 * @param shareCode - The share code to be checked. It should be a string of exactly 6 characters.
 * @returns A promise that resolves to a boolean indicating whether the share code exists in the database.
 *          Returns false if the share code is not 6 characters long.
 */
export async function checkShareCode(shareCode: string): Promise<boolean> {
  const firestore = getDb();
  const normalizedCode = shareCode.trim().toUpperCase();

  if (normalizedCode.length !== 6) {
    return false;
  }

  const docSnap = await getDoc(doc(firestore, "matches", normalizedCode));
  return docSnap.exists();
}
