// ===========================================================================
// Schedule loading + grading — FRC Nexus first, The Blue Alliance fallback.
// Pure functions; no React, no DOM.
// ===========================================================================
import { API, resolveKey } from "../../api-config.js";

// --- device-local key/prefill storage (never uploaded to Firebase) ---------
export const LS_KEYS = {
  nexusKey: "qg_nexus_key",
  tbaKey: "qg_tba_key",
  lastEvent: "qg_last_event",
  lastTeam: "qg_last_team",
};
export const getLS = (k) => localStorage.getItem(k) || "";
export const setLS = (k, v) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));

// Effective keys: in-app (localStorage) value wins, else default in api-config.js
export const nexusKey = () => resolveKey("nexus", getLS(LS_KEYS.nexusKey));
export const tbaKey = () => resolveKey("tba", getLS(LS_KEYS.tbaKey));

// --- Nexus: GET {baseUrl}/event/{eventKey} ---------------------------------
export async function fetchNexusSchedule(eventKey, teamNumber, apiKey) {
  const res = await fetch(`${API.nexus.baseUrl}/event/${encodeURIComponent(eventKey)}`, {
    headers: { "Nexus-Api-Key": apiKey },
  });
  if (!res.ok) throw new Error(`Nexus API returned ${res.status}. Check your event code and API key.`);
  const data = await res.json();
  const team = String(teamNumber);
  const out = [];

  for (const m of data.matches || []) {
    const label = m.label || "";
    if (!/qual/i.test(label)) continue; // qualification matches only
    const red = (m.redTeams || []).map(String).filter(Boolean);
    const blue = (m.blueTeams || []).map(String).filter(Boolean);
    let alliance = null;
    if (red.includes(team)) alliance = "red";
    else if (blue.includes(team)) alliance = "blue";
    if (!alliance) continue;

    const qual = parseInt((label.match(/(\d+)/) || [])[1] || "0", 10);
    out.push({ qual, label, alliance, red, blue, status: m.status || "", pick: null, actual: null });
  }
  out.sort((a, b) => a.qual - b.qual);
  return out;
}

// --- The Blue Alliance API v3 ----------------------------------------------
// Docs: https://www.thebluealliance.com/apidocs  (spec: /swagger/api_v3.json)
// Auth: header  X-TBA-Auth-Key: <read key from thebluealliance.com/account>
// We use the team+event endpoint so we only pull this team's matches:
//   GET {baseUrl}/team/frc{n}/event/{eventKey}/matches/simple
export async function fetchTbaSchedule(eventKey, teamNumber, apiKey) {
  if (!apiKey) throw new Error("No Blue Alliance API key set (api-config.js or the “API keys” panel).");
  if (/^https?:\/\//i.test(apiKey.trim())) {
    throw new Error(
      "Your TBA key looks like a URL. Paste the READ API key (a ~64-char string) from thebluealliance.com/account — not a link."
    );
  }

  const teamKey = `frc${teamNumber}`;
  const res = await fetch(
    `${API.tba.baseUrl}/team/${teamKey}/event/${encodeURIComponent(eventKey)}/matches/simple`,
    { headers: { "X-TBA-Auth-Key": apiKey.trim() } }
  );
  if (res.status === 401)
    throw new Error("The Blue Alliance rejected the API key (401). Check your read key in api-config.js.");
  if (res.status === 404)
    throw new Error(`No Blue Alliance data for team ${teamNumber} at “${eventKey}” (404). Check the event code.`);
  if (!res.ok) throw new Error(`The Blue Alliance API returned ${res.status}.`);

  const data = await res.json();
  const out = [];

  for (const m of data) {
    if (m.comp_level !== "qm") continue; // qualification matches only
    const redKeys = m.alliances?.red?.team_keys || [];
    const blueKeys = m.alliances?.blue?.team_keys || [];
    let alliance = null;
    if (redKeys.includes(teamKey)) alliance = "red";
    else if (blueKeys.includes(teamKey)) alliance = "blue";
    if (!alliance) continue; // e.g. surrogate appearances

    // TBA uses score = -1 for an unplayed alliance; actual_time is null until played.
    const redScore = m.alliances?.red?.score ?? -1;
    const blueScore = m.alliances?.blue?.score ?? -1;
    const played = (redScore >= 0 && blueScore >= 0) || !!m.actual_time;
    const started = !!m.actual_time || played;

    // Winner: prefer TBA's winning_alliance, else derive from scores (handles ties).
    let actual = null;
    if (m.winning_alliance === "red" || m.winning_alliance === "blue") actual = m.winning_alliance;
    else if (played) actual = redScore > blueScore ? "red" : blueScore > redScore ? "blue" : "tie";

    out.push({
      qual: m.match_number,
      label: `Qualification ${m.match_number}`,
      alliance,
      red: redKeys.map((k) => k.replace("frc", "")),
      blue: blueKeys.map((k) => k.replace("frc", "")),
      redScore,
      blueScore,
      played,
      started,
      actual_time: m.actual_time || null,
      status: played ? "Played" : started ? "In progress" : "Scheduled",
      pick: null,
      actual,
    });
  }
  out.sort((a, b) => a.qual - b.qual);
  return out;
}

// --- try preferred source, then fall back ----------------------------------
export async function loadSchedule(eventKey, teamNumber, onProgress = () => {}) {
  const order = API.preferredSource === "tba" ? ["tba", "nexus"] : ["nexus", "tba"];
  let lastErr = null;

  for (const src of order) {
    try {
      if (src === "nexus" && nexusKey()) {
        return { matches: await fetchNexusSchedule(eventKey, teamNumber, nexusKey()), source: "Nexus" };
      }
      if (src === "tba" && tbaKey()) {
        return { matches: await fetchTbaSchedule(eventKey, teamNumber, tbaKey()), source: "The Blue Alliance" };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`${src} schedule fetch failed:`, err);
      onProgress(`${src === "nexus" ? "Nexus" : "The Blue Alliance"} unavailable — trying fallback…`);
    }
  }

  throw (
    lastErr ||
    new Error("No API key set. Add a Nexus or The Blue Alliance key in api-config.js, or under “API keys”.")
  );
}

// Did the team's alliance actually win? true/false, or null if not yet known.
export function computeDidWin(m) {
  if (m.actual === "red" || m.actual === "blue") return m.actual === m.alliance;
  if (m.actual === "tie") return false;
  return null;
}

export function isMatchPlayed(m) {
  if (m.played === true) return true;
  if (m.actual === "red" || m.actual === "blue" || m.actual === "tie") return true;
  if (/played|complete|finished/i.test(m.status || "")) return true;
  return false;
}

// True once the match is on field / in progress / has a start time (predictions locked).
export function isMatchStarted(m) {
  if (isMatchPlayed(m)) return true;
  if (m.started === true) return true;
  if (m.actual_time) return true;
  if (/on.?field|in.?progress|playing|running|underway|live/i.test(m.status || "")) return true;
  return false;
}

export function canSubmitPrediction(m) {
  return !isMatchStarted(m);
}

// Next upcoming qual: first match that has not started yet.
export function getNextMatch(matches) {
  const upcoming = matches.filter((m) => !isMatchStarted(m));
  if (upcoming.length === 0) return null;

  const live = upcoming.find((m) => /queued|ready|on.?deck/i.test(m.status || ""));
  return live || upcoming[0];
}
