import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Compass,
  Dumbbell,
  Heart,
  LineChart,
  Link2,
  Lightbulb,
  Rocket,
  Sprout,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/header";
import { Faq } from "@/components/landing/faq";
import { NewsletterSignup } from "@/components/landing/newsletter";

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
        "AI-powered financial coaching for fitness and wellness studio owners.",
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
        "Financial clarity, business insights, and coaching for fitness and wellness studios.",
    },
  ],
};

const howItWorks = [
  {
    step: "01",
    icon: Link2,
    title: "Connect your tools",
    description:
      "Link Stripe and your studio software. We pull in the data so you never have to enter numbers manually.",
  },
  {
    step: "02",
    icon: BarChart3,
    title: "Get instant financial clarity",
    description:
      "See your revenue, expenses, and profit in a clear dashboard. Finally understand where the money goes.",
  },
  {
    step: "03",
    icon: Lightbulb,
    title: "Understand what the numbers mean",
    description:
      "AI-powered insights explain your financials in plain language. No accounting degree required.",
  },
  {
    step: "04",
    icon: LineChart,
    title: "See where your business is heading",
    description:
      "Revenue forecasts and trend analysis help you plan ahead instead of reacting month to month.",
  },
  {
    step: "05",
    icon: Compass,
    title: "Know what to focus on",
    description:
      "Monthly priorities and action items tell you exactly what will move the needle for your studio.",
  },
];

const modules = [
  {
    icon: Rocket,
    title: "Thrive Launch",
    description:
      "Set up your business foundation in one afternoon. We organize your revenue streams, expenses, goals, and key metrics so everything starts from a clear baseline.",
  },
  {
    icon: BarChart3,
    title: "Thrive Core",
    description:
      "Your financial dashboard. Revenue, expenses, profit margins, and member metrics updated automatically from your connected tools.",
  },
  {
    icon: Brain,
    title: "Thrive Insights",
    description:
      "AI-powered analysis that explains what your numbers mean. Not just charts — context, patterns, and plain-language explanations of your financial health.",
  },
  {
    icon: TrendingUp,
    title: "Thrive Forecast",
    description:
      "See where your business is heading. Revenue projections, seasonal trends, and scenario planning so you can make decisions with confidence.",
  },
  {
    icon: Compass,
    title: "Thrive Compass",
    description:
      "Your monthly priorities. Based on your financials and goals, Compass tells you what to focus on right now to grow sustainably.",
  },
];

const audiences = [
  { icon: Users, label: "Yoga and Pilates studios" },
  { icon: Dumbbell, label: "CrossFit gyms and strength training" },
  { icon: Users, label: "Personal training studios" },
  { icon: Heart, label: "Massage and wellness practices" },
  { icon: Sprout, label: "Wellness practitioners and coaches" },
  { icon: Target, label: "Any studio earning $50K\u2013$1M annually" },
];

const comparisons = [
  {
    category: "Bookkeeper",
    description: "Records transactions and files taxes. Essential, but doesn\u2019t explain the business or help you plan.",
  },
  {
    category: "QuickBooks",
    description: "Tracks transactions. But most studio owners never open it, and it doesn\u2019t tell you what to do next.",
  },
  {
    category: "Business consultant",
    description: "Provides strategy and coaching. Valuable, but expensive and hard to access month to month.",
  },
  {
    category: "Thrive",
    description: "Financial insight AND business coaching, delivered automatically every month. Understands your studio, explains the numbers, and tells you what to focus on.",
    highlight: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-gray-950">
      {/* JSON-LD structured data — static server-rendered content, safe to inline */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/70 via-white to-white dark:from-emerald-950/25 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute left-1/2 top-0 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/5" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Sprout className="h-3.5 w-3.5" />
            AI-powered financial coaching for studio owners
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl lg:text-6xl">
            Financial clarity
            <br />
            <span className="text-emerald-600 dark:text-emerald-400">
              for your studio.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-gray-500 dark:text-gray-400 sm:text-xl">
            Thrive is an AI-powered financial coach that helps fitness and wellness
            studio owners understand their numbers, plan ahead, and grow with
            confidence.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth?tab=signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Start Your Free Session
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-7 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              How Thrive works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              In one afternoon we set up the financial operating system for your studio.
              Then every month you receive financial statements, business insights, and
              coaching automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative text-center">
                {index < howItWorks.length - 1 && (
                  <div className="absolute top-8 left-[calc(50%+40px)] hidden h-px w-[calc(100%-40px)] bg-gradient-to-r from-emerald-300 to-transparent dark:from-emerald-700 lg:block" />
                )}
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                  <item.icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
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

      {/* Features / Modules */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Everything your studio needs to thrive
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              Five integrated modules that take you from setup to ongoing coaching.
              Each one builds on the last.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                  <mod.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  {mod.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {mod.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section id="who-its-for" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Built for studio owners like you
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              These businesses often earn $50K&ndash;$1M annually but operate without
              financial statements, goals, or forecasting. Thrive changes that.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start gap-3">
                  <audience.icon className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">{audience.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Thrive Difference */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              The Thrive difference
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              QuickBooks tracks transactions. Thrive explains the business.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {comparisons.map((item) => (
              <div
                key={item.category}
                className={
                  item.highlight
                    ? "rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-6 dark:border-emerald-600 dark:bg-emerald-950/30"
                    : "rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
                }
              >
                {item.highlight && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <Zap className="h-3 w-3" />
                    What makes us different
                  </div>
                )}
                <h3
                  className={
                    item.highlight
                      ? "mb-2 text-lg font-semibold text-emerald-700 dark:text-emerald-300"
                      : "mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
                  }
                >
                  {item.category}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Everything you need to know about getting started with Thrive.
            </p>
          </div>

          <Faq />
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSignup />

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 py-20 dark:from-emerald-700 dark:to-emerald-800 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sprout className="mx-auto mb-6 h-10 w-10 text-emerald-200" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your studio deserves financial clarity
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-emerald-100">
            In 30 minutes, Thrive sets up your financial operating system. Then every
            month you get statements, insights, and coaching — automatically.
          </p>
          <Link
            href="/auth?tab=signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            Start Your Free Session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
