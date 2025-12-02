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
  apiKey: "AIzaSyDT2M0XwxAJxqrARFe3GVJKDds-IAwomMM",
  authDomain: "strategyboard-app.firebaseapp.com",
  projectId: "strategyboard-app",
  storageBucket: "strategyboard-app.firebasestorage.app",
  messagingSenderId: "297403143958",
  appId: "1:297403143958:web:c140044272f5e73dca6237",
  measurementId: "G-EMLW1J5N8X",
};

let db: Firestore | null = null;

function getDb(): Firestore {
  if (!db) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function uploadMatch(match: Match): Promise<string> {
  const firestore = getDb();
  const shareCode = generateShareCode();
  const packet = match.getAsPacket();

  const packetWithoutId = [...packet];
  packetWithoutId[7] = null;

  // Convert to JSON string to avoid nested array issues with Firestore
  const dataString = JSON.stringify(packetWithoutId);

  await setDoc(doc(firestore, "matches", shareCode), {
    data: dataString,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    version: 1,
  });

  return shareCode;
}

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

  // Parse JSON string back to array
  const packet = JSON.parse(docData.data);
  return Match.fromPacket(packet);
}

export async function checkShareCode(shareCode: string): Promise<boolean> {
  const firestore = getDb();
  const normalizedCode = shareCode.trim().toUpperCase();

  if (normalizedCode.length !== 6) {
    return false;
  }

  const docSnap = await getDoc(doc(firestore, "matches", normalizedCode));
  return docSnap.exists();
}
