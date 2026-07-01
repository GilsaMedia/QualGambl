import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase.js";
import { useToast } from "./Toast.jsx";

export default function AuthView() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const showErr = (e) =>
    toast((e?.code || e?.message || "Something went wrong").replace("auth/", "").replaceAll("-", " "), "err");

  const google = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      showErr(e);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (err) {
      showErr(err);
    }
  };

  const signUp = async () => {
    if (!email || pw.length < 6) {
      showErr({ message: "Enter an email and a password of at least 6 characters." });
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      toast("Account created 🎉");
    } catch (err) {
      showErr(err);
    }
  };

  return (
    <section className="card auth-card">
      <h2>Sign in to predict</h2>
      <p className="muted">Your logins and predictions are saved to your account.</p>

      <button className="btn btn--google" onClick={google}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      <div className="divider"><span>or</span></div>

      <form className="stack" onSubmit={signIn}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="you@team1234.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </label>
        <div className="row">
          <button type="submit" className="btn btn--primary">Sign in</button>
          <button type="button" className="btn btn--ghost" onClick={signUp}>Create account</button>
        </div>
      </form>
    </section>
  );
}
