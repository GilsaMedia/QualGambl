// Playful copy for picks and graded results — FRC-flavored, kept PG.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickSeeded = (arr, seed) => {
  const n = Number(seed) || 0;
  return arr[((n % arr.length) + arr.length) % arr.length];
};

const WIN_QUIPS = [
  "Optimism engaged!",
  "Full send. No notes.",
  "We're so back.",
  "COPR is shaking.",
  "Alliance captain energy.",
  "Scouting report: W.",
  "Driver practice paid off (in your head).",
  "That's a dub in the spreadsheet.",
];

const LOSS_QUIPS = [
  "Playing the long game…",
  "Defense meta respect.",
  "Honest pessimism unlocked.",
  "Sometimes you tap out.",
  "Saving hype for playoffs.",
  "Strategic sandbagging? Sure.",
  "Brownout on confidence.",
  "Pit crew said 'maybe next match.'",
];

const CORRECT_QUIPS = [
  "Called it! Scouting pays off.",
  "Nailed it — chief delphi approves.",
  "Your pit crew was right.",
  "That's a dub.",
  "Oracle mode activated.",
  "Bracket wizard behavior.",
  "You saw the climb coming.",
  "Prediction: secured.",
];

const WRONG_QUIPS = [
  "Robots had other plans.",
  "The refs of fate say no.",
  "Battery died on your prediction.",
  "Brownout moment.",
  "Alliance shuffled the deck.",
  "Defense happened.",
  "Auton didn't go as scripted.",
  "Foul on the forecast.",
];

export const pickWinQuip = () => pick(WIN_QUIPS);
export const pickLossQuip = () => pick(LOSS_QUIPS);
export const correctQuip = (seed) => pickSeeded(CORRECT_QUIPS, seed);
export const wrongQuip = (seed) => pickSeeded(WRONG_QUIPS, seed);

export function scoreTier(correct, graded) {
  if (graded === 0) return null;
  const pct = correct / graded;
  if (pct === 1) return { emoji: "🏆", title: "Perfect bracket", line: "You're basically Einstein with a wrench." };
  if (pct >= 0.8) return { emoji: "🔮", title: "Scout master", line: "Your pick list is scary accurate." };
  if (pct >= 0.6) return { emoji: "📋", title: "Solid pit chatter", line: "Most of your hot takes landed." };
  if (pct >= 0.4) return { emoji: "🎲", title: "RNG beats strategy", line: "Coin flip energy, but you tried." };
  if (pct > 0) return { emoji: "🔧", title: "Needs a pit reboot", line: "Check your scouting data twice." };
  return { emoji: "🙃", title: "Reverse oracle", line: "Impressively wrong — that's talent." };
}

