import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isConfigured } from "./firebase.js";
import { ToastProvider } from "./components/Toast.jsx";
import AuthView from "./components/AuthView.jsx";
import SetupView from "./components/SetupView.jsx";
import PredictView from "./components/PredictView.jsx";
import UserChip from "./components/UserChip.jsx";
import { saveTeamNumber } from "./lib/team.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth); // if no auth, we're "ready" (config error)
  const [profile, setProfile] = useState({});
  const [session, setSession] = useState(null); // { eventKey, teamNumber, matches, source }

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setProfile({});
        setSession(null);
        return;
      }
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const p = snap.exists() ? snap.data() : {};
        setProfile(p);
        await setDoc(
          ref,
          {
            displayName: u.displayName || p.displayName || "",
            email: u.email || "",
            lastLogin: serverTimestamp(),
            ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("profile save failed", err);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.uid || !profile.teamNumber || profile.teamNickname) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await saveTeamNumber(user.uid, profile.teamNumber);
        if (!cancelled && saved.teamNickname) {
          setProfile((p) => ({ ...p, teamNickname: saved.teamNickname }));
        }
      } catch (err) {
        console.warn("team nickname backfill failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, profile.teamNumber, profile.teamNickname]);

  return (
    <ToastProvider>
      {!isConfigured && (
        <div className="banner banner--warn">
          ⚠️ Firebase isn't configured yet. Open <code>firebase-config.js</code> and paste your project's
          config. See <code>README.md</code>.
        </div>
      )}

      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo">🎲</span>
          <div>
            <h1>QualGambl</h1>
            <p className="tagline">Predict your FRC qualification matches</p>
          </div>
        </div>
        {user && (
          <UserChip
            user={user}
            profile={profile}
            believerPoints={session?.believerPoints}
            onSignOut={() => signOut(auth)}
          />
        )}
      </header>

      <main className="container">
        {!authReady ? null : !user ? (
          <AuthView />
        ) : !session ? (
          <SetupView user={user} profile={profile} onProfile={setProfile} onLoaded={setSession} />
        ) : (
          <PredictView
            user={user}
            session={session}
            profile={profile}
            onChangeEvent={() => setSession(null)}
            onProfile={setProfile}
            onSessionUpdate={setSession}
          />
        )}
      </main>

      <footer className="footer">
        <span>
          QualGambl · not affiliated with <em>FIRST</em>, FRC Nexus, or The Blue Alliance
        </span>
      </footer>
    </ToastProvider>
  );
}
