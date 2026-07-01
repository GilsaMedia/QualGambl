import { doc, setDoc, onSnapshot, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase.js";

const stateRef = (eventKey) => doc(db, "events", eventKey, "live", "state");

export async function signalEventActivity(eventKey, { type, qual, uid } = {}) {
  await setDoc(
    stateRef(eventKey),
    {
      version: increment(1),
      lastType: type || "update",
      lastQual: qual ?? null,
      lastUid: uid ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeEventLive(eventKey, onData) {
  return onSnapshot(
    stateRef(eventKey),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => console.warn("event live subscribe failed", err)
  );
}
