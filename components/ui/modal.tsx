"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the user requests to close (Esc, backdrop click, X button) */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Optional icon rendered before the title */
  titleIcon?: ReactNode;
  /** Maximum width class (default: max-w-md) */
  maxWidth?: string;
  /** Content */
  children: ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
}

/**
 * Accessible modal dialog rendered via portal overlay.
 * Supports keyboard dismiss (Esc), backdrop click, and focus trapping.
 *
 * @example
 * ```tsx
 * <Modal open={showModal} onClose={() => setShowModal(false)} title="Confirm">
 *   <p>Are you sure?</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  titleIcon,
  maxWidth = "max-w-md",
  children,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap: focus the content on open
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          "bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full p-6",
          "focus:outline-none",
          maxWidth
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {titleIcon}
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div>{children}</div>

        {/* Footer */}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
