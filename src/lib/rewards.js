import { doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase.js";
import { correctQuip } from "./fun.js";

export const BELIEVER_POINTS = 10;

export function believerRewardToast(qual, points) {
  return `🏅 Q${qual} believer reward +${points} · ${correctQuip(qual)}`;
}

export function believerPointsFromResults(results = {}) {
  let pts = 0;
  for (const r of Object.values(results)) {
    if (r.rewarded && r.correct) pts += BELIEVER_POINTS;
  }
  return pts;
}

export async function awardBelieverPoints(uid, eventKey, points) {
  await setDoc(
    doc(db, "users", uid, "predictions", eventKey),
    { believerPoints: increment(points), lastRewardAt: serverTimestamp() },
    { merge: true }
  );
}
