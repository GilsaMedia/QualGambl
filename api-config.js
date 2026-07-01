// ===========================================================================
// api-config.js  —  ALL external APIs in one place
// ===========================================================================
// This is the single file to edit when you want to add or change API keys and
// endpoints. Paste your keys into the `apiKey` fields below.
//
// Precedence for each key:
//   1. Whatever you type in the app (Load an event → API keys) — per device.
//   2. Otherwise, the `apiKey` value in THIS file — shared default for everyone.
// So you can hardcode a team key here, or leave "" and let each user enter it.
//
// SECURITY: Nexus/TBA keys are only read/used in the browser. If you deploy
// this publicly, anything you hardcode here is visible in the page source —
// for a public site, leave these "" and have users enter their own keys.
//
// (Firebase's own config lives in `firebase-config.js` — see that file.)
// ===========================================================================

export const API = {
  // --- FRC Nexus -----------------------------------------------------------
  // Live qualification match schedule + queue status.
  // Get a key: https://frc.nexus  →  account menu → API.
  nexus: {
    apiKey: "Ru0-7AvRDIwNw8-H0lQYV344GE4",                              // <-- paste your Nexus API key here
    baseUrl: "https://frc.nexus/api/v1",
  },

  // --- The Blue Alliance ---------------------------------------------------
  // Used as a schedule fallback AND to auto-grade predictions vs. real results.
  // Get a READ key: https://www.thebluealliance.com/account  →  "Read API Keys"
  // → add a description → "Add New Key". Paste the long generated KEY below —
  // NOT the URL. It looks like: X7f3...<~64 characters>...9aQ
  tba: {
    apiKey: "G570U6P7M7XLO3orCxLyrqY5gkNRc7S9juyFp7HDgy6QjXKOTXaexzHOTqDDiFoy",
    baseUrl: "https://www.thebluealliance.com/api/v3",
  },

  // Which source to try first for the schedule: "nexus" or "tba".
  // (If the first one has no key or fails, the other is tried automatically.)
  preferredSource: "nexus",
};

// Resolve the effective key: in-app value (localStorage) wins, else the value above.
export function resolveKey(service, localValue) {
  return (localValue && localValue.trim()) || API[service].apiKey || "";
}
