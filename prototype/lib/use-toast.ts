"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  /** Unique ID */
  id: string;
  /** Toast type */
  type: ToastType;
  /** Message text */
  message: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Duration in ms before auto-dismiss (0 = no auto-dismiss) */
  duration: number;
}

let toastId = 0;

/** Global toast state subscriber pattern */
type Listener = () => void;
const listeners = new Set<Listener>();
let globalToasts: Toast[] = [];

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Add a toast to the global toast stack.
 */
function addToast(type: ToastType, message: string, opts?: { action?: Toast["action"]; duration?: number }) {
  const id = String(++toastId);
  const toast: Toast = {
    id,
    type,
    message,
    action: opts?.action,
    duration: opts?.duration ?? 5000,
  };
  globalToasts = [...globalToasts, toast];
  notify();

  // Auto-dismiss
  if (toast.duration > 0) {
    setTimeout(() => dismissToast(id), toast.duration);
  }

  return id;
}

/**
 * Dismiss a toast by ID.
 */
function dismissToast(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  notify();
}

/**
 * Global toast API — can be called from anywhere (including outside React components).
 *
 * @example
 * ```ts
 * import { toast } from "@/lib/use-toast";
 * toast.success("Changes saved!");
 * toast.error("Something went wrong");
 * toast.info("Processing...", { duration: 0 }); // persistent
 * toast.warning("Low storage", { action: { label: "Upgrade", onClick: handleUpgrade } });
 * ```
 */
export const toast = {
  success: (msg: string, opts?: { action?: Toast["action"]; duration?: number }) =>
    addToast("success", msg, opts),
  error: (msg: string, opts?: { action?: Toast["action"]; duration?: number }) =>
    addToast("error", msg, opts),
  info: (msg: string, opts?: { action?: Toast["action"]; duration?: number }) =>
    addToast("info", msg, opts),
  warning: (msg: string, opts?: { action?: Toast["action"]; duration?: number }) =>
    addToast("warning", msg, opts),
  dismiss: dismissToast,
};

/**
 * React hook for subscribing to the global toast state.
 * Used internally by the ToastContainer component.
 *
 * @example
 * ```tsx
 * const { toasts, dismiss } = useToast();
 * ```
 */
export function useToast() {
  const [, setTick] = useState(0);

  // Subscribe to global state
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  // Register / unregister listener
  useState(() => {
    listeners.add(rerender);
    return () => listeners.delete(rerender);
  });

  return {
    toasts: globalToasts,
    dismiss: dismissToast,
  };
}
