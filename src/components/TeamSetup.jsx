import { useState } from "react";

export default function TeamSetup({ onSave, loading = false }) {
  const [team, setTeam] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const tn = parseInt(team, 10);
    if (tn > 0) onSave(tn);
  };

  return (
    <section className="card">
      <h2>Your team</h2>
      <p className="muted">
        Enter your FRC team number once — it&apos;s saved to your account and used for every event.
      </p>
      <form className="stack" onSubmit={submit}>
        <label>
          Team number
          <input
            type="number"
            required
            min={1}
            autoFocus
            placeholder="1943"
            value={team}
            disabled={loading}
            onChange={(e) => setTeam(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={loading || !team}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </section>
  );
}
