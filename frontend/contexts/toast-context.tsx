"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { duration, easeOut } from "@/lib/rasa/motion";

type ToastContextValue = { toast: (msg: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {message ? (
          <motion.div
            key={message}
            role="status"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            transition={{ duration: duration.fast, ease: easeOut }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-[80] w-max max-w-[min(92vw,24rem)] rounded-xl bg-ink/95 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg backdrop-blur-xs max-md:bottom-[calc(136px+env(safe-area-inset-bottom))]"
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}