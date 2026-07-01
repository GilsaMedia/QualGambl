import { useCallback, useEffect, useRef, useState } from "react";
import { loadEvents } from "../lib/events.js";
import { loadSchedule, getLS, setLS, LS_KEYS } from "../lib/schedule.js";
import { loadPredictionState } from "../lib/predictions.js";
import { applyStoredResults } from "../lib/results.js";
import { getRememberedTeam, saveTeamNumber } from "../lib/team.js";
import { loadTeamNames } from "../lib/teams.js";
import TeamBadge from "./TeamBadge.jsx";
import TeamSetup from "./TeamSetup.jsx";

export default function SetupView({ user, profile, onProfile, onLoaded }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventKey, setEventKey] = useState("");
  const [team, setTeam] = useState(() => getRememberedTeam(profile) || 0);
  const [savingTeam, setSavingTeam] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: "", kind: "" });
  const loadRequestRef = useRef(0);

  useEffect(() => {
    const remembered = getRememberedTeam(profile);
    if (remembered) setTeam(remembered);
  }, [profile.teamNumber]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      setStatus({ msg: "", kind: "" });
      try {
        const list = await loadEvents();
        if (cancelled) return;
        setEvents(list);
        const last = getLS(LS_KEYS.lastEvent);
        const match = list.find((e) => e.code === last);
        setEventKey(match?.code || list[0]?.code || "");
        if (list.length === 0) {
          setStatus({
            msg: "No events are available yet. Ask an organizer to add events in Firebase.",
            kind: "err",
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus({ msg: err.message || "Failed to load events.", kind: "err" });
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEvent = useCallback(
    async (ek) => {
      const tn = getRememberedTeam(profile) || team;
      if (!ek || !tn) return;

      const req = ++loadRequestRef.current;
      setLoading(true);
      setStatus({ msg: "Loading matches…", kind: "" });
      setLS(LS_KEYS.lastEvent, ek);

      try {
        const { matches, source } = await loadSchedule(ek, tn, (m) => {
          if (req === loadRequestRef.current) setStatus({ msg: m, kind: "" });
        });
        if (req !== loadRequestRef.current) return;

        if (matches.length === 0) {
          setStatus({
            msg: `No qualification matches found for Team ${tn}. Contact an organizer if this looks wrong.`,
            kind: "err",
          });
          return;
        }

        const state = await loadPredictionState(user.uid, ek);
        const matchesWithState = applyStoredResults(matches, state);
        const teamNames = await loadTeamNames(ek, matchesWithState);
        const believerPoints = state.believerPoints;
        onLoaded({ eventKey: ek, teamNumber: tn, matches: matchesWithState, source, teamNames, believerPoints });
      } catch (err) {
        console.error(err);
        if (req === loadRequestRef.current) {
          setStatus({ msg: err.message || "Failed to load the schedule.", kind: "err" });
        }
      } finally {
        if (req === loadRequestRef.current) setLoading(false);
      }
    },
    [user.uid, profile, team, onLoaded]
  );

  useEffect(() => {
    if (eventsLoading || !eventKey || !team) return;
    loadEvent(eventKey);
  }, [eventKey, team, eventsLoading, loadEvent]);

  const handleTeamSetup = async (tn) => {
    setSavingTeam(true);
    try {
      const saved = await saveTeamNumber(user.uid, tn);
      onProfile((p) => ({ ...p, teamNumber: saved.teamNumber, teamNickname: saved.teamNickname }));
      setTeam(saved.teamNumber);
    } catch (err) {
      console.error(err);
      setStatus({ msg: err.message || "Could not save team.", kind: "err" });
    } finally {
      setSavingTeam(false);
    }
  };

  if (!team) {
    return <TeamSetup onSave={handleTeamSetup} loading={savingTeam} />;
  }

  const eventName = events.find((e) => e.code === eventKey)?.name;

  if (loading) {
    return (
      <section className="card setup-loading">
        <TeamBadge teamNumber={team} profileNickname={profile.teamNickname} />
        <h2>{eventName || "Opening event…"}</h2>
        <p className="muted">{status.msg || "Loading your qualification matches."}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="setup-head">
        <div>
          <h2>Choose an event</h2>
          <p className="muted">Matches load automatically when you pick an event.</p>
        </div>
        <TeamBadge teamNumber={team} profileNickname={profile.teamNickname} />
      </div>

      <label className="setup-event">
        Event
        <select
          value={eventKey}
          disabled={eventsLoading || events.length === 0}
          onChange={(e) => setEventKey(e.target.value)}
        >
          {eventsLoading ? (
            <option value="">Loading events…</option>
          ) : events.length === 0 ? (
            <option value="">No events available</option>
          ) : (
            events.map((ev) => (
              <option key={ev.code} value={ev.code}>
                {ev.name}
              </option>
            ))
          )}
        </select>
      </label>

      {status.msg && <p className={`status ${status.kind ? "status--" + status.kind : ""}`}>{status.msg}</p>}
    </section>
  );
}
