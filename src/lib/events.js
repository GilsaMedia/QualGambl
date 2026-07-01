// Firestore event list: events/{eventKey} — admin-managed, read-only for users.
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

export async function loadEvents() {
  const snap = await getDocs(collection(db, "events"));
  const events = snap.docs
    .map((d) => {
      const data = d.data();
      const code = (data.code || d.id).trim().toLowerCase();
      return {
        code,
        name: (data.name || "").trim() || code.toUpperCase(),
        active: data.active !== false,
      };
    })
    .filter((e) => e.code && e.active)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return events;
}
