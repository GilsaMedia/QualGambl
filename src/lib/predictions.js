// Firestore prediction persistence: users/{uid}/predictions/{eventKey}
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase.js";
import { buildMatchChancesMap } from "./chances.js";
import { signalEventActivity } from "./live.js";
import { believerPointsFromResults } from "./rewards.js";

const ref = (uid, eventKey) => doc(db, "users", uid, "predictions", eventKey);

export function picksFromMatches(matches, submittedOnly = true) {
  const picks = {};
  for (const m of matches) {
    if (submittedOnly && !m.submitted) continue;
    if (m.pick === true || m.pick === false) picks[m.qual] = m.pick;
  }
  return picks;
}

export async function loadPredictionState(uid, eventKey) {
  try {
    const snap = await getDoc(ref(uid, eventKey));
    if (!snap.exists()) return { picks: {}, results: {}, submitCount: 0, believerPoints: 0 };
    const data = snap.data();
    const results = data.results || {};
    const believerPoints =
      typeof data.believerPoints === "number"
        ? data.believerPoints
        : believerPointsFromResults(results);
    return {
      picks: data.picks || {},
      results,
      submitCount: data.submitCount || 0,
      believerPoints,
    };
  } catch (err) {
    console.error("load prediction state failed", err);
    return { picks: {}, results: {}, submitCount: 0, believerPoints: 0 };
  }
}

export async function loadSavedPicks(uid, eventKey) {
  const state = await loadPredictionState(uid, eventKey);
  return state.picks;
}

export async function loadPredictionMeta(uid, eventKey) {
  const state = await loadPredictionState(uid, eventKey);
  return { submitCount: state.submitCount };
}

export function mergeRemotePredictionState(matches, { picks = {}, results = {} }) {
  return matches.map((m) => {
    const hasRemotePick = m.qual in picks;
    const hasLocalDraft = !m.submitted && (m.pick === true || m.pick === false);

    let pick = m.pick;
    let submitted = m.submitted ?? false;

    if (hasRemotePick) {
      pick = picks[m.qual];
      submitted = true;
    } else if (!hasLocalDraft) {
      submitted = false;
    }

    const next = { ...m, pick, submitted };

    const r = results[m.qual];
    if (r) {
      next.actual = r.actual;
      next.resultRecorded = true;
      next.rewarded = !!r.rewarded;
      next.correct = r.correct ?? null;
    }

    return next;
  });
}

export function subscribePrediction(uid, eventKey, onData) {
  return onSnapshot(
    ref(uid, eventKey),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => console.warn("prediction subscribe failed", err)
  );
}

export async function saveMatchPick(uid, eventKey, teamNumber, picks, matches, qual) {
  const matchChances = buildMatchChancesMap(matches);
  await setDoc(
    ref(uid, eventKey),
    {
      eventKey,
      teamNumber,
      picks,
      matchChances,
      submitCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await signalEventActivity(eventKey, { type: "prediction", qual, uid });
}

export async function saveMatchResults(uid, eventKey, results) {
  await setDoc(
    ref(uid, eventKey),
    { results, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
