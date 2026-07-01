import { useEffect, useState } from "react";

export default function TeamChangePanel({ teamNumber, onApply, loading = false }) {
  const [input, setInput] = useState(String(teamNumber || ""));
  const [confirming, setConfirming] = useState(false);
  const dirty = parseInt(input, 10) !== teamNumber;

  useEffect(() => {
    setInput(String(teamNumber || ""));
    setConfirming(false);
  }, [teamNumber]);

  const apply = (e) => {
    e.preventDefault();
    const tn = parseInt(input, 10);
    if (!tn || tn < 1 || !dirty) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onApply(tn);
    setConfirming(false);
  };

  return (
    <details className="team-change">
      <summary>Switch prediction team</summary>
      <form className="team-change__form" onSubmit={apply}>
        <p className="hint">
          Your team is saved to your account. Only change this if you picked the wrong team by mistake.
        </p>
        <label>
          New team number
          <input
            type="number"
            min={1}
            value={input}
            disabled={loading}
            onChange={(e) => {
              setInput(e.target.value);
              setConfirming(false);
            }}
          />
        </label>
        <button
          type="submit"
          className={`btn btn--sm ${confirming ? "btn--primary" : "btn--ghost"}`}
          disabled={loading || !dirty || !input}
        >
          {loading ? "Switching…" : confirming ? "Confirm team change" : "Review change"}
        </button>
        {confirming && (
          <p className="team-change__warn">This reloads your matches for Team {input}.</p>
        )}
      </form>
    </details>
  );
}
