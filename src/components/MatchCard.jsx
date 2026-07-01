import { computeDidWin, isMatchStarted, canSubmitPrediction } from "../lib/schedule.js";
import { correctQuip, wrongQuip } from "../lib/fun.js";
import MatchChance from "./MatchChance.jsx";
import TeamTags from "./TeamTags.jsx";

export default function MatchCard({ match, me, teamNames, onPick, onSubmit, saving = false, isNext = false }) {
  const didWin = computeDidWin(match);
  const hasPick = match.pick === true || match.pick === false;
  const started = isMatchStarted(match);
  const predictionsOpen = canSubmitPrediction(match);
  const canSubmit = hasPick && !match.submitted && !saving && predictionsOpen;
  const isDraft = hasPick && !match.submitted && predictionsOpen;
  const missedWindow = started && !match.submitted;

  let result = null;
  if (didWin !== null && match.submitted && hasPick) {
    const ok = match.pick === didWin;
    result = (
      <div className={`match__result ${ok ? "correct pop-in" : "wrong wobble"}`}>
        <span className="match__result-emoji">{ok ? "🎯" : "💥"}</span>
        {ok ? correctQuip(match.qual) : wrongQuip(match.qual)}
        <span className="match__result-detail">
          (Actual: {didWin ? "WIN" : "LOSS"})
        </span>
      </div>
    );
  } else if (didWin !== null) {
    result = <div className="match__result">Actual: {didWin ? "WIN" : "LOSS"}</div>;
  } else if (missedWindow) {
    result = <div className="match__result match__result--locked">Match started before you submitted a pick.</div>;
  }

  return (
    <div
      className={`match match--${match.alliance} ${hasPick ? "match--picked" : ""} ${match.submitted ? "match--submitted" : ""} ${missedWindow ? "match--locked" : ""} ${isNext ? "match--next" : ""}`}
    >
      <div>
        <div className="match__head">
          <span className="match__label">{match.label}</span>
          <span className={`pill pill--${match.alliance}`}>{match.alliance} alliance</span>
          {match.submitted && <span className="pill pill--submitted">Submitted ✓</span>}
          {isDraft && <span className="pill pill--draft">Draft</span>}
          {missedWindow && <span className="pill pill--locked">Predictions closed</span>}
          {match.resultRecorded && <span className="pill pill--final">Final</span>}
          {match.rewarded && match.correct && <span className="pill pill--reward">Believer 🏅</span>}
          {match.status && !match.resultRecorded && <span className="pill pill--status">{match.status}</span>}
        </div>
        <div className="alliances">
          <div className="alliance">
            <strong style={{ color: "var(--red)" }}>Red</strong>{" "}
            <span className="alliance__teams"><TeamTags teams={match.red} me={me} teamNames={teamNames} /></span>
          </div>
          <div className="alliance">
            <strong style={{ color: "var(--blue)" }}>Blue</strong>{" "}
            <span className="alliance__teams"><TeamTags teams={match.blue} me={me} teamNames={teamNames} /></span>
          </div>
        </div>
        {hasPick && predictionsOpen && <MatchChance match={match} />}
        {result}
      </div>
      <div className="pick-col">
        {predictionsOpen ? (
          <>
            <div className="pick">
              <button
                type="button"
                className={`pick__btn is-win ${match.pick === true ? "active" : ""}`}
                onClick={() => onPick(match.qual, true)}
              >
                WIN
              </button>
              <button
                type="button"
                className={`pick__btn is-lose ${match.pick === false ? "active" : ""}`}
                onClick={() => onPick(match.qual, false)}
              >
                LOSS
              </button>
            </div>
            <button
              type="button"
              className={`btn btn--sm match__submit ${match.submitted ? "btn--ghost match__submit--done" : "btn--primary"}`}
              onClick={() => onSubmit(match.qual)}
              disabled={!canSubmit}
            >
              {saving ? "Submitting…" : match.submitted ? "Locked in" : "Submit pick"}
            </button>
          </>
        ) : (
          <p className="match__closed muted">{match.submitted ? "Pick was locked in before start." : "Predictions closed — match started."}</p>
        )}
      </div>
    </div>
  );
}
