import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  saveMatchPick,
  picksFromMatches,
  loadPredictionState,
  mergeRemotePredictionState,
  subscribePrediction,
} from "../lib/predictions.js";
import { getNextMatch, isMatchStarted, loadSchedule } from "../lib/schedule.js";
import { syncMatchResults, subscribeEventResults, applyStoredResults } from "../lib/results.js";
import { subscribeEventLive } from "../lib/live.js";
import { saveTeamNumber } from "../lib/team.js";
import { loadTeamNames, formatTeamLabel } from "../lib/teams.js";
import { pickWinQuip, pickLossQuip, scoreTier } from "../lib/fun.js";
import { matchChanceLabel, matchChanceFromPick } from "../lib/chances.js";
import { believerRewardToast } from "../lib/rewards.js";
import MatchCard from "./MatchCard.jsx";
import NextMatchHero from "./NextMatchHero.jsx";
import TeamChangePanel from "./TeamChangePanel.jsx";
import TeamBadge from "./TeamBadge.jsx";
import { useToast } from "./Toast.jsx";

const API_POLL_MS = 20_000;

export default function PredictView({ user, session, profile, onChangeEvent, onProfile, onSessionUpdate }) {
  const [matches, setMatches] = useState(() =>
    session.matches.map((m) => ({
      ...m,
      submitted: m.submitted ?? false,
      resultRecorded: m.resultRecorded ?? false,
      rewarded: m.rewarded ?? false,
      correct: m.correct ?? null,
    }))
  );
  const [savingQual, setSavingQual] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [changingTeam, setChangingTeam] = useState(false);
  const [teamNames, setTeamNames] = useState(session.teamNames || {});
  const [believerPoints, setBelieverPoints] = useState(session.believerPoints ?? 0);
  const toast = useToast();
  const matchesRef = useRef(matches);
  matchesRef.current = matches;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names = await loadTeamNames(session.eventKey, matchesRef.current);
      if (cancelled) return;
      if (Object.keys(names).length > 0) {
        setTeamNames(names);
        onSessionUpdate?.((prev) => ({ ...prev, teamNames: names }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.eventKey, session.teamNumber, onSessionUpdate]);
  const syncingRef = useRef(false);
  const skipLiveRef = useRef(false);
  const liveVersionRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const applyRewards = useCallback(
    (newRewards) => {
      if (newRewards.length === 0) return;
      let totalPoints = 0;
      for (const reward of newRewards) {
        totalPoints += reward.points;
        toast(believerRewardToast(reward.qual, reward.points), "win");
      }
      setBelieverPoints((prev) => {
        const next = prev + totalPoints;
        onSessionUpdate?.((s) => ({ ...s, believerPoints: next }));
        return next;
      });
    },
    [onSessionUpdate, toast]
  );

  const refreshAll = useCallback(
    async (quiet = true) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        const outcome = await syncMatchResults(
          user.uid,
          session.eventKey,
          session.teamNumber,
          matchesRef.current
        );

        const state = await loadPredictionState(user.uid, session.eventKey);
        setBelieverPoints(state.believerPoints);
        onSessionUpdate?.((s) => ({ ...s, believerPoints: state.believerPoints }));
        const merged = mergeRemotePredictionState(outcome.matches, state);
        setSubmitCount(state.submitCount);

        const changed =
          outcome.changed ||
          merged.some((m, i) => {
            const prev = matchesRef.current[i];
            return (
              m.pick !== prev?.pick ||
              m.submitted !== prev?.submitted ||
              m.actual !== prev?.actual ||
              m.status !== prev?.status ||
              m.started !== prev?.started ||
              m.resultRecorded !== prev?.resultRecorded ||
              m.rewarded !== prev?.rewarded
            );
          });

        if (changed) {
          setMatches(merged);
          matchesRef.current = merged;
          setLastRefresh(new Date());
          applyRewards(outcome.newRewards);
        }
      } catch (err) {
        console.warn("refresh failed", err);
        if (!quiet) toast(err.message || "Could not refresh", "err");
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [user.uid, session.eventKey, session.teamNumber, applyRewards, toast]
  );

  const scheduleRefresh = useCallback(
    (quiet = true) => {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => refreshAll(quiet), 250);
    },
    [refreshAll]
  );

  useEffect(() => {
    refreshAll(true);

    const unsubLive = subscribeEventLive(session.eventKey, (data) => {
      if (!data?.version) return;
      if (liveVersionRef.current === null) {
        liveVersionRef.current = data.version;
        return;
      }
      if (data.version === liveVersionRef.current) return;
      liveVersionRef.current = data.version;
      if (skipLiveRef.current && data.lastUid === user.uid) {
        skipLiveRef.current = false;
        return;
      }
      scheduleRefresh(true);
    });

    const unsubResults = subscribeEventResults(session.eventKey, () => {
      scheduleRefresh(true);
    });

    const unsubPred = subscribePrediction(user.uid, session.eventKey, (data) => {
      if (!data) return;
      setSubmitCount(data.submitCount || 0);
      if (typeof data.believerPoints === "number") {
        setBelieverPoints(data.believerPoints);
        onSessionUpdate?.((s) => ({ ...s, believerPoints: data.believerPoints }));
      }
      setMatches((ms) => mergeRemotePredictionState(ms, data));
      scheduleRefresh(true);
    });

    const pollId = setInterval(() => refreshAll(true), API_POLL_MS);

    return () => {
      clearTimeout(refreshTimerRef.current);
      clearInterval(pollId);
      unsubLive();
      unsubResults();
      unsubPred();
    };
  }, [user.uid, session.eventKey, session.teamNumber, refreshAll, scheduleRefresh, onSessionUpdate]);

  const applyTeam = async (tn) => {
    if (tn === session.teamNumber) return;
    setChangingTeam(true);
    try {
      const saved = await saveTeamNumber(user.uid, tn);
      onProfile?.((p) => ({ ...p, teamNumber: saved.teamNumber, teamNickname: saved.teamNickname }));

      const { matches, source } = await loadSchedule(session.eventKey, tn);
      if (matches.length === 0) {
        toast(`No qualification matches found for team ${tn} at this event.`, "err");
        return;
      }

      const state = await loadPredictionState(user.uid, session.eventKey);
      const matchesWithState = applyStoredResults(matches, state).map((m) => ({
        ...m,
        submitted: m.submitted ?? false,
        resultRecorded: m.resultRecorded ?? false,
        rewarded: m.rewarded ?? false,
        correct: m.correct ?? null,
      }));

      const names = await loadTeamNames(session.eventKey, matchesWithState);
      setTeamNames(names);
      setBelieverPoints(state.believerPoints);

      setMatches(matchesWithState);
      matchesRef.current = matchesWithState;
      onSessionUpdate?.({
        ...session,
        teamNumber: tn,
        matches: matchesWithState,
        source,
        teamNames: names,
        believerPoints: state.believerPoints,
      });
      const label = saved.teamNickname || formatTeamLabel(names, tn);
      toast(`Now predicting for ${label}`, "ok");
      await refreshAll(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "Could not switch team", "err");
    } finally {
      setChangingTeam(false);
    }
  };

  const setPick = (qual, wantWin) => {
    const target = matchesRef.current.find((m) => m.qual === qual);
    if (target && isMatchStarted(target)) {
      toast("This match already started — predictions are locked.", "err");
      return;
    }
    setMatches((ms) =>
      ms.map((m) => {
        if (m.qual !== qual) return m;
        const next = m.pick === wantWin ? null : wantWin;
        if (next !== null) toast(wantWin ? pickWinQuip() : pickLossQuip(), wantWin ? "win" : "lose");
        return { ...m, pick: next, submitted: false };
      })
    );
  };

  const submitMatch = async (qual) => {
    const match = matches.find((m) => m.qual === qual);
    if (!match || (match.pick !== true && match.pick !== false)) {
      toast("Pick WIN or LOSS first", "err");
      return;
    }
    if (match.submitted) return;
    if (isMatchStarted(match)) {
      toast("This match already started — too late to submit.", "err");
      return;
    }

    setSavingQual(qual);
    try {
      const nextMatches = matches.map((m) => (m.qual === qual ? { ...m, submitted: true } : m));
      const picks = picksFromMatches(nextMatches);
      skipLiveRef.current = true;
      await saveMatchPick(user.uid, session.eventKey, session.teamNumber, picks, nextMatches, qual);
      setMatches(nextMatches);
      matchesRef.current = nextMatches;
      setSubmitCount((c) => c + 1);
      const chance = matchChanceFromPick(match.pick);
      const quip = match.pick ? pickWinQuip() : pickLossQuip();
      toast(`Q${qual} · ${matchChanceLabel(chance)} · ${quip}`, "ok");
      await refreshAll(true);
    } catch (err) {
      console.error(err);
      setMatches((ms) => ms.map((m) => (m.qual === qual ? { ...m, submitted: false } : m)));
      toast("Submit failed — check Firestore rules", "err");
    } finally {
      setSavingQual(null);
    }
  };

  const stats = useMemo(() => {
    let wins = 0, submitted = 0, correct = 0, graded = 0, believerWins = 0;
    for (const m of matches) {
      if (!m.submitted) continue;
      submitted++;
      if (m.pick === true) wins++;
      if (m.resultRecorded && m.correct === true) {
        graded++;
        correct++;
        if (m.rewarded) believerWins++;
      } else if (m.resultRecorded && m.correct === false) {
        graded++;
      }
    }
    return { total: matches.length, wins, submitted, correct, graded, believerWins };
  }, [matches]);

  const tier = useMemo(() => scoreTier(stats.correct, stats.graded), [stats.correct, stats.graded]);
  const nextMatch = useMemo(() => getNextMatch(matches), [matches]);

  const refreshLabel = syncing
    ? "refreshing…"
    : lastRefresh
      ? `live · updated ${lastRefresh.toLocaleTimeString()}`
      : "live · listening for updates";

  return (
    <>
      <div className="card summary-card">
        <div className="summary-head">
          <div>
            <div className="summary-head__title">
              <h2>{session.eventKey.toUpperCase()}</h2>
              <TeamBadge
                teamNumber={session.teamNumber}
                teamNames={teamNames}
                profileNickname={profile?.teamNickname}
              />
            </div>
            <p className="muted">
              {matches.length} qualification matches
              {session.source ? ` · schedule via ${session.source}` : ""}
              {" · "}
              {refreshLabel}
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onChangeEvent}>Change event</button>
        </div>

        <div className="stats">
          <div className="stat"><span className="stat__num">{stats.total}</span><span className="stat__lbl">Your quals</span></div>
          <div className="stat"><span className="stat__num">{stats.wins}</span><span className="stat__lbl">Predicted wins</span></div>
          <div className="stat"><span className="stat__num">{stats.submitted}</span><span className="stat__lbl">Submitted</span></div>
          <div className="stat stat--score">
            <span className="stat__num">{believerPoints}</span>
            <span className="stat__lbl">Believer pts</span>
          </div>
          {stats.graded > 0 && (
            <div className="stat stat--score">
              <span className="stat__num">{stats.correct}/{stats.graded}</span>
              <span className="stat__lbl">Believers right</span>
            </div>
          )}
        </div>

        {tier && (
          <div className="score-banner">
            <span className="score-banner__emoji">{tier.emoji}</span>
            <div>
              <strong>{tier.title}</strong>
              <p className="muted">{tier.line}</p>
            </div>
          </div>
        )}

        <div className="actions">
          <button className="btn btn--ghost" onClick={() => refreshAll(false)} disabled={syncing}>
            {syncing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>

        <TeamChangePanel
          teamNumber={session.teamNumber}
          onApply={applyTeam}
          loading={changingTeam}
        />
      </div>

      {nextMatch ? (
        <NextMatchHero
          match={nextMatch}
          me={session.teamNumber}
          teamNames={teamNames}
          onPick={setPick}
          onSubmit={submitMatch}
          saving={savingQual === nextMatch.qual}
        />
      ) : (
        <section className="card next-match next-match--done">
          <p className="next-match__eyebrow">All done</p>
          <h2 className="next-match__qual next-match__qual--done">Quals complete</h2>
          <p className="muted">Results refresh automatically when APIs or other players update.</p>
        </section>
      )}

      <div className="matches">
        {matches.map((m) => (
          <MatchCard
            key={m.qual}
            match={m}
            me={session.teamNumber}
            teamNames={teamNames}
            onPick={setPick}
            onSubmit={submitMatch}
            saving={savingQual === m.qual}
            isNext={nextMatch?.qual === m.qual}
          />
        ))}
      </div>
    </>
  );
}
