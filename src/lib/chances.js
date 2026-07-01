// Per-match chance helpers — each qual is independent, never combined.

export function matchChanceFromPick(pick) {
  if (pick !== true && pick !== false) return null;
  return {
    pick,
    winPct: pick ? 100 : 0,
    lossPct: pick ? 0 : 100,
  };
}

export function buildMatchChancesMap(matches, submittedOnly = true) {
  const out = {};
  for (const m of matches) {
    if (submittedOnly && !m.submitted) continue;
    const chance = matchChanceFromPick(m.pick);
    if (chance) out[m.qual] = chance;
  }
  return out;
}

export function matchChanceLabel(chance) {
  if (!chance) return "";
  return chance.pick ? `${chance.winPct}% WIN` : `${chance.lossPct}% LOSS`;
}
