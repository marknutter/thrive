"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Tab {
  /** Unique key for the tab */
  key: string;
  /** Display label */
  label: string;
}

export interface TabsProps {
  /** Available tabs */
  tabs: Tab[];
  /** Currently selected tab key */
  activeTab: string;
  /** Called when a tab is selected */
  onTabChange: (key: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface TabPanelProps {
  /** Whether this panel is active */
  active: boolean;
  /** Panel content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accessible tab navigation with pill-style indicator.
 *
 * @example
 * ```tsx
 * <Tabs
 *   tabs={[{ key: "login", label: "Sign In" }, { key: "signup", label: "Sign Up" }]}
 *   activeTab={tab}
 *   onTabChange={setTab}
 * />
 * <TabPanel active={tab === "login"}>Login form here</TabPanel>
 * ```
 */
export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
            activeTab === tab.key
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Tab panel wrapper — renders children only when active.
 */
export function TabPanel({ active, children, className }: TabPanelProps) {
  if (!active) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
