"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "Do I need accounting experience?",
    answer:
      "Not at all. Thrive is designed for studio owners, not accountants. Everything is presented in plain language with clear explanations. If you can read a bank statement, you can use Thrive.",
  },
  {
    question: "What studio software does Thrive work with?",
    answer:
      "Thrive connects with Stripe for payment data, and we're building integrations with popular studio platforms including PushPress, MindBody, OfferingTree, and others. If your software isn't supported yet, let us know — we're adding new integrations regularly.",
  },
  {
    question: "Is this a replacement for a bookkeeper?",
    answer:
      "No. Thrive provides financial clarity and business coaching — it helps you understand your numbers and make better decisions. For tax filing, payroll, and compliance, you should still work with a CPA or bookkeeper. Thrive makes their job easier too, because your finances will be better organized.",
  },
  {
    question: "How long does setup take?",
    answer:
      "About 30 minutes. During your Thrive Launch session, we'll connect your tools, organize your revenue streams and expenses, and set up your financial dashboard. Most studio owners are surprised how quickly everything comes together.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We use read-only access to your financial tools — Thrive can see your data but never move money or make changes to your accounts.",
  },
  {
    question: "What do I get each month?",
    answer:
      "Every month Thrive delivers financial statements, AI-powered insights explaining what your numbers mean, revenue forecasts, and a prioritized list of what to focus on. Think of it as having a financial coach who reviews your business every month and tells you exactly what needs attention.",
  },
  {
    question: "Is this only for fitness businesses?",
    answer:
      "Thrive is built first for fitness and wellness studios because the economics and challenges are similar across these businesses. Yoga studios, CrossFit gyms, Pilates studios, personal training, massage therapy, and wellness practitioners are all a great fit. We'll expand to other service businesses over time.",
  },
  {
    question: "How is this different from QuickBooks?",
    answer:
      "QuickBooks tracks transactions. Thrive explains the business. Most studio owners set up QuickBooks and never open it because the data doesn't tell them what to do. Thrive turns your financial data into insights, forecasts, and monthly priorities — it's the difference between a spreadsheet and a coach.",
  },
];

/**
 * Accordion-style FAQ section.
 * Each item toggles open/closed independently.
 */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-2xl mx-auto divide-y divide-gray-200 dark:divide-gray-700">
      {faqs.map((faq, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => toggle(i)}
            className="flex items-center justify-between w-full text-left gap-4 group"
            aria-expanded={openIndex === i}
          >
            <span className="text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {faq.question}
            </span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200",
                openIndex === i && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-out",
              openIndex === i ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
