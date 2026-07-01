import { API } from "../../api-config.js";
import { tbaKey } from "./schedule.js";

export function effectiveTbaKey() {
  const fromPrefs = tbaKey();
  if (fromPrefs && !/^https?:\/\//i.test(fromPrefs.trim())) return fromPrefs.trim();
  const fallback = (API.tba.apiKey || "").trim();
  if (fallback && !/^https?:\/\//i.test(fallback)) return fallback;
  return "";
}

export function normalizeTeamNumber(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^frc(\d+)$/i);
  return m ? m[1] : s.replace(/^frc/i, "");
}

export function getTeamName(teamNames, teamNumber) {
  const num = normalizeTeamNumber(teamNumber);
  const nick = teamNames?.[num];
  if (!nick || nick === num || /^Team \d+$/i.test(nick)) return null;
  return nick;
}

export function formatTeamLabel(teamNames, teamNumber) {
  const num = normalizeTeamNumber(teamNumber);
  return getTeamName(teamNames, num) || num;
}

function collectTeamNumbers(matches) {
  const nums = new Set();
  for (const m of matches || []) {
    for (const t of [...(m.red || []), ...(m.blue || [])]) {
      const num = normalizeTeamNumber(t);
      if (num) nums.add(num);
    }
  }
  return [...nums];
}

async function fetchTeamNicknames(teamNumbers, apiKey) {
  const map = {};
  const chunkSize = 8;
  for (let i = 0; i < teamNumbers.length; i += chunkSize) {
    const chunk = teamNumbers.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map(async (num) => {
        try {
          const nick = await fetchTeamNickname(num, apiKey);
          return [num, nick];
        } catch {
          return [num, null];
        }
      })
    );
    for (const [num, nick] of results) {
      if (nick) map[num] = nick;
    }
  }
  return map;
}

export async function fetchEventTeamNames(eventKey, apiKey) {
  const res = await fetch(
    `${API.tba.baseUrl}/event/${encodeURIComponent(eventKey)}/teams`,
    { headers: { "X-TBA-Auth-Key": apiKey.trim() } }
  );
  if (!res.ok) throw new Error(`TBA teams returned ${res.status}`);
  const data = await res.json();
  const map = {};
  for (const t of data) {
    const num = normalizeTeamNumber(t.team_number);
    const nick = (t.nickname || t.name || "").trim();
    if (num && nick) map[num] = nick;
  }
  return map;
}

export async function fetchTeamNickname(teamNumber, apiKey) {
  const num = normalizeTeamNumber(teamNumber);
  const res = await fetch(`${API.tba.baseUrl}/team/frc${num}`, {
    headers: { "X-TBA-Auth-Key": apiKey.trim() },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.nickname || data.name || "").trim() || null;
}

export async function loadTeamNames(eventKey, matches = null) {
  const key = effectiveTbaKey();
  if (!key) return {};

  let map = {};
  try {
    map = await fetchEventTeamNames(eventKey, key);
  } catch (err) {
    console.warn("event team names fetch failed", err);
  }

  const needed = collectTeamNumbers(matches);
  const missing = needed.filter((num) => !map[num]);
  if (missing.length > 0) {
    try {
      const extra = await fetchTeamNicknames(missing, key);
      map = { ...map, ...extra };
    } catch (err) {
      console.warn("per-team nickname fetch failed", err);
    }
  }

  return map;
}
