import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Compass,
  FileSpreadsheet,
  HeartHandshake,
  MessageSquare,
  Sprout,
  Target,
  Upload,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/header";
import { Faq } from "@/components/landing/faq";

const siteUrl = process.env.BETTER_AUTH_URL || "https://thrive.ai";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Thrive",
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      description:
        "AI-powered business operations coaching for studio owners and service businesses.",
    },
    {
      "@type": "WebSite",
      name: "Thrive",
      url: siteUrl,
    },
    {
      "@type": "SoftwareApplication",
      name: "Thrive",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      description:
        "Structured business setup, financial clarity, and coaching support for small service businesses.",
    },
  ],
};

const features = [
  {
    icon: Compass,
    title: "Guided setup session",
    description:
      "Lead an owner through the business foundations conversation instead of dropping them into a blank dashboard.",
  },
  {
    icon: Upload,
    title: "Document-aware coaching",
    description:
      "Review spreadsheets, notes, PDFs, and images during the conversation to coach from real business inputs.",
  },
  {
    icon: FileSpreadsheet,
    title: "Operational clarity",
    description:
      "Turn messy business context into structured summaries, checklists, and next steps the owner can actually use.",
  },
  {
    icon: HeartHandshake,
    title: "Warm, direct tone",
    description:
      "The experience is meant to feel supportive and grounding, especially for owners who are nervous about the numbers.",
  },
];

const steps = [
  {
    step: "01",
    title: "Capture the real business",
    description:
      "Ask about pricing, revenue streams, expenses, systems, owner goals, and operational friction.",
  },
  {
    step: "02",
    title: "Organize the foundations",
    description:
      "Summarize what matters, flag gaps, and build an initial business foundation the owner can return to.",
  },
  {
    step: "03",
    title: "Coach the next decisions",
    description:
      "Use the ongoing conversation to support better reporting habits, clearer goals, and stronger business choices.",
  },
];

const audiences = [
  "Yoga studios and Pilates studios",
  "Gyms, personal training, and strength businesses",
  "Massage and wellness practices",
  "Other owner-led service businesses that need better financial structure",
];

export default function HomePage() {
  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/70 via-white to-white dark:from-emerald-950/25 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute left-1/2 top-0 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/5" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Sprout className="h-3.5 w-3.5" />
            Built for financial clarity, not dashboard theater
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl lg:text-6xl">
            Coach small business owners
            <br />
            <span className="text-emerald-600 dark:text-emerald-400">
              into calmer, clearer decisions.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-gray-500 dark:text-gray-400 sm:text-xl">
            Thrive is an AI-powered business operations coaching product for wellness and
            fitness businesses. It helps translate messy business reality into structured
            setup, practical next steps, and ongoing financial confidence.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth?tab=signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Start a coaching session
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth?tab=login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-7 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              The current product foundation
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              The repo already has the conversation, auth, persistence, file upload, and voice
              layers. Thrive now frames those capabilities around Kelly&apos;s methodology.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                  <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              How the workflow should feel
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500 dark:text-gray-400">
              Service as software: owners feel supported by a system that helps fix the business,
              not by a tool that asks them to do all the interpretation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            {steps.map((item, index) => (
              <div key={item.step} className="relative text-center md:text-left">
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-[calc(50%+40px)] hidden h-px w-[calc(100%-40px)] bg-gradient-to-r from-emerald-300 to-transparent dark:from-emerald-700 md:block" />
                )}
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="who-its-for" className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Designed around studio and service business realities
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              The first market is businesses with recurring revenue, constrained capacity,
              owner dependence, and limited financial visibility. That makes the coaching
              outcomes concrete and measurable.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    <Target className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{audience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-8 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              The product promise
            </h3>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
              Replace bank-balance management with a clearer operating rhythm: understand the
              business, organize the foundations, and coach the owner through the next decision.
            </p>
            <div className="mt-6 rounded-2xl bg-white/80 p-5 dark:bg-gray-900/70">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  The software handles the structure and repetition. The coaching method delivers
                  the value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              The current build direction and product intent in one place.
            </p>
          </div>

          <Faq />
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 py-20 dark:from-emerald-700 dark:to-emerald-800 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sprout className="mx-auto mb-6 h-10 w-10 text-emerald-200" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start with one grounded conversation
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-emerald-100">
            The current app already supports persistent conversations, document uploads, and
            voice. The next step is using those layers to deliver Kelly&apos;s method consistently.
          </p>
          <Link
            href="/auth?tab=signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            Open Thrive
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
