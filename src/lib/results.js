import { doc, setDoc, onSnapshot, serverTimestamp, collection } from "firebase/firestore";
import { db } from "../firebase.js";
import { fetchTbaSchedule, fetchNexusSchedule, tbaKey, nexusKey, computeDidWin, isMatchPlayed, isMatchStarted } from "./schedule.js";
import { saveMatchResults } from "./predictions.js";
import { awardBelieverPoints, BELIEVER_POINTS } from "./rewards.js";
import { signalEventActivity } from "./live.js";

export function buildResultsMap(matches) {
  const out = {};
  for (const m of matches) {
    if (!m.resultRecorded || m.actual == null) continue;
    out[m.qual] = {
      actual: m.actual,
      correct: m.correct ?? null,
      rewarded: !!m.rewarded,
    };
  }
  return out;
}

export function applyStoredResults(matches, { picks = {}, results = {} }) {
  return matches.map((m) => {
    const r = results[m.qual];
    const hasPick = m.qual in picks;
    const next = {
      ...m,
      pick: hasPick ? picks[m.qual] : m.pick,
      submitted: hasPick ? true : (m.submitted ?? false),
      resultRecorded: false,
      rewarded: false,
      correct: null,
    };
    if (r) {
      next.actual = r.actual;
      next.resultRecorded = true;
      next.rewarded = !!r.rewarded;
      next.correct = r.correct ?? null;
    }
    return next;
  });
}

export function mergeNexusStatus(matches, nexusMatches) {
  const byQual = new Map(nexusMatches.map((m) => [m.qual, m]));
  return matches.map((m) => {
    const nx = byQual.get(m.qual);
    if (!nx?.status) return m;
    return { ...m, status: nx.status };
  });
}

export function mergeTbaIntoMatches(matches, tbaMatches) {
  const byQual = new Map(tbaMatches.map((m) => [m.qual, m]));
  return matches.map((m) => {
    const tba = byQual.get(m.qual);
    if (!tba) return m;

    const next = {
      ...m,
      redScore: tba.redScore ?? m.redScore,
      blueScore: tba.blueScore ?? m.blueScore,
      actual_time: tba.actual_time ?? m.actual_time,
    };

    if (isMatchPlayed(tba)) {
      next.actual = tba.actual;
      next.status = tba.status || "Played";
      next.played = true;
      next.started = true;
    } else if (isMatchStarted(tba)) {
      next.status = tba.status || "In progress";
      next.started = true;
    }

    return next;
  });
}

function matchesChanged(before, after) {
  return after.some(
    (m, i) =>
      m.actual !== before[i]?.actual ||
      m.started !== before[i]?.started ||
      m.status !== before[i]?.status ||
      m.played !== before[i]?.played
  );
}

export function processEndedMatches(matches) {
  const newRewards = [];
  const newlyEnded = [];

  const next = matches.map((m) => {
    if (!isMatchPlayed(m) || m.resultRecorded) return m;

    newlyEnded.push(m.qual);
    const didWin = computeDidWin(m);
    const updated = { ...m, resultRecorded: true };

    if (m.submitted && didWin !== null && !m.rewarded) {
      updated.rewarded = true;
      updated.correct = m.pick === didWin;
      if (updated.correct) newRewards.push({ qual: m.qual, points: BELIEVER_POINTS });
    }

    return updated;
  });

  return { matches: next, newlyEnded, newRewards };
}

async function publishEventResults(eventKey, quals, matches) {
  const byQual = new Map(matches.map((m) => [m.qual, m]));
  await Promise.all(
    quals.map((qual) => {
      const m = byQual.get(qual);
      if (!m?.actual) return Promise.resolve();
      return setDoc(
        doc(db, "events", eventKey, "results", String(qual)),
        { actual: m.actual, gradedAt: serverTimestamp() },
        { merge: true }
      );
    })
  );
  if (quals.length > 0) {
    await signalEventActivity(eventKey, { type: "result", qual: quals[quals.length - 1] });
  }
}

export function subscribeEventResults(eventKey, onData) {
  return onSnapshot(
    collection(db, "events", eventKey, "results"),
    (snap) => onData(snap.docs.map((d) => ({ qual: Number(d.id), ...d.data() }))),
    (err) => console.warn("event results subscribe failed", err)
  );
}

export function applyEventResults(matches, eventResults) {
  const byQual = new Map(eventResults.map((r) => [r.qual, r]));
  return matches.map((m) => {
    const er = byQual.get(m.qual);
    if (!er?.actual) return m;
    return {
      ...m,
      actual: er.actual,
      played: true,
      started: true,
      status: m.status || "Played",
    };
  });
}

export async function syncMatchResults(uid, eventKey, teamNumber, matches) {
  let merged = matches;

  if (nexusKey()) {
    try {
      const nexusMatches = await fetchNexusSchedule(eventKey, teamNumber, nexusKey());
      merged = mergeNexusStatus(merged, nexusMatches);
    } catch (err) {
      console.warn("nexus status sync failed", err);
    }
  }

  if (!tbaKey()) {
    return { matches: merged, changed: matchesChanged(matches, merged), newRewards: [] };
  }

  const tbaMatches = await fetchTbaSchedule(eventKey, teamNumber, tbaKey());
  merged = mergeTbaIntoMatches(merged, tbaMatches);
  const { matches: processed, newlyEnded, newRewards } = processEndedMatches(merged);

  if (newlyEnded.length === 0) {
    return { matches: processed, changed: matchesChanged(matches, processed), newRewards: [] };
  }

  await saveMatchResults(uid, eventKey, buildResultsMap(processed));
  await publishEventResults(eventKey, newlyEnded, processed);

  for (const reward of newRewards) {
    await awardBelieverPoints(uid, eventKey, reward.points);
  }

  return { matches: processed, changed: true, newRewards };
}
