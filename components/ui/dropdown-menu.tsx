"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DropdownItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Danger styling */
  danger?: boolean;
  /** Click handler */
  onClick: () => void;
}

export interface DropdownMenuProps {
  /** Trigger element (button) */
  trigger: ReactNode;
  /** Menu items */
  items: DropdownItem[];
  /** Alignment relative to trigger */
  align?: "left" | "right";
  /** Additional CSS classes for the menu */
  className?: string;
}

/**
 * Accessible dropdown menu with keyboard navigation.
 *
 * @example
 * ```tsx
 * <DropdownMenu
 *   trigger={<button>Menu</button>}
 *   items={[
 *     { key: "edit", label: "Edit", icon: <Pencil />, onClick: handleEdit },
 *     { key: "delete", label: "Delete", danger: true, onClick: handleDelete },
 *   ]}
 * />
 * ```
 */
export function DropdownMenu({ trigger, items, align = "right", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0) {
          items[activeIndex].onClick();
          setOpen(false);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <div onClick={() => { setOpen(!open); setActiveIndex(-1); }}>
        {trigger}
      </div>

      {open && (
        <div
          ref={menuRef}
          className={cn(
            "absolute z-50 mt-1 min-w-[160px] py-1",
            "bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
            align === "right" ? "right-0" : "left-0",
            className
          )}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                i === activeIndex && "bg-gray-100 dark:bg-gray-700",
                item.danger
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
