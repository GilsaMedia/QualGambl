import { matchChanceFromPick, matchChanceLabel } from "../lib/chances.js";

export default function MatchChance({ match, large = false }) {
  const chance = matchChanceFromPick(match.pick);
  if (!chance) return null;

  return (
    <div className={`match-chance ${large ? "match-chance--lg" : ""}`}>
      <div className="match-chance__head">
        <span className="match-chance__label">
          {match.submitted ? "Locked chance" : "Chance for this match only"}
        </span>
        <span className={`match-chance__value ${chance.pick ? "is-win" : "is-lose"}`}>
          {matchChanceLabel(chance)}
        </span>
      </div>
      <div className="chances-bar match-chance__bar" aria-hidden>
        <span className="chances-bar__win" style={{ width: `${chance.winPct}%` }} />
        <span className="chances-bar__loss" style={{ width: `${chance.lossPct}%` }} />
      </div>
      <p className="match-chance__note muted">Not combined with other quals</p>
    </div>
  );
}
