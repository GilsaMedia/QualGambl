import { computeDidWin, isMatchStarted, canSubmitPrediction } from "../lib/schedule.js";
import TeamTags from "./TeamTags.jsx";
import MatchChance from "./MatchChance.jsx";

export default function NextMatchHero({ match, me, teamNames, onPick, onSubmit, saving = false }) {
  const hasPick = match.pick === true || match.pick === false;
  const didWin = computeDidWin(match);
  const predictionsOpen = canSubmitPrediction(match);
  const queued = /queued|ready|on.?deck/i.test(match.status || "");
  const canSubmit = hasPick && !match.submitted && !saving && predictionsOpen;

  return (
    <section className={`next-match next-match--${match.alliance}`}>
      <div className="next-match__glow" aria-hidden />
      <p className="next-match__eyebrow">
        {queued ? "⏳ Up soon" : "Up next"}
        {match.submitted && <span className="pill pill--submitted">Submitted ✓</span>}
        {match.status && <span className="next-match__status">{match.status}</span>}
      </p>

      <div className="next-match__title">
        <span className="next-match__qual">Q{match.qual}</span>
        <span className={`next-match__alliance pill pill--${match.alliance}`}>
          {match.alliance} alliance
        </span>
      </div>

      <div className="next-match__alliances">
        <div className="next-match__side next-match__side--red">
          <span className="next-match__side-label">Red</span>
          <div className="next-match__teams">
            <TeamTags teams={match.red} me={me} teamNames={teamNames} />
          </div>
        </div>
        <span className="next-match__vs">vs</span>
        <div className="next-match__side next-match__side--blue">
          <span className="next-match__side-label">Blue</span>
          <div className="next-match__teams">
            <TeamTags teams={match.blue} me={me} teamNames={teamNames} />
          </div>
        </div>
      </div>

      {didWin !== null ? (
        <p className="next-match__done muted">Result in — check the match list below.</p>
      ) : match.submitted ? (
        <>
          <MatchChance match={match} large />
          <p className="next-match__picked">
            Locked in: <strong>{match.pick ? "WIN" : "LOSS"}</strong>
          </p>
        </>
      ) : predictionsOpen ? (
        <>
          {hasPick && <MatchChance match={match} large />}
          <div className="next-match__pick">
            <button
              type="button"
              className={`pick__btn pick__btn--lg is-win ${match.pick === true ? "active" : ""}`}
              onClick={() => onPick(match.qual, true)}
            >
              WIN
            </button>
            <button
              type="button"
              className={`pick__btn pick__btn--lg is-lose ${match.pick === false ? "active" : ""}`}
              onClick={() => onPick(match.qual, false)}
            >
              LOSS
            </button>
          </div>
          <button
            type="button"
            className="btn btn--primary next-match__submit"
            onClick={() => onSubmit(match.qual)}
            disabled={!canSubmit}
          >
            {saving ? "Submitting…" : "Submit this match"}
          </button>
          {hasPick && (
            <p className="next-match__picked muted">
              Draft: <strong>{match.pick ? "WIN" : "LOSS"}</strong> — submit before the match starts
            </p>
          )}
        </>
      ) : (
        <p className="next-match__done muted">This match has started — predictions are closed.</p>
      )}
    </section>
  );
}
