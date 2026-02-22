# Go-to-Market AI — Technical Specification

**Version:** 1.0
**Date:** 2026-02-22
**Authors:** Mark Nutter, Jeff (GTM methodology), Claude (AI architecture)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Data Model](#5-data-model)
6. [Agent Architecture](#6-agent-architecture)
7. [Phase 1: GTM Playbook Workshop](#7-phase-1-gtm-playbook-workshop)
8. [Phase 2: Coaching & Improvements](#8-phase-2-coaching--improvements)
9. [Phase 3: Campaign Orchestration & Execution](#9-phase-3-campaign-orchestration--execution)
10. [Integration Specifications](#10-integration-specifications)
11. [Document Generation Pipeline](#11-document-generation-pipeline)
12. [Security & Multi-Tenancy](#12-security--multi-tenancy)
13. [MVP Roadmap](#13-mvp-roadmap)
14. [Cost Estimates](#14-cost-estimates)
15. [Open Questions & Risks](#15-open-questions--risks)

---

## 1. Executive Summary

Go-to-Market AI is an AI-powered platform that automates GTM consulting for B2B businesses. It encodes Jeff's proven GTM methodology (43 documents, 7 frameworks, validated across 4+ businesses) into a multi-agent AI system that can:

1. **Conduct a voice-driven workshop** to build a foundational GTM playbook (Phase 1)
2. **Coach the user** through improvements with a "positive aggressive" Socratic style (Phase 2)
3. **Orchestrate outbound campaigns** via Clay, Heyreach, and email tools with human approval gates (Phase 3)

**Primary user at launch:** Jeff (and consultants like him) using the tool with clients. The ongoing subscription is used by the founder/CEO directly, with the AI providing coaching.

**Business model:** $10K initial engagement + low-cost recurring subscription + optional human coaching ($2-5K/month).

**Launch ICPs:** (1) B2B SaaS startups, $0-10M ARR. (2) SMB manufacturing, $3-50M revenue.

**Success metric:** Jeff services 4 clients simultaneously in 16 hours/month total. Each client onboarded in 4 hours or less.

---

## 2. Product Overview

### 2.1 Three-Phase Product

| Phase | What it does | Primary interaction | Key output |
|-------|-------------|---------------------|------------|
| **Phase 1** | Build GTM playbook from uploaded materials + voice workshop | Voice-driven structured wizard | Positioning, elevator pitches, ICP, personas (Google Docs + Slides) |
| **Phase 2** | AI recommends improvements, coaches user through adoption | Text-based chat with Socratic coaching | Updated playbook + change summary document |
| **Phase 3** | Execute outbound campaigns via Clay + Heyreach + email | Dashboard + approval workflows | Running campaigns, contact lists, weekly scorecards |

### 2.2 User Roles

| Role | When active | UX assumptions |
|------|------------|----------------|
| **Consultant** (Jeff) | Phase 1 workshop, Phase 2 coaching sessions | Assumes GTM vocabulary. Power user. Voice input. |
| **Founder/CEO** | Ongoing subscription (Phase 2 coaching, Phase 3 monitoring) | Needs hand-holding. Text-first. AI teaches frameworks as it goes. |
| **Team member** | Phase 3 campaign review, content approval | Same permissions as founder in V1. |

### 2.3 White-Label Support

The platform must support white-labeling from day one:
- Custom branding (logo, colors, app name)
- Custom domain (via CNAME)
- Consultant's methodology can be uploaded alongside or replace Jeff's base frameworks
- Per-consultant tenant with their own set of client workspaces

---

## 3. Tech Stack

### 3.1 Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript | Best ecosystem for complex web apps with real-time features |
| **UI Components** | shadcn/ui + Tailwind CSS | Flexible, composable, good dark mode support |
| **Backend** | Python (FastAPI) | Superior AI/ML ecosystem, native support for python-pptx/python-docx, better agent orchestration libraries |
| **Database** | PostgreSQL (via Supabase) | Relational data + Row Level Security for multi-tenancy + built-in auth |
| **Vector Store** | pgvector (Supabase extension) | RAG over Jeff's knowledge base, no separate vector DB needed |
| **File Storage** | Supabase Storage (S3-compatible) | Uploaded documents, generated files, audio recordings |
| **Real-time** | Supabase Realtime (WebSocket) | Live updates for campaign status, workshop progress |
| **Hosting** | Vercel (frontend) + Railway or Fly.io (Python backend) | Vercel for Next.js, separate compute for Python agents |
| **Voice** | LiveKit (Cloud or self-hosted) | WebRTC transport for voice workshop |
| **Task Queue** | Celery + Redis | Long-running agent tasks, campaign execution, document generation |

### 3.2 AI Stack

| Component | Technology | Used for |
|-----------|-----------|----------|
| **Primary LLM** | Claude Opus/Sonnet (Anthropic) | Coaching, analysis, structured extraction, content generation |
| **Fast LLM** | Claude Haiku | Quick classification, routing, simple extractions |
| **Speech-to-Text** | Deepgram Nova-3 (streaming) | Real-time workshop transcription |
| **Text-to-Speech** | ElevenLabs or Cartesia | AI voice in workshop (optional) |
| **Embeddings** | Anthropic Voyage or OpenAI text-embedding-3-small | RAG over Jeff's knowledge base |
| **Web Search** | Tavily API or Exa | Real-time competitive intelligence, market data |

### 3.3 Integration Stack

| Service | Purpose | Integration method |
|---------|---------|-------------------|
| **Clay** | Contact enrichment + signal-driven list building | Webhooks (inbound) + HTTP actions (outbound). Pre-configured tables. Browser automation (Playwright) for table/signal creation. |
| **Heyreach** | LinkedIn outreach automation | REST API (leads, campaign mgmt) + webhooks (events). Campaign templates created in UI. |
| **Google Workspace** | Document output (Docs, Slides, Drive) | Google APIs (Drive for upload/export, service account auth) |
| **HubSpot** | CRM integration | REST API (contacts, deals, pipeline) |
| **PipeDrive** | CRM integration | REST API |
| **Close** | CRM integration | REST API |
| **Gong/Fathom** | Sales call analysis | API for transcript retrieval |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                   │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────────┐ │
│  │ Workshop │  │ Coaching │  │ Campaign  │  │  Project        │ │
│  │ Wizard   │  │ Chat     │  │ Dashboard │  │  Workspace      │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────────┬────────┘ │
│       │              │              │                  │          │
│       │         WebSocket      REST API          REST API        │
│       │              │              │                  │          │
│  LiveKit SDK         │              │                  │          │
│  (WebRTC)            │              │                  │          │
└──┬───────────────────┴──────────────┴──────────────────┴─────────┘
   │                          │
   │                          │
   ▼                          ▼
┌──────────────┐    ┌─────────────────────────────────────────────┐
│  LiveKit     │    │           BACKEND (FastAPI + Python)         │
│  Media       │    │                                              │
│  Server      │    │  ┌──────────────────────────────────────┐   │
│              │    │  │       Agent Orchestrator              │   │
│  - Consultant│    │  │                                      │   │
│    audio     │    │  │  ┌──────────┐  ┌──────────────────┐  │   │
│  - Client    │    │  │  │Positioning│  │  Persona         │  │   │
│    audio     │    │  │  │Agent     │  │  Agent           │  │   │
│  - AI Agent  │    │  │  └──────────┘  └──────────────────┘  │   │
│    audio     │    │  │  ┌──────────┐  ┌──────────────────┐  │   │
│              │    │  │  │Campaign  │  │  Content          │  │   │
│              │    │  │  │Agent     │  │  Agent            │  │   │
│              │    │  │  └──────────┘  └──────────────────┘  │   │
│              │    │  │  ┌──────────┐  ┌──────────────────┐  │   │
│              │    │  │  │Coaching  │  │  Integration      │  │   │
│              │    │  │  │Agent     │  │  Agent            │  │   │
│              │    │  │  └──────────┘  └──────────────────┘  │   │
│              │    │  └──────────────────────────────────────┘   │
│              │    │                                              │
│              │    │  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│              │    │  │ Celery   │  │ Redis  │  │ RAG Engine │  │
│              │    │  │ Workers  │  │        │  │ (pgvector) │  │
│              │    │  └──────────┘  └────────┘  └────────────┘  │
└──────────────┘    └──────────────────┬──────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │        SUPABASE (PostgreSQL)         │
                    │                                      │
                    │  - Users, orgs, projects             │
                    │  - Documents, playbooks               │
                    │  - Campaign data                      │
                    │  - Vector embeddings (pgvector)       │
                    │  - File storage (S3)                  │
                    │  - Row Level Security                 │
                    └──────────────────────────────────────┘
```

### 4.2 Voice Workshop Architecture

```
     Browser (WebRTC via LiveKit SDK)
    ┌──────────────────────────────────┐
    │  Consultant Mic    Client Mic    │
    │       │                 │        │
    │       ▼                 ▼        │
    │  [Separate audio tracks]         │
    └──────┬──────────────────┬────────┘
           │                  │
           ▼                  ▼
    ┌──────────────────────────────────┐
    │     LiveKit Media Server         │
    │  (separate track per participant)│
    └──────┬──────────────────┬────────┘
           │                  │
           ▼                  ▼
    ┌──────────────────────────────────┐
    │   Deepgram Nova-3 (Streaming)    │
    │   Two parallel WebSocket streams │
    │   Consultant → labeled transcript│
    │   Client → labeled transcript    │
    └──────────────┬───────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │   Claude (Sonnet/Opus)           │
    │                                  │
    │   - Workshop question script     │
    │   - Real-time structured extract │
    │   - Follow-up question generation│
    │   - Gap detection                │
    └──────────────┬───────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
    ┌────────────┐   ┌────────────────┐
    │ Text output│   │ TTS (optional) │
    │ on screen  │   │ AI speaks into │
    │            │   │ the workshop   │
    └────────────┘   └────────────────┘
```

**Key design decisions:**
- Separate audio tracks per participant via LiveKit eliminates diarization complexity
- AI participates as a LiveKit room participant (can listen and optionally speak)
- Claude processes the accumulating transcript with a sliding context window
- All audio is recorded and stored for later reference
- Structured data extraction happens in real-time as the conversation progresses

---

## 5. Data Model

### 5.1 Core Entities

```sql
-- Multi-tenancy: Organization is the top-level tenant
-- Supports white-label (consultant org → client workspaces)

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    -- White-label config
    branding JSONB DEFAULT '{}',  -- logo_url, primary_color, app_name
    custom_domain TEXT,
    -- Subscription
    plan TEXT DEFAULT 'trial',  -- trial, starter, pro, enterprise
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member',  -- owner, member (same permissions in V1)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- A project represents one client engagement / business
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    -- Business context
    industry TEXT,  -- 'saas' | 'manufacturing' | 'other'
    company_size TEXT,  -- revenue range
    company_url TEXT,
    -- Phase tracking
    current_phase INTEGER DEFAULT 1,  -- 1, 2, 3
    phase1_status TEXT DEFAULT 'not_started',
    phase2_status TEXT DEFAULT 'not_started',
    phase3_status TEXT DEFAULT 'not_started',
    -- Methodology selection
    sales_methodology TEXT,  -- 'challenger' | 'meddic' | auto-detected
    -- Voice/tone profile for content generation
    voice_profile JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Uploaded materials (sales decks, websites, docs, etc.)
CREATE TABLE project_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- pdf, docx, pptx, url, video, audio
    storage_path TEXT NOT NULL,  -- Supabase Storage path
    -- AI processing status
    processing_status TEXT DEFAULT 'pending',  -- pending, processing, complete, error
    extracted_text TEXT,  -- Full text extraction
    ai_summary TEXT,  -- AI-generated summary
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Workshop sessions (Phase 1 voice workshops)
CREATE TABLE workshop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    -- LiveKit room info
    livekit_room_name TEXT,
    -- Recording
    audio_recording_path TEXT,  -- Supabase Storage
    full_transcript JSONB,  -- Speaker-labeled transcript
    -- Progress
    checklist_section TEXT,  -- Current section: A, B, C, etc.
    questions_asked JSONB DEFAULT '[]',
    answers_extracted JSONB DEFAULT '{}',
    status TEXT DEFAULT 'scheduled',  -- scheduled, in_progress, complete
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Generated playbook documents
CREATE TABLE playbook_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    doc_type TEXT NOT NULL,
    -- 'positioning', 'elevator_pitch_2min', 'elevator_pitch_2sentence',
    -- 'icp', 'personas', 'market_analysis', 'lead_gen_description',
    -- 'growth_goals', 'full_playbook', 'slide_deck',
    -- 'change_summary', 'website_recommendations'
    phase INTEGER NOT NULL,  -- 1 or 2
    version INTEGER DEFAULT 1,
    -- Content
    content JSONB NOT NULL,  -- Structured content
    -- Google Workspace
    google_doc_id TEXT,  -- Google Docs/Slides file ID
    google_doc_url TEXT,  -- Shareable URL
    -- Export paths
    pdf_path TEXT,
    docx_path TEXT,
    pptx_path TEXT,
    status TEXT DEFAULT 'draft',  -- draft, review, final
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Coaching conversations (Phase 2)
CREATE TABLE coaching_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    topic TEXT NOT NULL,  -- 'positioning', 'icp', 'messaging', etc.
    status TEXT DEFAULT 'active',  -- active, resolved
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coaching_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES coaching_threads(id) NOT NULL,
    role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    -- If the AI made a recommendation
    recommendation JSONB,  -- {type, description, rationale, expected_outcome}
    recommendation_status TEXT,  -- null, 'accepted', 'rejected', 'modified'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns (Phase 3)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name TEXT NOT NULL,
    -- Campaign template fields (Jeff's structure)
    campaign_goal TEXT,
    target_customer JSONB,  -- ICP details
    target_persona JSONB,  -- Persona details
    problem_value_hypothesis JSONB,  -- situation, problem, impact, outcome
    angle TEXT,  -- 'pain' | 'insight' | 'trigger' | 'proof'
    offer TEXT,
    -- Execution
    channel TEXT NOT NULL,  -- 'email', 'linkedin', 'multi'
    status TEXT DEFAULT 'draft',
    -- draft, pending_approval, approved, active, paused, completed
    -- Integration references
    heyreach_campaign_id TEXT,
    email_tool_campaign_id TEXT,
    -- Performance
    metrics JSONB DEFAULT '{}',
    -- {sent, opened, replied, meetings_booked, open_rate, reply_rate}
    -- Guardrails (defaults from Jeff's rules, overridable)
    max_accounts INTEGER DEFAULT 300,
    max_contacts_per_company INTEGER DEFAULT 2,
    max_email_words INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    -- Contact data (from Clay enrichment)
    company_name TEXT,
    person_name TEXT,
    title TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    -- Signal that triggered this contact
    signal_type TEXT,
    signal_details JSONB,
    -- Status
    status TEXT DEFAULT 'pending',
    -- pending, approved, added_to_tool, active, responded, converted
    -- Integration references
    heyreach_lead_id TEXT,
    crm_contact_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    content_type TEXT NOT NULL,  -- 'email_sequence', 'linkedin_sequence', 'phone_script'
    -- Two variations as per Jeff's requirement
    variation TEXT NOT NULL,  -- 'a', 'b'
    sequence_data JSONB NOT NULL,
    -- [{step: 1, subject, body, delay_days}, ...]
    status TEXT DEFAULT 'draft',  -- draft, pending_review, approved
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Signal-driven marketing plays
CREATE TABLE marketing_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    -- Signal configuration
    signal_type TEXT NOT NULL,
    -- 'job_change', 'funding_round', 'tech_change', 'hiring', 'news', etc.
    signal_criteria JSONB NOT NULL,  -- Clay-compatible criteria
    -- Associated campaign template
    campaign_template JSONB,
    -- Execution
    frequency TEXT DEFAULT 'monthly',  -- monthly, weekly
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly scorecards (Phase 3 reporting)
CREATE TABLE scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    week_start DATE NOT NULL,
    metrics JSONB NOT NULL,
    -- {impressions, contacts, leads, mqls, sqls,
    --  campaigns_active, emails_sent, open_rate, reply_rate,
    --  linkedin_connections, meetings_booked}
    ai_analysis TEXT,  -- AI-generated weekly summary
    recommendations JSONB,  -- AI suggestions for next week
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RAG: Jeff's knowledge base embeddings
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_doc TEXT NOT NULL,  -- Original document name
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    -- Metadata for retrieval filtering
    category TEXT,
    -- 'positioning', 'messaging', 'persona', 'outbound', 'sales_process',
    -- 'demo_strategy', 'content_strategy', 'deal_management'
    framework TEXT,  -- 'challenger', 'sarah_day', 'meddic', 'jeff_original'
    -- Vector embedding
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_uploads ENABLE ROW LEVEL SECURITY;
-- ... (all tables)
```

### 5.2 Row Level Security Policies

```sql
-- Users can only see their own organization's data
CREATE POLICY "org_isolation" ON projects
    USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- File uploads are strictly isolated
CREATE POLICY "upload_isolation" ON project_uploads
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    ));

-- Same pattern for all project-scoped tables
```

---

## 6. Agent Architecture

### 6.1 Agent Overview

Six specialist agents + one orchestrator. Each agent has access to the RAG knowledge base (Jeff's methodology) but specializes in a domain.

```
┌──────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                          │
│                                                                │
│  - Routes tasks to specialist agents                          │
│  - Enforces methodology sequence                              │
│  - Maintains cross-agent consistency                          │
│  - Manages conversation state and context                     │
│  - Determines Challenger vs MEDDIC methodology                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   SPECIALIST AGENTS                       │ │
│  │                                                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │
│  │  │ Positioning │  │  Persona    │  │  Campaign   │      │ │
│  │  │ & Story     │  │  Definer    │  │  Designer   │      │ │
│  │  │ Architect   │  │             │  │             │      │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │
│  │                                                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │
│  │  │  Coaching   │  │  Content &  │  │ Integration │      │ │
│  │  │  Agent      │  │  Lead Gen   │  │ Agent       │      │ │
│  │  │             │  │  Engine     │  │ (Clay/HR)   │      │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Agent Specifications

#### Orchestrator Agent
- **Model:** Claude Sonnet (fast routing + oversight)
- **Responsibilities:**
  - Accept high-level tasks ("create positioning for this client")
  - Determine which specialist agent(s) to invoke
  - Enforce methodology sequence: ICP → Positioning → Messaging → Outbound
  - Detect whether Challenger or MEDDIC methodology is appropriate based on product/market
  - Ensure cross-document consistency (personas referenced in campaigns match persona definitions)
  - Manage long-running workflows across multiple phases

#### Agent 1: Positioning & Story Architect
- **Model:** Claude Opus (highest quality for strategic output)
- **RAG sources:** GTM Narrative, 2-Min Pitch, Messaging Matrix, Challenger framework
- **Input:** Business description, uploaded materials, workshop transcript
- **Output:** Positioning statement, "Our Why," elevator pitches (2-min and 2-sentence), messaging elements
- **Key behavior:** Applies Symptom → Problem → Root Cause → Solution arc. Identifies the user's "beliefs to break" and crafts challenger insight.

#### Agent 2: Persona Definer
- **Model:** Claude Sonnet
- **RAG sources:** Persona Guide, ICP definition templates
- **Input:** Target market description, business context, sales data
- **Output:** ICP descriptions, buyer/user persona profiles
- **Template:** Simplified 8-section version for V1 (required: scope, core problems, buying triggers, discovery questions, sample messaging; optional: beliefs to challenge, internal alignment notes, value messages)

#### Agent 3: Campaign Designer
- **Model:** Claude Sonnet
- **RAG sources:** Outbound Campaign Planning Template, Outbound Plays Menu
- **Input:** ICP, messaging, campaign goal
- **Output:** Campaign plan following Jeff's 7-step template + email/LinkedIn sequences (2 tone variations, under 100 words)
- **Key behavior:** Enforces guardrails (list size, contacts per company, multi-channel cadence). Generates Problem-Value Hypothesis. Pre-fills template with AI-recommended defaults.

#### Agent 4: Coaching Agent
- **Model:** Claude Opus (needs maximum nuance for coaching)
- **RAG sources:** All frameworks
- **Input:** Current playbook state, user conversation
- **Output:** Recommendations, follow-up questions, change summaries
- **Personality:** "Positive aggressive" — Socratic by default, gets specific when user is stuck. Never sugar coats. Challenges weak positioning/ICPs with data. Always offers solutions alongside criticism.

#### Agent 5: Content & Lead Gen Engine
- **Model:** Claude Sonnet
- **RAG sources:** Lead Gen Engine plan, content strategy frameworks
- **Input:** Monthly themes, ICP, messaging
- **Output:** Blog posts, LinkedIn posts, email copy, content calendar
- **Key behavior:** Ghostwrites in the user's voice (trained on uploaded materials and voice profile). Flags all output for human review (unless full-automation mode is enabled).

#### Agent 6: Integration Agent
- **Model:** Claude Sonnet + tool use
- **Tools:** Clay webhooks, Heyreach API, CRM APIs, web search
- **Input:** Campaign plans, contact criteria, signal definitions
- **Output:** Enriched contact lists, campaign setups in external tools, CRM sync
- **Key behavior:** Translates plain-English signal descriptions into Clay table criteria. Pushes approved contacts to Heyreach. Syncs with CRM.

### 6.3 Agent Implementation

Each agent is implemented as a Python class with:

```python
class BaseAgent:
    """Base class for all specialist agents."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.llm = AnthropicClient()
        self.rag = RAGEngine(project_id)

    async def run(self, task: AgentTask) -> AgentResult:
        # 1. Retrieve relevant knowledge base chunks
        context = await self.rag.retrieve(task.query, category=self.category)

        # 2. Build system prompt with agent personality + methodology
        system_prompt = self.build_system_prompt(context)

        # 3. Execute with tool use (if needed)
        result = await self.llm.create_message(
            model=self.model,
            system=system_prompt,
            messages=task.messages,
            tools=self.tools,
        )

        # 4. Validate output against schema
        validated = self.validate_output(result)

        return AgentResult(content=validated, agent=self.name)
```

### 6.4 RAG Knowledge Base

Jeff's 43 documents are processed as follows:

1. **Extraction:** Convert all docs (DOCX, PDF, PPTX, XLSX) to text
2. **Chunking:** Split into semantic chunks (~500-1000 tokens each) with overlap
3. **Metadata tagging:** Each chunk tagged with category, framework, and document source
4. **Embedding:** Generate vector embeddings (Voyage or OpenAI)
5. **Storage:** PostgreSQL with pgvector extension

**Retrieval strategy:**
- Filter by category first (e.g., "positioning" chunks for the Positioning Agent)
- Semantic search within the filtered set
- Include 3-5 most relevant chunks in the agent's context
- Always include the relevant template structure as a "required" chunk

**Important:** All Parallax-specific data used anonymously. The AI never references specific companies from the training data to users.

---

## 7. Phase 1: GTM Playbook Workshop

### 7.1 Pre-Workshop Upload

Before the voice workshop, the user uploads available materials via a structured upload wizard:

```
Upload Wizard Steps:
1. Company basics (name, website URL, industry, revenue range)
2. Existing materials upload:
   - Positioning / value prop documents
   - Sales deck(s)
   - Website URL (auto-crawled and analyzed)
   - 1-pager / company overview
   - Customer list (CSV with revenue data)
   - Social profiles (LinkedIn company page URL)
   - Blog posts / content (URL or files)
   - Videos (URLs)
   - Any other relevant documents
3. Review & confirm uploads
```

**Processing pipeline for uploads:**
1. File upload → Supabase Storage
2. Text extraction (PDF: PyMuPDF, DOCX: python-docx, PPTX: python-pptx, URL: web scraper)
3. AI summarization per document (Claude Haiku)
4. Gap analysis: What's missing from the Master Checklist?
5. Workshop question generation based on gaps

### 7.2 Voice Workshop Flow

```
Workshop Structure (mapped to Jeff's Master Checklist):

Section A: Positioning & Value Props (~45 min)
├── AI reviews uploaded positioning materials
├── Asks probing questions about gaps
├── Discusses "Our Why" and problem/solution narrative
├── Validates or challenges current positioning
└── Extracts: positioning statement, value props, problem narrative

Section B: Target Market & ICP (~30 min)
├── Discusses target customers and segments
├── Probes on best/worst customer examples
├── Identifies buying triggers and signals
└── Extracts: ICP definition(s), market characteristics

Section C: Personas (~30 min)
├── Discusses who buys and who uses the product
├── Probes on decision-making dynamics
├── Maps persona to ICP segments
└── Extracts: persona profiles (simplified 8-section template)

Section D: Market Sizing (~15 min)
├── Discusses TAM/SAM based on ICP
├── Supplements with AI's market knowledge
└── Extracts: market size estimates, competitive landscape notes

Section E: Elevator Pitches (~15 min)
├── AI drafts 2-min and 2-sentence pitches from extracted data
├── Reads them aloud (or displays) for feedback
├── Iterates based on consultant/client reaction
└── Extracts: finalized pitch variations

Total estimated time: ~2-3 hours
```

**AI behavior during workshop:**
- Displays the current question on screen and optionally speaks it
- Listens to the conversation between consultant and client
- Extracts structured answers in real-time
- Shows a progress indicator for each section
- Can be asked to repeat, clarify, or skip questions
- Generates follow-up questions based on answers (not just a fixed script)
- Adapts depth of questioning based on quality of uploaded materials

### 7.3 Post-Workshop Document Generation

After the workshop, the AI generates the following (minimum V1 outputs):

| Document | Format | Details |
|----------|--------|---------|
| Positioning Statement | Google Doc section | "Our Why" + value props + problems solved |
| 2-Minute Elevator Pitch | Google Doc section | Narrative distillation |
| 2-Sentence Elevator Pitch | Google Doc section | Conversation starter |
| ICP Descriptions | Google Doc section | Per-segment with characteristics |
| Persona Definitions | Google Doc section | Simplified 8-section template per persona |
| **Full Playbook** | Google Doc | All above assembled into one formatted document |
| **Slide Deck** | Google Slides | 7-15 slides summarizing the playbook |

**Generation pipeline:**
1. Claude Opus generates structured JSON content for each document type
2. Python backend renders JSON → DOCX (python-docx) and JSON → PPTX (python-pptx) using branded templates
3. Upload to Google Drive with auto-conversion to Google Docs/Slides
4. Share with user's email via Drive API
5. Generate PDF/DOCX/PPTX export links

---

## 8. Phase 2: Coaching & Improvements

### 8.1 Recommendation Generation

After Phase 1 playbook is finalized, the Coaching Agent:

1. **Analyzes** the complete playbook against Jeff's frameworks
2. **Researches** the user's market (real-time web search for competitors, trends, keywords)
3. **Generates** a prioritized list of recommendations grouped by category:
   - Positioning improvements
   - Messaging refinements
   - ICP adjustments
   - Persona updates
   - Website copy recommendations (detailed spec document)
4. **Creates** a "Recommendations Brief" document with each recommendation's what/why/expected outcome

### 8.2 Coaching Conversation

The coaching interface is a **text-based chat** (not voice) organized by topic threads:

```
Project Workspace
├── Coaching Threads
│   ├── Positioning Improvements (3 recommendations)
│   ├── ICP Refinement (2 recommendations)
│   ├── Messaging Updates (4 recommendations)
│   └── Website Recommendations (1 comprehensive doc)
```

**Coaching personality rules:**
- **Default:** Socratic — ask questions to lead user to the right answer
- **If user is stuck:** Get specific with recommendations
- **If user pushes back with weak reasoning:** Challenge firmly with data
- **If user says "just tell me":** Switch to direct recommendation mode
- **Always:** Offer solutions alongside criticism. Be motivational but honest.
- **Never:** Sugar coat. Defer to obviously bad decisions. Let the user lead themselves astray.

### 8.3 Approval & Document Update

1. User accepts/rejects/modifies each recommendation via the coaching chat
2. Once all recommendations are resolved, AI generates:
   - **Updated playbook** (clean replacement of Phase 1 version)
   - **Change summary document** — what changed, why, and anticipated improved outcome per change
   - **Updated slide deck**
   - **Website recommendations document** — detailed, specific copy/structure suggestions formatted as requirements for a website builder

---

## 9. Phase 3: Campaign Orchestration & Execution

### 9.1 Campaign Planning

The Campaign Designer Agent walks the user through Jeff's 7-step campaign template:

```
For each campaign:
1. Campaign Goal → AI suggests based on growth goals and ICP
2. Target Customer → Pulled from finalized ICP
3. Target Persona → Pulled from finalized personas
4. Data Needed → AI identifies enrichment fields needed
5. Problem-Value Hypothesis → AI drafts (Situation→Problem→Impact→Outcome)
6. Angle → AI recommends (Pain/Insight/Trigger/Proof-led)
7. Offer → AI suggests conversation/asset type

AI pre-fills each step with recommended defaults.
User reviews, edits, approves each step.
```

### 9.2 Content Generation

For each approved campaign, the Content Agent generates:

- **Email sequence:** 3-touch cadence, 2 tone variations (A/B), under 100 words each
- **LinkedIn sequence:** Connection request message + 2-3 follow-ups
- **Phone script:** Brief talking points (if phone is in cadence)

All content:
- Ghostwritten in the user's voice (from voice profile)
- Flagged for human review before execution
- Follows Jeff's rules: no em-dashes, no overly polished phrasing, feels human

### 9.3 Signal-Driven List Building (Clay Integration)

**The challenge:** Clay has no API for creating tables or signal configurations. Only webhooks for pushing data in.

**Solution — hybrid approach:**

```
User describes signal in plain English
        │
        ▼
Integration Agent translates to Clay criteria
        │
        ▼
┌─────────────────────────────────────────────┐
│  Option A: Guided Setup (V1 MVP)            │
│                                              │
│  Agent generates:                            │
│  - Step-by-step Clay table setup guide       │
│  - Column definitions and enrichment config  │
│  - Filter criteria to apply                  │
│  - Screenshot/video walkthrough (generated)  │
│                                              │
│  User sets up in Clay following the guide    │
│  Clay sends results to app via webhook       │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Option B: Browser Automation (V1.1+)       │
│                                              │
│  Agent uses Playwright/Browserbase to:       │
│  - Log into user's Clay account              │
│  - Create tables programmatically            │
│  - Configure enrichment columns              │
│  - Set up signals/automations                │
│  - Run enrichment and export results         │
│                                              │
│  Requires user to provide Clay credentials   │
└─────────────────────────────────────────────┘
```

**Webhook integration (both options):**
- Each project gets a unique webhook URL
- Clay sends enriched contacts to the app via HTTP POST
- App stores contacts in `campaign_contacts` table
- User reviews and approves contact list in the app

### 9.4 Campaign Execution (Heyreach Integration)

```
Approved contact list + approved campaign content
        │
        ▼
Integration Agent via Heyreach API:
1. Pre-created campaign template in Heyreach (one-time setup per sequence type)
2. Add approved leads to campaign via API
   - POST /api/public/campaigns/{id}/leads
   - Include LinkedIn profile URL + personalization fields
3. Campaign starts (user clicks "Launch" in app)
4. Webhooks stream events back:
   - Connection request sent/accepted
   - Message sent/replied
   - InMail sent/replied
5. App updates campaign_contacts status in real-time
6. Weekly scorecard generated from aggregated metrics
```

### 9.5 Human Approval Gates

Every execution step requires explicit human approval:

| Action | Approval required | Bypass available |
|--------|-------------------|------------------|
| Contact list from Clay | Yes — review list in app | "Full automation" config (default OFF) |
| Campaign content (emails/LinkedIn) | Yes — review each variation | "Full automation" config (default OFF) |
| Launch campaign | Yes — explicit "Launch" button | Never auto-launched |
| Pause underperforming campaign | Auto-pause, human notified | Can disable auto-pause |

### 9.6 Campaign Monitoring & Scorecards

The app monitors active campaigns and generates:

- **Real-time dashboard:** Campaign status, sent/opened/replied/meetings metrics
- **Auto-pause rules:** If open rate < 5% or spam complaint rate > 0.5%, auto-pause and notify user with AI diagnosis
- **Weekly scorecard:** Generated every Monday, includes:
  - Metrics per campaign (impressions → contacts → leads → MQLs → SQLs)
  - AI analysis of what worked and what didn't
  - Specific recommendations for the coming week
  - Comparison to previous weeks

---

## 10. Integration Specifications

### 10.1 Clay

| Aspect | Detail |
|--------|--------|
| **Minimum plan required** | Explorer ($314/month) for webhooks |
| **Integration method** | Inbound webhooks (push data to app) + Guided setup (V1) or browser automation (V1.1) |
| **Rate limits** | 10 records/second, 50K records per webhook source |
| **Auth** | API key for webhook verification |
| **Data flow** | App defines criteria → User/agent sets up Clay table → Clay enriches → Webhook sends results to app |

### 10.2 Heyreach

| Aspect | Detail |
|--------|--------|
| **Minimum plan required** | Growth ($79/month per seat) |
| **Integration method** | REST API + Webhooks |
| **Rate limits** | 300 requests/minute |
| **Auth** | API key via `X-API-KEY` header |
| **Key endpoints** | Add leads to campaign, pause/resume campaigns, get stats |
| **LinkedIn limits** | 20-40 connection requests/day per sender, ~100-150/week |
| **Campaign creation** | UI-only. Pre-create templates, API adds leads. |
| **MCP server available** | Yes (heyreach-mcp, 11 tools) |

### 10.3 Google Workspace

| Aspect | Detail |
|--------|--------|
| **Auth** | Service account (server-side generation) + OAuth for user file access |
| **Document generation** | python-docx → DOCX → upload to Drive with conversion |
| **Slide generation** | python-pptx → PPTX → upload to Drive with conversion |
| **Export** | Drive API `files.export` to PDF, DOCX, PPTX |
| **Sharing** | Drive API permission grants to user email |
| **Rate limits** | 60 write requests/min (batched), 12K Drive requests/min |

### 10.4 CRM Integrations (V1: HubSpot, PipeDrive, Close)

| Feature | Implementation |
|---------|---------------|
| **Contact sync** | Push enriched contacts from campaigns to CRM |
| **Deal creation** | Create deal/opportunity when meeting is booked |
| **Pipeline tracking** | Read deal stages for scorecard metrics |
| **Activity logging** | Log outreach activities (emails, LinkedIn touches) |
| **Auth** | OAuth2 for all three CRMs |

### 10.5 Gong/Fathom (Sales Call Analysis)

| Feature | Implementation |
|---------|---------------|
| **Transcript retrieval** | Pull call transcripts via API |
| **AI analysis** | Claude analyzes transcripts for: objections, questions asked, pain points mentioned, competitor mentions |
| **Feedback loop** | Insights fed back into persona refinement and messaging optimization |
| **Auth** | OAuth2 |

---

## 11. Document Generation Pipeline

### 11.1 Template System

```
/templates/
├── docs/
│   ├── playbook_template.docx      # Full playbook with styles
│   ├── change_summary_template.docx # Phase 2 change summary
│   └── website_recs_template.docx   # Website recommendations
├── slides/
│   ├── playbook_deck_template.pptx  # 7-15 slide branded deck
│   └── layouts/
│       ├── title_slide.pptx
│       ├── content_slide.pptx
│       ├── two_column_slide.pptx
│       └── section_divider_slide.pptx
└── branding/
    ├── default/                      # Default G2M AI branding
    │   ├── logo.png
    │   ├── colors.json
    │   └── fonts.json
    └── {org_id}/                     # White-label branding per org
        ├── logo.png
        ├── colors.json
        └── fonts.json
```

### 11.2 Generation Flow

```
Agent generates structured JSON
        │
        ▼
Document Renderer (Python)
├── Load template (DOCX or PPTX)
├── Apply branding (logo, colors, fonts)
├── Populate content from JSON
├── Handle tables, lists, images
└── Save to temp file
        │
        ▼
Google Drive Upload
├── Upload file with conversion flag
├── Set mimeType to Google Docs/Slides format
├── Grant permissions to user's email
└── Return shareable URL
        │
        ▼
Export Generation (on demand)
├── PDF export via Drive API
├── DOCX/PPTX export via Drive API
└── Store in Supabase Storage with download URL
```

---

## 12. Security & Multi-Tenancy

### 12.1 Data Isolation (HARD RULE)

- **PostgreSQL Row Level Security (RLS)** on every table, scoped to `org_id`
- **Supabase Storage** buckets scoped to org: `/{org_id}/uploads/`, `/{org_id}/generated/`
- **Google Drive** files scoped to project — service account creates files, shares only with org members
- **Vector embeddings** in RAG: Jeff's knowledge base is shared (read-only), but user-uploaded documents are embedded per-project with org_id filter
- **No cross-tenant data leakage** in LLM prompts — user data from one org never appears in another org's agent context

### 12.2 Authentication

- **Supabase Auth** (email/password + Google OAuth + Magic link)
- **Service account** for Google Workspace API (server-side)
- **API keys** stored encrypted in database for: Clay, Heyreach, CRM integrations
- **OAuth tokens** for CRM integrations, stored encrypted with refresh token rotation

### 12.3 Secrets Management

- API keys (Anthropic, Deepgram, ElevenLabs, etc.) in environment variables
- User-provided API keys (Clay, Heyreach, CRM) encrypted at rest in PostgreSQL
- No secrets in client-side code

### 12.4 "Full Automation" Mode

- Default: OFF (all campaign actions require human approval)
- Toggle in project settings with confirmation dialog and warning
- When enabled: campaigns can auto-execute after AI generation without human review
- Audit log tracks all automated actions for accountability

---

## 13. MVP Roadmap

### 13.1 MVP (V1.0) — Target: Jeff uses it with a real client

**Scope:**

| Feature | Status | Priority |
|---------|--------|----------|
| **Phase 1: Upload wizard** | In scope | P0 |
| **Phase 1: Voice workshop** (LiveKit + Deepgram + Claude) | In scope | P0 |
| **Phase 1: Document generation** (5 doc types + playbook + slides) | In scope | P0 |
| **Phase 1: Google Docs/Slides output** | In scope | P0 |
| **Phase 2: Coaching chat** (text-based, Socratic style) | In scope | P0 |
| **Phase 2: Updated playbook + change summary** | In scope | P0 |
| **Phase 3: Campaign planning** (7-step template walkthrough) | In scope | P1 |
| **Phase 3: Content generation** (email + LinkedIn sequences) | In scope | P1 |
| **Phase 3: Clay guided setup** (instructions, not browser automation) | In scope | P1 |
| **Phase 3: Heyreach API integration** | In scope | P1 |
| **Phase 3: Campaign dashboard + weekly scorecard** | In scope | P1 |
| **Multi-user per org** (same permissions) | In scope | P1 |
| **White-label branding** | In scope | P2 |
| **CRM integration** (HubSpot, PipeDrive, Close) | In scope | P2 |
| **Gong/Fathom integration** | In scope | P2 |
| **Full automation mode** | In scope | P2 |
| **Clay browser automation** | Post-V1 | P3 |
| **Sales process coaching** (Stages 0-6) | Post-V1 | P3 |
| **Spreadsheet outputs** (scorecards, forecasters) | Post-V1 | P3 |
| **Content pillars** (podcast, video, web events) | Post-V1 | P3 |

### 13.2 Build Phases

#### Build Phase A: Foundation (Week 1-2)
- [ ] Project scaffolding (Next.js + FastAPI + Supabase)
- [ ] Authentication (Supabase Auth)
- [ ] Database schema + RLS policies
- [ ] Basic project CRUD (create org, create project)
- [ ] File upload pipeline (upload → storage → text extraction)
- [ ] RAG knowledge base (ingest Jeff's 43 docs, chunk, embed, store)

#### Build Phase B: Voice Workshop (Week 3-4)
- [ ] LiveKit integration (room creation, token generation)
- [ ] WebRTC audio in browser (separate tracks per participant)
- [ ] Deepgram streaming transcription (two parallel streams)
- [ ] Workshop question engine (question script + follow-up generation)
- [ ] Real-time structured data extraction (Claude processes transcript)
- [ ] Workshop UI (progress indicator, current question, extracted answers panel)

#### Build Phase C: Document Generation (Week 5)
- [ ] Document templates (DOCX + PPTX) with branding
- [ ] python-docx renderer (playbook document)
- [ ] python-pptx renderer (slide deck)
- [ ] Google Drive upload + conversion + sharing
- [ ] Export to PDF/DOCX/PPTX
- [ ] Project workspace UI (view generated documents, download links)

#### Build Phase D: Coaching & Phase 2 (Week 6-7)
- [ ] Coaching agent implementation
- [ ] Recommendation generation pipeline
- [ ] Real-time web search for competitive intelligence
- [ ] Coaching chat UI (threaded by topic)
- [ ] Recommendation accept/reject/modify flow
- [ ] Updated document generation (playbook v2 + change summary)
- [ ] Website recommendations document generation

#### Build Phase E: Campaign Orchestration (Week 8-10)
- [ ] Campaign planning wizard (7-step template)
- [ ] Campaign content generation (email + LinkedIn + phone)
- [ ] Clay webhook integration (receive enriched contacts)
- [ ] Heyreach API integration (add leads, manage campaigns)
- [ ] Campaign dashboard UI (status, metrics, approval gates)
- [ ] Auto-pause logic + weekly scorecard generation
- [ ] Marketing plays / signal-driven list builder

#### Build Phase F: Polish & Launch (Week 11-12)
- [ ] Multi-user support
- [ ] White-label branding system
- [ ] CRM integrations (HubSpot, PipeDrive, Close)
- [ ] Gong/Fathom integration
- [ ] End-to-end testing with Jeff
- [ ] Bug fixes and UX polish
- [ ] Deploy to production

### 13.3 Testing Strategy

- **Jeff uses it with a real client** as the acceptance test for each build phase
- Phase A+B+C: Can Jeff run a voice workshop and get a playbook document?
- Phase D: Can the coaching agent produce useful recommendations?
- Phase E: Can campaigns be planned, content generated, and contacts pushed to Heyreach?

---

## 14. Cost Estimates

### 14.1 Per-Workshop Costs (Phase 1)

| Component | Cost per 2-hour workshop |
|-----------|-------------------------|
| Deepgram STT (2 streams × 120 min) | ~$1.85 |
| Claude Opus (structured extraction, ~100K tokens) | ~$3.00 |
| Claude Sonnet (follow-up generation, ~50K tokens) | ~$0.75 |
| TTS (AI speaks ~20 min total) | ~$0.50 |
| Google Drive API | Free (within quota) |
| **Total per workshop** | **~$6.10** |

### 14.2 Per-Month Costs (Phase 2 + 3, per client)

| Component | Cost estimate |
|-----------|---------------|
| Coaching conversations (Claude Opus, ~200K tokens/month) | ~$6.00 |
| Campaign content generation (Claude Sonnet, ~100K tokens/month) | ~$1.50 |
| Web search for intelligence (Tavily, ~50 queries) | ~$2.50 |
| Weekly scorecard generation (4 × Claude Sonnet) | ~$0.60 |
| **Total per client/month (AI costs)** | **~$10.60** |

### 14.3 Infrastructure Costs

| Service | Monthly cost |
|---------|-------------|
| Supabase (Pro plan) | $25 |
| Vercel (Pro plan) | $20 |
| Railway/Fly.io (Python backend) | ~$20-50 |
| Redis (for Celery) | ~$10 |
| LiveKit Cloud (or self-hosted) | ~$20-50 |
| **Total infrastructure** | **~$95-155/month** |

### 14.4 External Tool Costs (per client)

| Tool | Cost | Notes |
|------|------|-------|
| Clay (Explorer) | $314/month | Shared across clients if consultant manages |
| Heyreach (Growth) | $79/month per seat | Per LinkedIn sender account |

### 14.5 Unit Economics

At $10K initial + $500/month subscription per client:
- **Workshop cost:** ~$6 (AI) → 99.9% margin
- **Monthly cost:** ~$11 (AI) + ~$40 (infrastructure share for 4 clients) → ~$450 margin on $500/month
- **Jeff's time:** 4 hours/month × 4 clients = 16 hours → $80/hour effective rate plus the $10K upfronts

---

## 15. Open Questions & Risks

### 15.1 Open Questions

| # | Question | Impact | Proposed resolution |
|---|----------|--------|-------------------|
| 1 | **Clay's lack of API** — guided setup creates friction. Browser automation adds complexity. Should we evaluate alternatives like pipe0 or direct Apollo/Seamless APIs? | High | Start with guided setup (V1). Evaluate browser automation and direct enrichment APIs in parallel. |
| 2 | **Voice workshop UX** — Jeff wants the AI to "listen" to a conversation between 2 people. How does the AI decide when to interject with a new question? | Medium | Use Claude to detect when a topic is sufficiently covered (via transcript analysis) and signal the next question. Display on screen + optional voice. |
| 3 | **Methodology auto-detection** — Challenger vs MEDDIC selection. How much context does the AI need to accurately determine which methodology fits? | Medium | Ask 2-3 classification questions during upload wizard (product maturity, buyer awareness, deal complexity). Use decision tree + AI judgment. |
| 4 | **Compliance flagging** — Jeff said "I don't know." Should we add basic industry compliance awareness? | Low | Out of scope for V1. Revisit based on customer demand. |
| 5 | **Voice profile / tone learning** — How much content does the AI need to learn a user's writing voice? | Medium | Minimum: 3-5 samples of the user's writing (blog posts, emails, LinkedIn). Use few-shot examples in prompts. Fine-tuning if needed later. |

### 15.2 Key Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Scope creep** — Jeff's concern that we're building too broadly | High | Strict MVP scoping. Phase 1 must work end-to-end before Phase 2 starts. Jeff tests with a real client at each phase gate. |
| **Over-indexing on Parallax** — AI outputs feel too SaaS-specific for manufacturing | Medium | Explicitly test with manufacturing scenarios. Add manufacturing-specific examples to knowledge base. Bias RAG retrieval toward the user's stated industry. |
| **Clay integration friction** — Guided setup may be too manual for the "hours not weeks" promise | Medium | Invest early in understanding if browser automation (Playwright + Browserbase) is viable. Have a fallback plan using direct enrichment APIs (Apollo, People Data Labs). |
| **Voice workshop reliability** — STT errors, missed context, lost audio | Medium | Record all audio as backup. Allow text input as fallback. Post-workshop review step where user can correct extracted answers. |
| **Quality consistency** — AI outputs vary in quality between runs | Medium | Use structured output schemas (JSON mode). Validate against templates. Jeff reviews first 10 workshops to calibrate prompts. |
| **Multi-agent coordination** — Agents produce inconsistent outputs | Medium | Orchestrator validates cross-agent consistency. Shared project context (playbook state) is the single source of truth, not individual agent memory. |

---

*This spec will be updated as we build and learn. The source of truth for product decisions is Jeff's interview answers + this document.*
