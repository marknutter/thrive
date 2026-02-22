# Go-to-Market AI — Discovery Questions for Jeff

> We're building the AI-powered version of your GTM playbook. These questions will shape every architectural and product decision. Answer as thoroughly as you want — the more context, the better the product. If you're unsure about something, say so — that's useful info too.
> 
> 
> **How to use this doc:** Type your answers in the gray response areas below each question. Feel free to add links, screenshots, or references to your existing docs.
> 

---

## 1. User & Business Model

**1.1** The preliminary analysis sketches four use cases:

- **(a)** "G2M in a Box" for new startups — $5-10k one-time
- **(b)** G2M audit for established companies — $10-20k
- **(c)** Multi-product G2M at scale — $3-5k per product
- **(d)** Ongoing co-pilot — $500-1k/month SaaS

Which of these resonates most as the **launch** use case? Are you starting with one-time project pricing or recurring SaaS from day one?

> **Jeff's answer: A. But I think the initial use will be for people like me who know G2M well and have relationships with business leaders that need G2M assistance, like start up founders or exisitng owners of SMB manufacturing businesses as examples.  I want to offer an initial engagement for $10K, use app you’re creating for to do all the work in an hour or 2 and then give some kind of low cost subscription (D) to the app.  And of course I (the human) would be able to assist in weekly ($5K) or monthly ($2K) mentoring/advising meetings to supplement and hold accountability to progress.**
> 

---

**1.2** Who is the primary user operating this tool day-to-day?

- The startup **founder/CEO** themselves (non-technical, needs hand-holding)
- A **marketing hire** using this as a force multiplier
- **Consultants like you** using this to serve clients faster

This fundamentally shapes UX complexity. If it's the founder directly, the tool needs to *teach them* your frameworks as it goes. If it's a consultant, it can assume GTM vocabulary.

> **Jeff's answer: Consultants like me.  But for the ongoing subscription period it would be the founder.  So the way to think of this is building it with G2M knowledge assumed during the initial implementation and onboarding to create the plan, but then assume the ongoing coaching portion of the service will need to assume less G2M knowledge.**
> 

---

**1.3** Your playbook covers the **full cycle** — from positioning through sales process, deal management, demo strategy, and business planning (revenue projections, expense planning, cash flow). The original vision doc focuses on marketing/outbound.

**How much of the sales process (Stages 1-6, deal strategy, demo coaching) is in scope for this product?** Is this purely a marketing/outbound tool, or does it extend into sales enablement and coaching?

> **Jeff's answer:  Let’s hold off on the sales process portion for now.  That can be something we add later or a separate app altogether.  In my recent experience, there is more need for the outbound / lead gen “fill the funnel” portions of the GTM process, especially since so much is changing with current tool availability now.**
> 

---

**1.4** Your knowledge base has been applied across Parallax, SubAssist, Match Tracks, and Yellow O. Is the intent for the AI to work across **any B2B industry**, or is there a specific vertical focus for launch (e.g., B2B SaaS, professional services, digital agencies)?

> **Jeff's answer: Any B2B industry, but my main initial focus for use is two areas.  If it helps you to focus on just these two, then we should.  The two are software start-ups in the revenue range of $0 - $10M in ARR and SMB manufacturing businesses in the $1 to $50M revenue range.**
> 

---

**1.5** Is there a white-label or partner angle? Could other GTM consultants license this under their own brand, or is this exclusively your methodology delivered through one product?

> **Jeff's answer: Yes - very much in favor of a white label approach that other GTM consultants could brand**
> 

---

## 2. Your Frameworks & Methodology

**2.1** Your knowledge base references multiple named methodologies:

- **Sarah Day method** (messaging elements/framework)
- **Callum Broderick / Challenger method** (sales positioning, deal management, demo strategy)
- **Your own frameworks** (master checklist, outbound campaign template, marketing plays)

When does each apply? For example, is the Challenger method always used for sales positioning, or does it depend on the business type/stage? The AI needs clear rules for when to apply which framework.

> **Jeff's answer: The names Sarah Day and Callum Broderick just refer to the person I worked with to develop the specific doc template.  Their name is not important and should not be referenced by you.  It only appears in what I shared because I wanted to remember the source of the doc via the file name I chose.  The “Challenger” sales method is something that you’ll find more information on as you research.  It is especially appropriate for situations where you are selling a product or service that is new or not fully understood by the prospective buyer.  This is often the case with new technologies or new software that is solving problems buyers are not used to.  Parallax and many other software start ups are great examples of this and therefore they must position and message their product in ways that the buyer can discover the value that they aren’t aware of before they engage.  The opposite is a product that is well known in the market, like a office cubicle sold by Versare (another good relationship I have to consult for). Their buyers are looking for a solution to a problem that they know well.  So Challenger may not apply to these situations unless there is new added value that is not understood by the buyer that needs to be included.  The MEDICC sales methodology is usually a good approach for these situations.  These are usually more transactional sales.  I want the application to be able to assess both situations and then guide accordingly based on the product/situation that the user is building G2M for**
> 

---

**2.2** Your outbound philosophy has a strong rule: **"AI generates options, not answers — NEVER copy-paste."**

But the product promises speed and automation. How do you reconcile this? Should the AI:

- Generate **2-3 variations** the user must choose from and edit?
- Produce a single draft but **deliberately flag it** as needing human editing?
- Introduce **intentional imperfections** to sound human (your docs suggest this)?
- Something else?

> **Jeff's answer: The application should advise/teach the user to always have humans verify messaging before anything is sent to a user. So based on the options you gave me, I’d pick “produce a single draft but deliberately flag it as needing human editing.  But I want a configuration setting that allows the user to turn on “full automation” mode if desired at some point in the future.  This would remove the requirement for a human to review and allow the application to create messaging and then execute a campaign action without a human reviewing.  But again, this should never be the default and the app should caution the user before turning the human review by pass off.**
> 

---

**2.3** Your persona template has **17 sections** (scope, responsibilities, problems, beliefs, buying triggers, discovery questions, value messages, sample messaging, internal alignment notes, etc.).

Should the AI use this **exact template** for persona creation, or should it be simplified for users who aren't as deep in GTM as you are?

> **Jeff's answer:  Yes, should simplify for users who are not as deep in GTM knowledge.  For keeping it simple, pick a subset that are “required” by the app and provide the remaining as optional**
> 

---

**2.4** Your sales process has **hard gates** — e.g., Stage 2 requires the buyer to *explicitly reject the status quo* before advancing. "Interest alone does not equal progression."

How much of this rigor should the AI enforce when coaching users through their sales process? Should it:

- **Refuse** to advance a deal stage if exit criteria aren't met
- **Warn** but let the user override
- **Ask probing questions** to help the user realize they haven't met the criteria
- Not enforce at all — just educate

> **Jeff's answer: no enforcement, just educate**
> 

---

**2.5** The 43 source documents — are all of them available for us to ingest as training/reference data? Are there any that are **client-confidential** (e.g., Parallax-specific revenue data or customer lists that shouldn't inform other users' outputs)?

> **Jeff's answer:  All are ok to injest, but they should be used in aggregate as examples and never specifically referred to a user as relating to any specific company or data set.  These are examples that should be applied annonymously to a new situation the application is being used for.**
> 

---

## 3. Interaction Model & UX

**3.1** When a user goes through Phase 1 (uploading materials, answering probing questions), what should the interaction feel like?

- **Single chat thread** — One continuous conversation, like ChatGPT. Simple but can get long.
- **Structured wizard + chat** — Sections mapped to your Master Checklist (Positioning, Personas, ICP, Market Sizing, etc.) with a chat in each. Progress bar shows completion.
- **Project workspace** — Dashboard with documents, conversation threads, and generated outputs all visible. Mirrors how a real consulting engagement works.
- Something else?

> **Jeff's answer: the input should feel like a structured wizard + chat, but I also want the user to feel like they are building out a project workspace as they are doing the intake.  So perhaps after each section of the wizard, the user is shown on the project workspace how and where the section they just completed is (or will) manifest itself in the workspace**
> 

---

**3.2** How long do you expect Phase 1 to take in real calendar time? One sitting of a few hours, or spread across multiple sessions over days/weeks? Your Master Checklist has **8 major sections** (A through H) — that's a lot of ground to cover.

> **Jeff's answer:  One sitting for a few hours - It should feel like a “workshop” meeting.  The business is given a checklist of information and documents to come prepared with.  These all get uploaded to the application in advance.  And then the meeting is the consultant and the business talking through the questions the application is asking.  The application records the audio of all the discussion in the meeting.  I do not want to have to type notes from meeting into the application.  Cut that human step out.  The application needs to ask questions and then hear/listen to the discussion to capture the answers to the questions.**
> 

---

**3.3** Your docs describe a "Challenger" coaching approach: **Teach → Reframe → Motivate**.

When the AI presents Phase 2 recommendations, should it literally follow this structure? Or is the coaching style more Socratic — asking questions to lead the user to discover the right answer themselves?

> **Jeff's answer:  Focus on socratic, but if the user is clueless or truly can’t get to the answer or says something like “I want you to recommend or tell me….” then get more specific.  Do not let the user lead themselves to a bad approach.  The application is the expert and should lead the user to the best possible G2M approach but do it in a way that isn’t “telling” them what to do.  I want the app to be a coach that helps the user get to the right answer without feeling like they were told what to do.  They will have more buy in into the improvements if they feel like they were their ideas.**
> 

---

**3.4** For Phase 3, does the user need a **dashboard** showing campaign status, open rates, reply rates, meetings booked? Or does reporting live in the external tools (email platform, LinkedIn) and the app just orchestrates?

Your checklist mentions a **weekly scorecard** and **pipeline metrics** — should the app own this reporting?

> **Jeff's answer:  Yes - the app should own the reporting and pull data from other sources when needed**
> 

---

**3.5** Does the app need to support **multiple users** within one company (founder + marketing hire + sales rep collaborating), or is single-user per account fine for launch?

> **Jeff's answer: the application should support multiple users but we do not need different permission levels for each user.  Every user will have the same usage rights in version 1**
> 

---

## 4. Document Generation & Output

**4.1** How should the app deliver its output documents (playbook, slide deck, campaign plans)?

- **Google Docs/Slides** — Documents live in Google Workspace, users edit there
- **In-app editor + export** — Documents rendered in the app (like Notion), export to Google Docs / PDF / PPTX on demand
- **Downloadable files** — AI produces polished PDFs/PPTX, users download and edit in their own tools
- Something else?

> **Jeff's answer:  Google Docs/Slides that are downloadable to PDFs or microsoft office docs if the user is not a Google suite user**
> 

---

**4.2** How **polished** do generated slide decks need to be? Your playbook includes actual sales decks and board decks. Should the AI produce:

- **Presentation-ready** decks (custom branding, logo, colors) — usable as-is
- **Content-first** drafts — right content, basic formatting, user designs them
- Something in between?

> **Jeff's answer:Something in between.  But the docs MUST be editable.  Including the slides**
> 

---

**4.3** The product creates a "current state" doc in Phase 1, then an "improved" version in Phase 2. Should users see these **side by side with tracked changes**, or is a clean replacement fine?

> **Jeff's answer: A clean replace is fine but it should be accompanies with a separate doc that is a summary of the improvements that have been added.  Specifically explaining what, why, and the anticipated improved outcome because of the change.**
> 

---

**4.4** Your checklist outputs go beyond narrative documents — it includes **weekly scorecards**, **sales lead tracking sheets**, **deal forecaster spreadsheets**, and **content/play calendars**. Are these spreadsheet-type outputs in scope, or just the narrative documents?

> **Jeff's answer: Not in scope for version 1**
> 

---

## 5. AI & Knowledge Architecture

**5.1** For teaching the AI your methodology, the initial recommendation is **RAG** (the AI retrieves relevant sections from your 43 docs on the fly). The alternative is **fine-tuning** (baking your patterns into the model's behavior). RAG is faster to build and easier to update; fine-tuning produces more consistent "Jeff-like" output but is harder to iterate on.

Do you have a preference, or should we start with RAG and evolve?

> **Jeff's answer: RAG and evolve**
> 

---

**5.2** Your methodology has a clear sequence: **ICP → Positioning → Messaging → Outbound → Sales Process → Deal Management**. Should the AI enforce this order (you can't design outbound campaigns until messaging is finalized), or allow users to jump around?

> **Jeff's answer: Validate with other sources you can research that my sequencing is genearally accepted as a best practice and then require it.  If your research implies there should be some edits to the sequence or flexibility, then make some changes.  But generally speaking I think this sequence is important to keep rigid.**
> 

---

**5.3** For Phase 2 recommendations — should the AI pull in **real-time external data** (competitor websites, market trends, SEO keyword data, industry benchmarks), or work purely from its training knowledge + what the user provided?

Real-time data makes recommendations sharper but adds complexity and cost.

> **Jeff's answer:  Yes the application should be capable of supplementing with real time data.  What I have provided is my mental framework and the guidance for all of this but I do not profess to be the end all be all expert on this.  It’s very important to supplement key information from other sources as long as it fits directionally with what I have origionally provided as source documents.**
> 

---

**5.4** The vision doc says the AI should **"rewrite and rebuild the website"** to demonstrate messaging recommendations. What does this mean practically?

- Generate new website **copy** (headlines, value props, CTAs) as a document
- Produce **wireframes or mockups** showing the redesigned pages
- Generate **working HTML/code** for landing pages
- Integrate with a **CMS** (WordPress, Webflow) to push changes directly
- Something else?

> **Jeff's answer: Let’s reframe this direction from “rewrite and rebuild” to produce a document with suggestions for how to improve the existing website based on new messaging and positioning recommendations.  These recommendations should be very specific and in depth as if they were a prompt or set of requirements you’d give to a separate website building agent.**
> 

---

**5.5** The analysis proposes **6 specialist AI agents + 1 orchestrator** (Positioning Architect, Persona Definer, Campaign Designer, Sales Coach, Demo Strategist, Content Engine). Should we build this multi-agent system from the start, or start with a **single capable agent** and break it apart later as complexity warrants?

> **Jeff's answer: Build all the agents from the beginning.  Make sure that I understand how the agents are to be used and accessed.  That is fuzzy to me in terms of my understanding so if orchestration of agents is part of the application you are building then there will need to be an intuitive way to manage the agents.**
> 

---

## 6. Integrations & Tools

**6.1** Your playbook mentions a specific toolchain: **Clay/Apollo/Seamless** for list building, **Heyreach** for LinkedIn outreach, cold email tools with **domain warming**. Are these the exact tools to integrate with, or should the app be **tool-agnostic** (work with whatever the user already has)?

> **Jeff's answer:Let’s make sure the agent is specifically capable of working directly within Clay, Apollo, Seamless, and Heyreach and then be tool agnostic as well.  The first use case I want to prove out will be the use of Clay and Heyreach in combination.  My expectation is that the application will ask me for criteria to build a “clay signal” for that will present a list of contacts for the signal (name, email, phone number, company, and linkedIn url.  The app will present this list to me and then I will approve the list go get added to a Heyreach campaign that the agent will create within Heyreach.  Then a Human will review the Heyreach campaign messaging before approving the outreach in Heyreach to begin.**
> 

---

**6.2** How deep should the **Clay integration** go?

- **Fully automated** — The app creates Clay tables, configures enrichment workflows, runs them, pulls results. User never opens Clay.
- **Guided setup** — The app generates configs and instructions; user sets them up in Clay; imports results.
- **API-driven** — Everything programmatic via Clay's API, invisible to the user.

> **Jeff's answer:Fully Automated and API drive via Clay.  I want to talk in plain English about the signals I want to create and the agent will advise me on these ideas for signals and come up with new better choices based on the training about ICP, persona, and messaging.  So the Human should explain in plain English the signals and the next interaction should be approving the list and ourbound messaging that will be used in HeyReach, or email, or any other outbound motion the agent ends up with access to.**
> 

---

**6.3** **LinkedIn** is critical but its API is very restrictive for outbound messaging. Are you envisioning:

- Integration with a **LinkedIn automation tool** (Heyreach, Expandi, etc.)
- The app generates **copy and sequences** that the user posts manually
- Both, depending on what tools the user has

> **Jeff's answer:  Expecting to use a linkedin automation tool.  Heyreach is required and the ability to connect to others is a nice to have.**
> 

---

**6.4** The vision mentions the app should **"acquire the needed tools and access to accounts"** on behalf of the user. Does this mean the app should literally guide users through signing up for Clay, email tools, etc.? Or do users come with their stack already in place?

> **Jeff's answer:  The user should be given the opportunity to connect existing apps if they have them, but if the don’t the application should work with the user to get Clay and Heyreach set up.**
> 

---

**6.5** Your checklist includes **meeting recording (Gong/Fathom)** and **AI analysis of sales call transcripts**. Is this in scope? If so, the app could analyze calls and feed insights back into messaging and persona refinement — closing the feedback loop you describe.

> **Jeff's answer:  Yes this is in scope.  The application needs to give access to their call recording systems and analyzing feedback  and insights into message and persona refinement is a great thing to include.**
> 

---

**6.6** Does the app need **CRM integration** (Salesforce, HubSpot) to track leads through the full funnel? Your playbook tracks: impressions → contacts → leads → MQLs → SQLs. Where should this tracking live?

> **Jeff's answer: Yes the app needs CRM integrations to HubSpot, PipeDrive, and Close for version 1**
> 

---

## 7. Content & Campaign Execution

**7.1** Your content strategy defines **5 pillars**: Podcasts (biweekly), Web Events (monthly), Blog Posts, Gated Content, and Customer Success Videos.

Podcasts and video require human execution. What's the AI's role — just planning/scripting, or something more (e.g., generating show notes, cutting clips, writing social posts from transcripts)?

> **Jeff's answer: This is out of scope for version 1.  We will have humans handle this for now.**
> 

---

**7.2** When the app creates thought leadership content, who is the **"author"**? Is the AI ghostwriting as the founder/CEO, branded company content, or something else?

Your docs emphasize outreach should feel human and personal — does the AI need to **learn each user's writing voice**?

> **Jeff's answer: The author will be the “voice of the business” and or the founder.  The application needs to learn this tone and style and be trained on it.**
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

> **Jeff's answer:  The AI should walk the user through filling out this template but it should offer up default answers for each based on what it recommends assuming it knows enough to make good enough recommendations for each specific campaign**
> 

---

**7.4** The "10 marketing plays per month" for signal-driven outreach — are these plays **defined once and refreshed monthly**, or does the AI generate **new/different plays** each month based on evolving conditions?

> **Jeff's answer: The AI will work with the human to evaluate current signal driven plays being run and suggest ways to improve them or suggest new plays based on trends happening with the current signals as well as new events and trends impacting the ICP companies and appropriate personas**
> 

---

**7.5** Your docs specify strict rules: lists under 500 accounts (ideally ~300), max 2 people per company, cadences must include LinkedIn + phone + email (not email-only), emails under 100 words, 2 tone variations per email.

Should the AI **enforce these rules automatically** as guardrails, or should they be **configurable** per user?

> **Jeff's answer:default to these as guardrails but allow them to be overridden by a user**
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
> The application should:
> 
> - **Monitor** performance and suggest copy/targeting adjustments
> - **Auto-pause** underperforming campaigns
> - Generate a **weekly scorecard** (per your template)

---

## 8. Technical Preferences

> These are more for Mark, but Jeff's input is welcome.
> 

**8.1** Any strong preferences on tech stack (frontend framework, backend language, hosting provider, database)? Or leave this to Mark?

> **Jeff's answer: leave for Mark**
> 

---

**8.2** AI model preference — Claude (Anthropic), GPT (OpenAI), or best-tool-for-the-job?

> **Jeff's answer: best tool for the job unless mark overrides with a preference**
> 

---

**8.3** How important is **data security**? Users will upload sensitive business data (customer lists with revenue, sales decks, financial projections). Do you need formal compliance (SOC2), or is standard cloud security sufficient for launch?

> **Jeff's answer: standard cloud security is sufficient for now.  But there is one hard rule… any files that are uploaded by the user must not be viewable to any other user and the data within them must not be shared beyond that user.  If a user uploads something we must guarantee that no other user will have access to the files they uploaded.**
> 

---

## 9. MVP Scope & Launch

**9.1** What's a realistic target for a first usable version — and what does "usable" mean?

- Demo to investors
- Test with a real customer
- Jeff uses it with a client
- Something else?

> **Jeff's answer: Jeff users it with a client.  “Usable” means that Jeff is able to navigate the app and upload information shared by the client and Jeff is able to get answers to all questions that the app is asking as needed information.  (remember these questions will ideally be listened to via conversation rather than typing answer into a chat field)**
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

> **Jeff's answer: Providing 1 through 5 is the minimum set of outputs to ship as a standalone product**
> 
> 1. Positioning statement / "Our Why"
> 2. 2-minute elevator pitch
> 3. 2-sentence elevator pitch
> 4. ICP descriptions
> 5. Buyer/user persona definition

---

**9.3** Phase 3 is by far the most complex (Clay integration, email campaigns, LinkedIn automation, signal-driven list building, approval loops). Would you consider launching Phase 3 as an **"orchestrator and content creator"** — the AI writes all the copy, builds the plan, generates list criteria — but the user executes in their own tools?

> **Jeff's answer: Yes orchestrator and content creator is a good first step.  However the full version of Phase 3 working well is a higher value solution that replaces a role that many businesses don’t have in capability to do well.  Having the full version of Phase 3 and would make the application significantly more sellable**
> 

---

**9.4** Your playbook extends into areas not in the original vision doc: **sales process coaching** (Stages 0-6), **deal strategy documents**, **demo preparation**, **pipeline forecasting**, and **business planning** (revenue/expense/cash flow). Should any of these be a **future phase**, or is the product strictly marketing/outbound?

> **Jeff's answer:  All those areas you listed can be a future phase**
> 

---

**9.5** What does success look like **6 months after launch**? Revenue? Users? Customer outcomes?

> **Jeff's answer: Jeff is able to have gotten four businesses up and running at $10K per cusotmer and has ongoing recurring coaching revenue of $20K across the 4 businesses.  Jeff is staying involved with these 4 companies coaching them on the outbound results they are getting from the application.  This is consuming a total of 4 hours per week.  Additionally Jeff has started selling the application to other coaches and businesses who want to use the application on their own without Jeff coaching.**
> 

---

## 10. Quality, Edge Cases & Risks

**10.1** The knowledge base is primarily Parallax examples (rated 7/10 for cross-industry applicability). **How concerned are you about the AI over-indexing on Parallax** and producing outputs that feel too SaaS-specific for other industries?

> **Jeff's answer:  I want this to be tailored to two ICPs initially.  #1 is younger SaaS companies like Parallax in the $0 to $10M ARR range.  #2 is $3M - $50M manufacturing businesses like Versare and Schad Tracy.  I would rather you over index and focus on these two ICPs to build a very focused solution.  That is really important to make this feel like the application understands the users business.  And I know focus is crucial when building a new product like this.**
> 

---

**10.2** There's a tension between "never copy-paste AI output" and "deliver value in hours." Where's the quality line? Should the AI produce:

- **Draft quality** — 80% done, user must edit heavily
- **Near-final** — 95% done, user tweaks
- **Multiple variations** — 3 options, user picks and customizes

> **Jeff's answer: Let’s aim for near final with 2 variations**
> 

---

**10.3** What happens when a user's business is genuinely weak — bad positioning, too-broad ICP, unclear value prop? Your Challenger framework is built on teaching customers something uncomfortable. Should the AI **challenge its own users the same way**?

> **Jeff's answer: Yes!!!! it is very important that this application not shy away from being critical.  If there is hard news to deliver I want the applicaiton to deliver it.  No sugar coating.  Remember, initial use will be a consultant using this so the human consultant can gauge how the human will respond to bad news about their business.  But the spirit of all of this still needs to be motivational.  So if there are major flaws with the current ICP or positioning or they are trying to sell into a bad market, point this out but offer solutions to improve it.  The application is a coach and it should reflect my coaching style of “positive aggressive” which to me means always playing to win but being respectful and conscientious while you do so.**
> 

---

**10.4** Materials uploaded will vary wildly — from a founder with a polished sales deck and 130 customers to one with **nothing but a half-built website**. Can Phase 1 work starting from near-zero? If so, the AI needs to do much heavier lifting from conversation alone.

> **Jeff's answer: I agree there will be a wide range and I fully expect the application to give AI the freedom to ask as many or as few of questions it needs to based on input received to get to a point of meaningful recommendations.  AI should use it’s discretion on this.  However if there needs to be some minimum amount of information uploaded before questions can start, I am OK with that as long as it’s a pretty low bar of minimum.**
> 

---

**10.5** Industries with **compliance constraints** on marketing (healthcare, financial services, cannabis, legal) — should the AI know about these and flag issues, or is that out of scope?

> **Jeff's answer: I don’t know**
> 

---

## 11. The Bigger Picture

**11.1** What are you most worried about in building this?

> **Jeff's answer: That I’ve asked you to build something too complex and it won’t do any one thing really really well.  I want it to do everything I’ve described really well.  If humans were building this I wouldn’t define it so broadly.  Because I’m trying to understand just how good AI development has become I’m purposely asking for a wider scope to see what you can do.  I truly do want to avoid building something that is too broad and doesn’t go deep enough in any direction to be valuable.**
> 

---

**11.2** What's the **one thing** this product absolutely MUST nail to succeed?

> **Jeff's answer:  It must make it possible for me to advise 4 go to market clients at once requiring only 16 total hours of my time per month after I’ve gotten them set up with the outbound GTM motions described in this application.  And it the set up must be easier for me to do with the app, meaning I can get the customer through the app’s onboarding and questions for information in 4 hours or less of my time.**
> 

---

**11.3** Are there existing products you see as **competitors or inspiration**? (Jasper, [Copy.ai](http://copy.ai/), Clay, HubSpot AI, Lavender, Apollo AI, etc.)

> **Jeff's answer:  I haven’t found any other product trying to be an ongoing coach after inital GTM set up.  I think the competition is humans that are doing this as fractional CMOs who perhaps are building their own similar tools.  But I haven’t seen anything on the market**
> 

---

**11.4** Long-term, how do you see your role?

- **Knowledge curator** — continuously improving the frameworks the AI uses
- **Face of the product** — thought leadership, customer trust, brand
- **Co-founder/operator** — involved in product, sales, strategy
- **Steps back** — once the AI is trained, minimal involvement
- Some combination?

> **Jeff's answer: Co-founder/operator for one year then steps back once AI is trained**
> 

---

**11.5** Is there anything in the vision doc or your existing materials you're already **second-guessing** or know needs more thought?

> **Jeff's answer:  My only concern is that I am asking you to build too much up front but as I said that is based on what I know from building software with humans and I want you to prove that AI agents are better than humans at building something like this.  Prove you are better than a human!**
> 

---

> **Thanks Jeff.** Once you've filled this out, we'll synthesize your answers into a technical spec and start building. Don't stress about getting every answer perfect — we'll have plenty of chances to iterate.
>