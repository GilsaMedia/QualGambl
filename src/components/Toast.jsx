import { createContext, useContext, useState, useRef, useCallback } from "react";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { msg, kind }
  const timer = useRef();

  const show = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast toast--${toast.kind}`}>{toast.msg}</div>}
    </ToastCtx.Provider>
  );
}
