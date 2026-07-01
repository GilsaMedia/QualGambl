// ---------------------------------------------------------------------------
// Firebase configuration
// ---------------------------------------------------------------------------
// 1. Go to https://console.firebase.google.com and create a project.
// 2. Add a Web app (</> icon) and copy its config object here.
// 3. Enable Authentication > Sign-in method > Google AND Email/Password.
// 4. Create a Firestore database (Build > Firestore Database > Create).
// 5. Publish the rules in firestore.rules.
//
// NOTE: These values are NOT secret. The Firebase API key is safe to expose in
// client-side code — access is controlled by Firestore security rules, not by
// hiding this key. (Your Nexus / TBA keys are different and are kept in
// localStorage only, never here.)
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyDZThHJhuucojJarMScTp2QTO-kETJJyUw",
  authDomain: "qualgamble.firebaseapp.com",
  projectId: "qualgamble",
  storageBucket: "qualgamble.firebasestorage.app",
  messagingSenderId: "477881456267",
  appId: "1:477881456267:web:a668100bd73f4e2851268e",
  measurementId: "G-E37EG99CM3",
};

// Leave this check as-is — the app uses it to show a "configure me" banner.
export const isConfigured =
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("PASTE_") &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your-project";
