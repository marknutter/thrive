# Go-to-Market AI — Discovery Questions for Jeff

> We're building the AI-powered version of your GTM playbook. These questions will shape every architectural and product decision. Answer as thoroughly as you want — the more context, the better the product. If you're unsure about something, say so — that's useful info too.
>
> **How to use this doc:** Type your answers in the gray response areas below each question. Feel free to add links, screenshots, or references to your existing docs.

---

## 1. User & Business Model

**1.1** The preliminary analysis sketches four use cases:

- **(a)** "G2M in a Box" for new startups — $5-10k one-time
- **(b)** G2M audit for established companies — $10-20k
- **(c)** Multi-product G2M at scale — $3-5k per product
- **(d)** Ongoing co-pilot — $500-1k/month SaaS

Which of these resonates most as the **launch** use case? Are you starting with one-time project pricing or recurring SaaS from day one?

> **Jeff's answer:**
>
>

---

**1.2** Who is the primary user operating this tool day-to-day?

- The startup **founder/CEO** themselves (non-technical, needs hand-holding)
- A **marketing hire** using this as a force multiplier
- **Consultants like you** using this to serve clients faster

This fundamentally shapes UX complexity. If it's the founder directly, the tool needs to *teach them* your frameworks as it goes. If it's a consultant, it can assume GTM vocabulary.

> **Jeff's answer:**
>
>

---

**1.3** Your playbook covers the **full cycle** — from positioning through sales process, deal management, demo strategy, and business planning (revenue projections, expense planning, cash flow). The original vision doc focuses on marketing/outbound.

**How much of the sales process (Stages 1-6, deal strategy, demo coaching) is in scope for this product?** Is this purely a marketing/outbound tool, or does it extend into sales enablement and coaching?

> **Jeff's answer:**
>
>

---

**1.4** Your knowledge base has been applied across Parallax, SubAssist, Match Tracks, and Yellow O. Is the intent for the AI to work across **any B2B industry**, or is there a specific vertical focus for launch (e.g., B2B SaaS, professional services, digital agencies)?

> **Jeff's answer:**
>
>

---

**1.5** Is there a white-label or partner angle? Could other GTM consultants license this under their own brand, or is this exclusively your methodology delivered through one product?

> **Jeff's answer:**
>
>

---

## 2. Your Frameworks & Methodology

**2.1** Your knowledge base references multiple named methodologies:

- **Sarah Day method** (messaging elements/framework)
- **Callum Broderick / Challenger method** (sales positioning, deal management, demo strategy)
- **Your own frameworks** (master checklist, outbound campaign template, marketing plays)

When does each apply? For example, is the Challenger method always used for sales positioning, or does it depend on the business type/stage? The AI needs clear rules for when to apply which framework.

> **Jeff's answer:**
>
>

---

**2.2** Your outbound philosophy has a strong rule: **"AI generates options, not answers — NEVER copy-paste."**

But the product promises speed and automation. How do you reconcile this? Should the AI:

- Generate **2-3 variations** the user must choose from and edit?
- Produce a single draft but **deliberately flag it** as needing human editing?
- Introduce **intentional imperfections** to sound human (your docs suggest this)?
- Something else?

> **Jeff's answer:**
>
>

---

**2.3** Your persona template has **17 sections** (scope, responsibilities, problems, beliefs, buying triggers, discovery questions, value messages, sample messaging, internal alignment notes, etc.).

Should the AI use this **exact template** for persona creation, or should it be simplified for users who aren't as deep in GTM as you are?

> **Jeff's answer:**
>
>

---

**2.4** Your sales process has **hard gates** — e.g., Stage 2 requires the buyer to *explicitly reject the status quo* before advancing. "Interest alone does not equal progression."

How much of this rigor should the AI enforce when coaching users through their sales process? Should it:

- **Refuse** to advance a deal stage if exit criteria aren't met
- **Warn** but let the user override
- **Ask probing questions** to help the user realize they haven't met the criteria
- Not enforce at all — just educate

> **Jeff's answer:**
>
>

---

**2.5** The 43 source documents — are all of them available for us to ingest as training/reference data? Are there any that are **client-confidential** (e.g., Parallax-specific revenue data or customer lists that shouldn't inform other users' outputs)?

> **Jeff's answer:**
>
>

---

## 3. Interaction Model & UX

**3.1** When a user goes through Phase 1 (uploading materials, answering probing questions), what should the interaction feel like?

- **Single chat thread** — One continuous conversation, like ChatGPT. Simple but can get long.
- **Structured wizard + chat** — Sections mapped to your Master Checklist (Positioning, Personas, ICP, Market Sizing, etc.) with a chat in each. Progress bar shows completion.
- **Project workspace** — Dashboard with documents, conversation threads, and generated outputs all visible. Mirrors how a real consulting engagement works.
- Something else?

> **Jeff's answer:**
>
>

---

**3.2** How long do you expect Phase 1 to take in real calendar time? One sitting of a few hours, or spread across multiple sessions over days/weeks? Your Master Checklist has **8 major sections** (A through H) — that's a lot of ground to cover.

> **Jeff's answer:**
>
>

---

**3.3** Your docs describe a "Challenger" coaching approach: **Teach → Reframe → Motivate**.

When the AI presents Phase 2 recommendations, should it literally follow this structure? Or is the coaching style more Socratic — asking questions to lead the user to discover the right answer themselves?

> **Jeff's answer:**
>
>

---

**3.4** For Phase 3, does the user need a **dashboard** showing campaign status, open rates, reply rates, meetings booked? Or does reporting live in the external tools (email platform, LinkedIn) and the app just orchestrates?

Your checklist mentions a **weekly scorecard** and **pipeline metrics** — should the app own this reporting?

> **Jeff's answer:**
>
>

---

**3.5** Does the app need to support **multiple users** within one company (founder + marketing hire + sales rep collaborating), or is single-user per account fine for launch?

> **Jeff's answer:**
>
>

---

## 4. Document Generation & Output

**4.1** How should the app deliver its output documents (playbook, slide deck, campaign plans)?

- **Google Docs/Slides** — Documents live in Google Workspace, users edit there
- **In-app editor + export** — Documents rendered in the app (like Notion), export to Google Docs / PDF / PPTX on demand
- **Downloadable files** — AI produces polished PDFs/PPTX, users download and edit in their own tools
- Something else?

> **Jeff's answer:**
>
>

---

**4.2** How **polished** do generated slide decks need to be? Your playbook includes actual sales decks and board decks. Should the AI produce:

- **Presentation-ready** decks (custom branding, logo, colors) — usable as-is
- **Content-first** drafts — right content, basic formatting, user designs them
- Something in between?

> **Jeff's answer:**
>
>

---

**4.3** The product creates a "current state" doc in Phase 1, then an "improved" version in Phase 2. Should users see these **side by side with tracked changes**, or is a clean replacement fine?

> **Jeff's answer:**
>
>

---

**4.4** Your checklist outputs go beyond narrative documents — it includes **weekly scorecards**, **sales lead tracking sheets**, **deal forecaster spreadsheets**, and **content/play calendars**. Are these spreadsheet-type outputs in scope, or just the narrative documents?

> **Jeff's answer:**
>
>

---

## 5. AI & Knowledge Architecture

**5.1** For teaching the AI your methodology, the initial recommendation is **RAG** (the AI retrieves relevant sections from your 43 docs on the fly). The alternative is **fine-tuning** (baking your patterns into the model's behavior). RAG is faster to build and easier to update; fine-tuning produces more consistent "Jeff-like" output but is harder to iterate on.

Do you have a preference, or should we start with RAG and evolve?

> **Jeff's answer:**
>
>

---

**5.2** Your methodology has a clear sequence: **ICP → Positioning → Messaging → Outbound → Sales Process → Deal Management**. Should the AI enforce this order (you can't design outbound campaigns until messaging is finalized), or allow users to jump around?

> **Jeff's answer:**
>
>

---

**5.3** For Phase 2 recommendations — should the AI pull in **real-time external data** (competitor websites, market trends, SEO keyword data, industry benchmarks), or work purely from its training knowledge + what the user provided?

Real-time data makes recommendations sharper but adds complexity and cost.

> **Jeff's answer:**
>
>

---

**5.4** The vision doc says the AI should **"rewrite and rebuild the website"** to demonstrate messaging recommendations. What does this mean practically?

- Generate new website **copy** (headlines, value props, CTAs) as a document
- Produce **wireframes or mockups** showing the redesigned pages
- Generate **working HTML/code** for landing pages
- Integrate with a **CMS** (WordPress, Webflow) to push changes directly
- Something else?

> **Jeff's answer:**
>
>

---

**5.5** The analysis proposes **6 specialist AI agents + 1 orchestrator** (Positioning Architect, Persona Definer, Campaign Designer, Sales Coach, Demo Strategist, Content Engine). Should we build this multi-agent system from the start, or start with a **single capable agent** and break it apart later as complexity warrants?

> **Jeff's answer:**
>
>

---

## 6. Integrations & Tools

**6.1** Your playbook mentions a specific toolchain: **Clay/Apollo/Seamless** for list building, **Heyreach** for LinkedIn outreach, cold email tools with **domain warming**. Are these the exact tools to integrate with, or should the app be **tool-agnostic** (work with whatever the user already has)?

> **Jeff's answer:**
>
>

---

**6.2** How deep should the **Clay integration** go?

- **Fully automated** — The app creates Clay tables, configures enrichment workflows, runs them, pulls results. User never opens Clay.
- **Guided setup** — The app generates configs and instructions; user sets them up in Clay; imports results.
- **API-driven** — Everything programmatic via Clay's API, invisible to the user.

> **Jeff's answer:**
>
>

---

**6.3** **LinkedIn** is critical but its API is very restrictive for outbound messaging. Are you envisioning:

- Integration with a **LinkedIn automation tool** (Heyreach, Expandi, etc.)
- The app generates **copy and sequences** that the user posts manually
- Both, depending on what tools the user has

> **Jeff's answer:**
>
>

---

**6.4** The vision mentions the app should **"acquire the needed tools and access to accounts"** on behalf of the user. Does this mean the app should literally guide users through signing up for Clay, email tools, etc.? Or do users come with their stack already in place?

> **Jeff's answer:**
>
>

---

**6.5** Your checklist includes **meeting recording (Gong/Fathom)** and **AI analysis of sales call transcripts**. Is this in scope? If so, the app could analyze calls and feed insights back into messaging and persona refinement — closing the feedback loop you describe.

> **Jeff's answer:**
>
>

---

**6.6** Does the app need **CRM integration** (Salesforce, HubSpot) to track leads through the full funnel? Your playbook tracks: impressions → contacts → leads → MQLs → SQLs. Where should this tracking live?

> **Jeff's answer:**
>
>

---

## 7. Content & Campaign Execution

**7.1** Your content strategy defines **5 pillars**: Podcasts (biweekly), Web Events (monthly), Blog Posts, Gated Content, and Customer Success Videos.

Podcasts and video require human execution. What's the AI's role — just planning/scripting, or something more (e.g., generating show notes, cutting clips, writing social posts from transcripts)?

> **Jeff's answer:**
>
>

---

**7.2** When the app creates thought leadership content, who is the **"author"**? Is the AI ghostwriting as the founder/CEO, branded company content, or something else?

Your docs emphasize outreach should feel human and personal — does the AI need to **learn each user's writing voice**?

> **Jeff's answer:**
>
>

---

**7.3** Your outbound campaign template follows a specific structure:

1. Campaign Goal
2. Target Customer
3. Target Persona
4. Data Needed
5. Problem-Value Hypothesis (Situation → Problem → Impact → Outcome)
6. Angle (Pain / Insight / Trigger / Proof-led)
7. Offer

Should the AI **walk the user through** filling out this template for each campaign, or **abstract it away** and generate campaigns based on ICP + messaging?

> **Jeff's answer:**
>
>

---

**7.4** The "10 marketing plays per month" for signal-driven outreach — are these plays **defined once and refreshed monthly**, or does the AI generate **new/different plays** each month based on evolving conditions?

> **Jeff's answer:**
>
>

---

**7.5** Your docs specify strict rules: lists under 500 accounts (ideally ~300), max 2 people per company, cadences must include LinkedIn + phone + email (not email-only), emails under 100 words, 2 tone variations per email.

Should the AI **enforce these rules automatically** as guardrails, or should they be **configurable** per user?

> **Jeff's answer:**
>
>

---

**7.6** After campaigns launch, what should the app do?

- **Monitor** performance and suggest copy/targeting adjustments
- **Auto-pause** underperforming campaigns
- Generate a **weekly scorecard** (per your template)
- **Fire and forget** — user checks results in their tools
- Something else?

> **Jeff's answer:**
>
>

---

## 8. Technical Preferences

> These are more for Mark, but Jeff's input is welcome.

**8.1** Any strong preferences on tech stack (frontend framework, backend language, hosting provider, database)? Or leave this to Mark?

> **Jeff's answer:**
>
>

---

**8.2** AI model preference — Claude (Anthropic), GPT (OpenAI), or best-tool-for-the-job?

> **Jeff's answer:**
>
>

---

**8.3** How important is **data security**? Users will upload sensitive business data (customer lists with revenue, sales decks, financial projections). Do you need formal compliance (SOC2), or is standard cloud security sufficient for launch?

> **Jeff's answer:**
>
>

---

## 9. MVP Scope & Launch

**9.1** What's a realistic target for a first usable version — and what does "usable" mean?

- Demo to investors
- Test with a real customer
- Jeff uses it with a client
- Something else?

> **Jeff's answer:**
>
>

---

**9.2** If Phase 1 ships as a standalone product, what's the **minimum set of outputs** that makes it worth paying for? All seven document types, or a subset? Which ones are non-negotiable?

The full list:
1. Positioning statement / "Our Why"
2. 2-minute elevator pitch
3. 2-sentence elevator pitch
4. ICP descriptions
5. Buyer/user persona definitions
6. Market analysis (TAM/SAM)
7. Current lead gen description
8. Growth goals

> **Jeff's answer:**
>
>

---

**9.3** Phase 3 is by far the most complex (Clay integration, email campaigns, LinkedIn automation, signal-driven list building, approval loops). Would you consider launching Phase 3 as an **"orchestrator and content creator"** — the AI writes all the copy, builds the plan, generates list criteria — but the user executes in their own tools?

> **Jeff's answer:**
>
>

---

**9.4** Your playbook extends into areas not in the original vision doc: **sales process coaching** (Stages 0-6), **deal strategy documents**, **demo preparation**, **pipeline forecasting**, and **business planning** (revenue/expense/cash flow). Should any of these be a **future phase**, or is the product strictly marketing/outbound?

> **Jeff's answer:**
>
>

---

**9.5** What does success look like **6 months after launch**? Revenue? Users? Customer outcomes?

> **Jeff's answer:**
>
>

---

## 10. Quality, Edge Cases & Risks

**10.1** The knowledge base is primarily Parallax examples (rated 7/10 for cross-industry applicability). **How concerned are you about the AI over-indexing on Parallax** and producing outputs that feel too SaaS-specific for other industries?

> **Jeff's answer:**
>
>

---

**10.2** There's a tension between "never copy-paste AI output" and "deliver value in hours." Where's the quality line? Should the AI produce:

- **Draft quality** — 80% done, user must edit heavily
- **Near-final** — 95% done, user tweaks
- **Multiple variations** — 3 options, user picks and customizes

> **Jeff's answer:**
>
>

---

**10.3** What happens when a user's business is genuinely weak — bad positioning, too-broad ICP, unclear value prop? Your Challenger framework is built on teaching customers something uncomfortable. Should the AI **challenge its own users the same way**?

> **Jeff's answer:**
>
>

---

**10.4** Materials uploaded will vary wildly — from a founder with a polished sales deck and 130 customers to one with **nothing but a half-built website**. Can Phase 1 work starting from near-zero? If so, the AI needs to do much heavier lifting from conversation alone.

> **Jeff's answer:**
>
>

---

**10.5** Industries with **compliance constraints** on marketing (healthcare, financial services, cannabis, legal) — should the AI know about these and flag issues, or is that out of scope?

> **Jeff's answer:**
>
>

---

## 11. The Bigger Picture

**11.1** What are you most worried about in building this?

> **Jeff's answer:**
>
>

---

**11.2** What's the **one thing** this product absolutely MUST nail to succeed?

> **Jeff's answer:**
>
>

---

**11.3** Are there existing products you see as **competitors or inspiration**? (Jasper, Copy.ai, Clay, HubSpot AI, Lavender, Apollo AI, etc.)

> **Jeff's answer:**
>
>

---

**11.4** Long-term, how do you see your role?

- **Knowledge curator** — continuously improving the frameworks the AI uses
- **Face of the product** — thought leadership, customer trust, brand
- **Co-founder/operator** — involved in product, sales, strategy
- **Steps back** — once the AI is trained, minimal involvement
- Some combination?

> **Jeff's answer:**
>
>

---

**11.5** Is there anything in the vision doc or your existing materials you're already **second-guessing** or know needs more thought?

> **Jeff's answer:**
>
>

---

> **Thanks Jeff.** Once you've filled this out, we'll synthesize your answers into a technical spec and start building. Don't stress about getting every answer perfect — we'll have plenty of chances to iterate.
