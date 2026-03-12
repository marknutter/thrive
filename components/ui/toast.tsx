"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToast, type ToastType } from "@/lib/use-toast";
import { cn } from "@/lib/cn";

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
};

const bgMap: Record<ToastType, string> = {
  success: "bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800",
  error: "bg-white dark:bg-gray-800 border-red-200 dark:border-red-800",
  info: "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800",
  warning: "bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800",
};

/**
 * Global toast container. Renders all active toasts in the bottom-right corner.
 * Place once in your root layout.
 *
 * @example
 * ```tsx
 * // In layout.tsx:
 * <ToastContainer />
 * ```
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg",
            "animate-in slide-in-from-right duration-300",
            bgMap[t.type]
          )}
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5">{iconMap[t.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100">{t.message}</p>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
