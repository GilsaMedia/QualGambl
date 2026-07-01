const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34'%3E%3Crect width='34' height='34' rx='17' fill='%232a323d'/%3E%3C/svg%3E";

export default function UserChip({ user, profile, believerPoints, onSignOut }) {
  return (
    <div className="user-chip">
      <img className="user-chip__avatar" alt="" src={user.photoURL || FALLBACK_AVATAR} />
      <div className="user-chip__meta">
        <span className="user-chip__name">{user.displayName || user.email || "Signed in"}</span>
        {profile.teamNumber ? (
          <span className="user-chip__team" title={`Team ${profile.teamNumber}`}>
            {profile.teamNickname || profile.teamNumber}
          </span>
        ) : null}
        {believerPoints > 0 ? (
          <span className="user-chip__points">🏅 {believerPoints} believer pts</span>
        ) : null}
      </div>
      <button className="btn btn--ghost btn--sm" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
