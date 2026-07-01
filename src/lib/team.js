import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { getLS, setLS, LS_KEYS } from "./schedule.js";
import { fetchTeamNickname, effectiveTbaKey } from "./teams.js";

export function getRememberedTeam(profile) {
  const local = getLS(LS_KEYS.lastTeam);
  if (local) {
    const n = parseInt(local, 10);
    if (n > 0) return n;
  }
  if (profile?.teamNumber > 0) return profile.teamNumber;
  return "";
}

export async function saveTeamNumber(uid, teamNumber) {
  const tn = parseInt(teamNumber, 10);
  if (!tn || tn < 1) throw new Error("Enter a valid team number.");
  setLS(LS_KEYS.lastTeam, String(tn));

  let teamNickname = null;
  const key = effectiveTbaKey();
  if (key) {
    try {
      teamNickname = await fetchTeamNickname(tn, key);
    } catch {
      /* optional */
    }
  }

  await setDoc(
    doc(db, "users", uid),
    { teamNumber: tn, ...(teamNickname ? { teamNickname } : {}) },
    { merge: true }
  );
  return { teamNumber: tn, teamNickname };
}
