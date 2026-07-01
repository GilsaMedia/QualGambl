import { formatTeamLabel, getTeamName } from "../lib/teams.js";

export default function TeamBadge({ teamNumber, teamNames = {}, profileNickname }) {
  if (!teamNumber) return null;
  const nick =
    (profileNickname && profileNickname.trim()) ||
    getTeamName(teamNames, teamNumber) ||
    null;
  const label = nick || formatTeamLabel(teamNames, teamNumber);

  return (
    <span className="team-badge" title={`Team ${teamNumber}${nick ? ` · ${nick}` : ""}`}>
      <span className="team-badge__lbl">{nick ? "Predicting as" : "Team"}</span>
      <span className="team-badge__num">{label}</span>
    </span>
  );
}
