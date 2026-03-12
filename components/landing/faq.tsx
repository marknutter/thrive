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
    question: "What does CoachK help with?",
    answer:
      "CoachK guides small service businesses through business setup, financial organization, goal setting, and ongoing coaching. The current product is aimed first at wellness and fitness businesses that need more financial clarity without hiring a full finance team.",
  },
  {
    question: "Who is CoachK built for first?",
    answer:
      "The first use case is studio and service businesses like yoga studios, Pilates studios, gyms, massage practices, and similar owner-operated businesses. The longer-term platform can support additional coaching domains.",
  },
  {
    question: "Is this accounting software?",
    answer:
      "No. CoachK is meant to provide financial clarity, structure, and coaching. It should help owners understand the business, not replace a bookkeeper, tax preparer, or payroll system.",
  },
  {
    question: "What happens in the setup session?",
    answer:
      "The setup session is where CoachK learns how the business works: revenue streams, pricing, costs, systems, owner goals, and current pain points. From that, it can produce summaries, checklists, and the first coaching recommendations.",
  },
  {
    question: "Can I upload documents?",
    answer:
      "Yes. The app already supports PDFs, images, spreadsheets, text files, and Office documents. That makes it possible to review pricing sheets, intake forms, studio reports, or operating notes during a coaching conversation.",
  },
  {
    question: "Will CoachK replace a consultant?",
    answer:
      "The product is designed to support a consultant-led relationship, not remove it. Kelly's expertise is the method. CoachK helps deliver that method consistently and at much lower operational effort.",
  },
  {
    question: "What will the ongoing experience look like?",
    answer:
      "After setup, the product is meant to evolve into monthly reporting, business health tracking, and scenario planning. This repo already has the conversation layer; the reporting and forecasting layers are the next implementation steps.",
  },
  {
    question: "Is this only for fitness businesses?",
    answer:
      "No. Fitness and wellness are the launch wedge because the economics are similar and the coaching framework is easier to standardize there. The broader model can support many service-business coaching tracks over time.",
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
