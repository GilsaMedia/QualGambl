import { formatTeamLabel, getTeamName, normalizeTeamNumber } from "../lib/teams.js";

export default function TeamTags({ teams, me, teamNames = {} }) {
  return teams.map((t) => {
    const num = normalizeTeamNumber(t);
    const nick = getTeamName(teamNames, num);
    const label = formatTeamLabel(teamNames, num);
    const isMe = num === normalizeTeamNumber(me);
    return (
      <span
        key={num}
        className={`team-tag ${isMe ? "team-tag--me" : ""}`}
        title={nick ? `Team ${num} · ${nick}` : `Team ${num}`}
      >
        {nick ? (
          <>
            <span className="team-tag__num">{num}</span>
            <span className="team-tag__nick">{nick}</span>
          </>
        ) : (
          label
        )}
      </span>
    );
  });
}
