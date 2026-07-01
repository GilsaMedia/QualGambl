# 🎲 QualGambl

A prediction web app for FRC teams: load an event by its **FRC Nexus event code**,
see every qualification match your team plays, and predict **WIN / LOSS** for each
one. Logins and predictions are saved to **Firebase** (Auth + Firestore). Optionally
auto-grade your picks against real results from The Blue Alliance.

Built with **React + Vite**.

**🌐 Live site: https://gilsamedia.github.io/QualGambl/**

## Files

| Path | Purpose |
|------|---------|
| `index.html` | Vite entry (`#root` + `/src/main.jsx`) |
| `src/main.jsx` | React root |
| `src/App.jsx` | Auth state, profile, view switching |
| `src/firebase.js` | Initializes Firebase (auth + Firestore) |
| `src/components/` | `AuthView`, `SetupView`, `PredictView`, `MatchCard`, `UserChip`, `Toast` |
| `src/lib/schedule.js` | Nexus/TBA schedule fetch + grading logic |
| `src/lib/predictions.js` | Firestore load/save of predictions |
| `src/lib/events.js` | Load admin-managed event list from Firestore |
| `src/index.css` | Styling (dark, FRC red/blue theme) |
| **`firebase-config.js`** | **Your** Firebase project config (already filled in) |
| **`api-config.js`** | **All external API keys/endpoints** (Nexus, TBA) in one place |
| `firestore.rules` | Security rules — each user can only touch their own data |

> `firebase-config.js` and `api-config.js` stay at the project root (imported by the
> React code) so there's always one obvious place to edit keys.

## Setup

### 1. Firebase project
Your config is already in `firebase-config.js` (project `qualgamble`). In the
[Firebase console](https://console.firebase.google.com/) for that project:

1. **Authentication → Sign-in method** → enable **Google** and **Email/Password**.
2. **Firestore Database → Create database** (production mode is fine).
3. **Firestore → Rules** → paste the contents of `firestore.rules` → **Publish**.
4. **Firestore → Data** → start collection **`events`** and add one document per event.
   Use the Nexus event code as the **document ID** (e.g. `2024casf`). Optional fields:
   `name` (friendly label shown in the app) and `active` (`false` hides an event).
   Users can only **read** events — they cannot add or edit them in the app.
5. **Authentication → Settings → Authorized domains** → add the domain you'll host
   on (`localhost` is already allowed for local testing).

### 2. Event data keys (Nexus + The Blue Alliance)
There are two ways to provide these — pick whichever suits you:

- **`api-config.js`** — paste keys into the `apiKey` fields. This is the one place
  to add every external API; it applies to everyone using the deploy.
- **In-app fields** (**Load an event → API keys**) — stored only in this browser's
  `localStorage`, never uploaded to Firebase. Overrides the file value per-device.

The keys themselves:

- **FRC Nexus API key** — from your account at <https://frc.nexus>. Used to pull the
  live qualification schedule.
- **The Blue Alliance key** — from <https://www.thebluealliance.com/account>. Used as
  a schedule fallback *and* to auto-grade predictions against actual results.

You need at least one of the two. If the Nexus browser request is blocked (CORS), the
app automatically falls back to The Blue Alliance.

## Run locally

```bash
cd "QualGambl"
npm install
npm run dev
# open the printed URL (http://localhost:5173)
```

## Deploy

The site auto-deploys to **GitHub Pages** on every push to `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — it runs
`npm ci && npm run build` and publishes `dist/`. Nothing to run manually; just:

```bash
git push origin main   # → builds and deploys to https://gilsamedia.github.io/QualGambl/
```

> **Google sign-in on the live site:** add `gilsamedia.github.io` under
> **Firebase console → Authentication → Settings → Authorized domains**.
> (Not needed for local dev — `localhost` is authorized by default.)

<details><summary>Alternative: Firebase Hosting</summary>

```bash
npm run build                # outputs to dist/
firebase login               # must be an account with access to the project
firebase init hosting        # public dir: dist ; single-page app: Yes
firebase deploy
```
The `*.web.app` domain is auto-authorized for Firebase Auth.
</details>

## How it works

1. Sign in (Google or email/password). Your profile is written to `users/{uid}`.
2. Pick an event from the list (managed in Firestore) and enter your team number.
3. The app pulls the schedule, filters to **qualification** matches your team is in,
   and shows which alliance (red/blue) you're on for each.
4. Tap **WIN** or **LOSS** per match, then **Save predictions** →
   `users/{uid}/predictions/{eventKey}`.
5. **Grade vs. results** compares your picks to actual winners from The Blue Alliance
   and shows a correct-count.

## Data model

```
events/{eventKey}          # admin-managed via Firebase console (read-only in app)
  ├─ name                  # optional display name
  └─ active                # optional; false hides the event (default: shown)

users/{uid}
  ├─ displayName, email, teamNumber, createdAt, lastLogin
  └─ predictions/{eventKey}
       ├─ eventKey, teamNumber, updatedAt
       └─ picks: { "<qualNumber>": true|false }   // true = predicted WIN
```

## Notes

- The Firebase API key in `firebase-config.js` is **not** a secret — access is
  controlled by the Firestore rules, not by hiding the key.
- Nexus's live API provides schedule/queue status but not final scores, which is why
  grading uses The Blue Alliance (same event-code format).
- Not affiliated with *FIRST*, FRC Nexus, or The Blue Alliance.
