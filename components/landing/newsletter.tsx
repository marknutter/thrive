"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Something went wrong. Please try again.");
      } else {
        setStatus("success");
        setMessage("You're subscribed! We'll keep you posted.");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="py-20 sm:py-28 bg-emerald-50 dark:bg-emerald-950/20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-3">
          Stay in the loop
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          Get the latest updates, tips, and new features delivered straight to your inbox. No spam, ever.
        </p>
        {status === "success" ? (
          <p className="text-emerald-700 dark:text-emerald-400 font-medium text-lg">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shadow-lg shadow-emerald-500/20"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{message}</p>
        )}
      </div>
    </section>
  );
}
