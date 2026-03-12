# AGENTS.md — CoachK

**CoachK is a production-ready Next.js SaaS starter.** Its entire purpose is to eliminate the infrastructure boilerplate that every web app needs. When working on a project based on CoachK, **do not reimplement anything listed here** — it is already done.

---

## GitHub Workflow

- For any significant implementation, bug fix, refactor, or other multi-file change, create a GitHub issue before editing code.
- Do the work on a branch named from that issue, for example `feat/123-short-description` or `fix/123-short-description`.
- Open a pull request tied to the issue when the work is ready.
- Small read-only exploration, one-off local diagnostics, and tiny documentation-only edits do not require an issue/branch/PR unless the user asks for one.

---

## ⚡ Quick Reference: Don't Build These, They're Already Here

| You need… | Use this instead |
|---|---|
| User sign up / sign in / sign out | `authClient` from `@/lib/auth-client` |
| OAuth (Google, GitHub) | Already configured in `lib/auth.ts` |
| Two-factor authentication (TOTP) | `authClient.twoFactor.*` — fully wired |
| Email verification | Automatic on signup via Better Auth hook |
| Password reset flow | `authClient.requestPasswordReset()` + `/forgot-password` page |
| Session check in API route | `auth.api.getSession({ headers: request.headers })` |
| Session check in middleware | `getSessionCookie()` from `better-auth/cookies` |
| SQLite database | `getDb()` from `@/lib/db` |
| Sending email | `sendWelcomeEmail`, `sendVerificationEmail`, etc. in `@/lib/email` |
| Stripe checkout | `POST /api/stripe/create-checkout` |
| Stripe billing portal | `GET /api/stripe/portal` |
| User subscription status | `GET /api/stripe/status` |
| Button, Input, Modal, Card… | `@/components/ui` — full component library |
| Toast notifications | `useToast()` from `@/lib/use-toast` |
| Dark mode | `useTheme()` from `@/lib/theme` — already in layout |
| Command palette | Already mounted in layout via `CommandPaletteProvider` |
| Blog / MDX content | `getAllPosts()`, `getPostBySlug()` from `@/lib/mdx` |
| Error responses | `BadRequestError`, `UnauthorizedError`, etc. from `@/lib/errors` |
| Structured logging | `logger` from `@/lib/logger` |
| Rate limiting | `rateLimit()` from `@/lib/rate-limit` |
| Route protection | Middleware already guards `/app/*` and `/settings/*` |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 (PostCSS) |
| Database | SQLite via `better-sqlite3` |
| Auth | Better Auth (email/password + OAuth + 2FA) |
| Email | Resend |
| Payments | Stripe (hosted checkout + webhooks) |
| Icons | `lucide-react` |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Authentication

### What's already implemented
- Email/password signup + login
- Google OAuth + GitHub OAuth with account linking
- Two-factor authentication (TOTP — Google Authenticator, Authy, 1Password)
- Email verification (sent automatically on signup)
- Password reset (forgot-password → email link → reset form)
- Session cookies (httpOnly, secure, managed by Better Auth)
- Route protection via middleware for `/app/*` and `/settings/*`

### Session check in API routes
```ts
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const userEmail = session.user.email;
  const plan = session.user.plan; // "free" | "pro"
  // ...
}
```

### Client-side auth
```ts
import { authClient } from "@/lib/auth-client";

// Sign up
await authClient.signUp.email({ email, password, name });

// Sign in
await authClient.signIn.email({ email, password });

// OAuth
await authClient.signIn.social({ provider: "google", callbackURL: "/app" });

// Sign out
await authClient.signOut();

// Get session
const { data: session } = await authClient.getSession();

// 2FA
await authClient.twoFactor.enable({ password });
await authClient.twoFactor.verifyTotp({ code });
```

### User object shape (from session)
```ts
{
  id: string;          // UUID
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  plan: "free" | "pro";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: "inactive" | "active" | "past_due" | null;
}
```

---

## Database

### Adding a new table
Add migration SQL files to `migrations/` — numbered and prefixed:
```sql
-- migrations/002_create_widgets.sql
-- UP
CREATE TABLE IF NOT EXISTS widgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON widgets(user_id);

-- DOWN
DROP TABLE IF EXISTS widgets;
```

Run migrations: `npm run db:migrate`

### Using the database
```ts
import { getDb } from "@/lib/db";

const db = getDb();

// Prepared statements (preferred)
const stmt = db.prepare("SELECT * FROM widgets WHERE user_id = ?");
const widgets = stmt.all(userId);

// One-off
const widget = db.prepare("SELECT * FROM widgets WHERE id = ?").get(id);
```

### Schema — Better Auth tables (auto-created, do not modify)
```
user         — accounts with custom fields: plan, stripeCustomerId, stripeSubscriptionId, subscriptionStatus
session      — active sessions
account      — OAuth provider links
verification — email verification tokens
twoFactor    — TOTP secrets and backup codes
```

### Schema — App tables
```
items        — example CRUD table (rename/replace for your use case)
_migrations  — migration tracker (do not touch)
```

> **Important:** Foreign keys to users must reference `user(id)` (singular), not `users(id)`. Better Auth uses the singular `user` table name.

---

## Email

### What's already implemented
```ts
// All in lib/email.ts
sendWelcomeEmail(email: string)
sendVerificationEmail(email: string, url: string)
sendPasswordResetEmail(email: string, url: string)
sendSubscriptionConfirmationEmail(email: string, plan: string)
```

### Adding a new email
Add a new function to `lib/email.ts` using the existing pattern:
```ts
export async function sendYourEmail(email: string, data: YourData) {
  const resend = getResend();
  if (!resend) return; // Resend not configured — skip gracefully

  await resend.emails.send({
    from: `${APP_NAME} <noreply@${YOUR_DOMAIN}>`,
    to: email,
    subject: "Your subject",
    html: wrapEmail(`<p>Your content here</p>`),
  });
}
```

---

## Payments (Stripe)

### What's already implemented
- Subscription checkout (`POST /api/stripe/create-checkout`)
- Stripe billing portal (`GET /api/stripe/portal`)
- Subscription status (`GET /api/stripe/status`)
- Webhook handler (`POST /api/stripe/webhook`) — handles:
  - `checkout.session.completed` → sets user plan to `"pro"`
  - `customer.subscription.updated` → updates subscription status
  - `customer.subscription.deleted` → reverts to `"free"`
  - `invoice.payment_failed` → sets status to `"past_due"`

### Triggering checkout from the frontend
```ts
const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
const { url } = await res.json();
window.location.href = url; // Stripe hosted checkout
```

### Checking user plan
```ts
// In API route
const session = await auth.api.getSession({ headers: request.headers });
if (session?.user.plan !== "pro") {
  return new Response("Upgrade required", { status: 403 });
}

// In client component
const res = await fetch("/api/stripe/status");
const { plan, subscriptionStatus } = await res.json();
```

---

## UI Component Library

Import from `@/components/ui`:

```ts
import {
  Button,        // variant: "primary" | "secondary" | "danger" | "ghost", size: "sm" | "md" | "lg"
  Input,         // styled text input
  Modal,         // dialog with open/close
  Card,          // container card
  Badge,         // status badge with variants
  Avatar,        // user avatar with sizes
  Alert,         // feedback alert with variants
  Tabs,          // tab navigation with TabPanel
  DropdownMenu,  // dropdown with items array
  Table,         // data table with Column definitions
  Skeleton,      // loading skeleton
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonFormField,
} from "@/components/ui";
```

### Toast notifications
```ts
import { useToast } from "@/lib/use-toast";

const { toast } = useToast();
toast.success("Saved!");
toast.error("Something went wrong.");
toast.info("Check your email.");
toast.warning("Action required.");
```

### Theme / dark mode
```ts
import { useTheme } from "@/lib/theme";

const { theme, resolvedTheme, setTheme } = useTheme();
// resolvedTheme is always "light" or "dark"
// setTheme accepts "light" | "dark" | "system"
```

### Command palette
Register commands from anywhere using `lib/commands.ts`:
```ts
import { registerCommand, unregisterCommand } from "@/lib/commands";

useEffect(() => {
  registerCommand({
    id: "my-command",
    label: "Do Something",
    shortcut: "⌘S",
    action: () => doSomething(),
  });
  return () => unregisterCommand("my-command");
}, []);
```

---

## Blog / MDX

Content lives in `content/blog/*.mdx` and `content/changelog/changelog.mdx`.

### Frontmatter schema for blog posts
```yaml
---
title: "Post Title"
date: "2026-02-22"
excerpt: "One sentence description."
author: "Your Name"
tags: ["tag1", "tag2"]
published: true
---
```

### Available utilities
```ts
import { getAllPosts, getPostBySlug, getAllTags, getChangelog } from "@/lib/mdx";
```

### Available MDX components
- `<Callout type="info|warning|tip">` — styled callout box
- All HTML elements are styled by default (headings, code blocks, tables, etc.)

---

## API Route Pattern

Every API route that uses the database or any service must include:
```ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
```

Standard API route structure:
```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const db = getDb();
    const data = db.prepare("SELECT * FROM items WHERE user_id = ?").all(session.user.id);

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("GET /api/your-route failed", { error });
    return errorResponse(error);
  }
}
```

---

## File Structure

```
app/
  page.tsx                    — landing page (all 8 sections)
  layout.tsx                  — root layout: ThemeProvider, CommandPalette, Toast, CookieConsent
  globals.css                 — Tailwind v4 import + custom animations
  (auth)/
    auth/page.tsx             — login/signup/2FA (uses authClient)
    forgot-password/page.tsx
    reset-password/page.tsx
    verify-email/page.tsx
  (protected)/
    app/page.tsx              — dashboard (requires auth via middleware)
    settings/page.tsx         — profile, security, billing, data export
  blog/
    page.tsx                  — blog index
    [slug]/page.tsx           — individual post with MDX rendering
  changelog/page.tsx
  privacy-policy/page.tsx
  terms/page.tsx
  sitemap.ts                  — auto-generated sitemap.xml
  robots.ts                   — robots.txt
  opengraph-image.tsx         — auto-generated OG image (Satori)
  feed.xml/route.ts           — RSS feed
  api/
    auth/[...all]/route.ts    — Better Auth catch-all (DO NOT MODIFY)
    health/route.ts           — GET /api/health → { ok, db, timestamp }
    items/route.ts            — GET list, POST create
    items/[id]/route.ts       — GET, PUT, DELETE
    settings/account/         — GET user account info
    settings/delete-account/  — POST delete account
    settings/export/          — POST export user data
    stripe/create-checkout/   — POST create checkout session
    stripe/webhook/           — POST webhook handler
    stripe/portal/            — GET billing portal link
    stripe/status/            — GET subscription status

lib/
  auth.ts                     — Better Auth server config (DO NOT IMPORT IN CLIENT CODE)
  auth-client.ts              — Better Auth client (safe for React components)
  db.ts                       — SQLite getDb() lazy init
  email.ts                    — Resend email functions
  stripe.ts                   — Stripe getStripe() lazy init
  theme.tsx                   — ThemeProvider + useTheme hook
  use-toast.ts                — toast() global API + useToast hook
  commands.ts                 — command palette registry
  mdx.ts                      — blog post loader
  errors.ts                   — AppError subclasses + errorResponse()
  logger.ts                   — structured logger
  rate-limit.ts               — sliding-window rate limiter
  cn.ts                       — clsx/twMerge utility

components/
  ui/                         — full component library (see above)
  landing/
    header.tsx                — sticky landing page header
    faq.tsx                   — accordion FAQ
  onboarding.tsx              — first-visit wizard
  cookie-consent.tsx          — GDPR cookie consent banner
  mdx-components.tsx          — styled MDX components

content/
  blog/                       — .mdx blog posts
  changelog/changelog.mdx     — versioned changelog

migrations/
  001_create_items.sql        — example migration (UP + DOWN sections)

middleware.ts                  — protects /app/* and /settings/* via session cookie
```

---

## Environment Variables

```env
# Required
BETTER_AUTH_SECRET=         # openssl rand -base64 32
BETTER_AUTH_URL=            # https://yourdomain.com (no trailing slash)
DATABASE_PATH=              # /data/myapp.db (or ./data/dev.db locally)

# OAuth (omit to disable the buttons)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
RESEND_API_KEY=             # re_...

# Stripe
STRIPE_SECRET_KEY=          # sk_live_... or sk_test_...
STRIPE_PRICE_ID=            # price_... (your subscription price)
STRIPE_WEBHOOK_SECRET=      # whsec_... (fail-fast if missing)

# Optional
NODE_ENV=production
APP_NAME=CoachK            # used in emails
```

---

## Critical Rules

### 1. Lazy-init all service clients
```ts
// ✅ CORRECT
let _openai: OpenAI | null = null;
export function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ❌ WRONG — breaks Next.js static build
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```
Applies to every service client: OpenAI, Anthropic, Plaid, etc.
Exception: `betterAuth()` in `lib/auth.ts` is module-level by design.

### 2. `force-dynamic` + `nodejs` on all API routes
```ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
```

### 3. Foreign keys reference `user(id)` not `users(id)`
Better Auth uses the singular `user` table.

### 4. Input text color
Always add `text-gray-900 dark:text-gray-100` to `<input>` elements — Tailwind has no default text color and inputs can appear invisible.

### 5. `useSearchParams()` needs a Suspense boundary
```tsx
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <PageContent />  {/* useSearchParams() is here */}
    </Suspense>
  );
}
```

### 6. Docker build — disable BuildKit
```bash
DOCKER_BUILDKIT=0 docker build -t myapp .
```
BuildKit hangs on Alpine metadata fetch.

### 7. Dockerfile file permissions
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
```
Without `--chown`, static assets return 500.

### 8. Stripe API version
Must match between `lib/stripe.ts` (`2025-02-24.acacia`) and your Stripe dashboard webhook settings.

### 9. Trim and lowercase emails
```ts
const normalized = email.trim().toLowerCase();
```

### 10. camelCase for custom user fields in SQL
Better Auth stores custom user fields as camelCase:
```ts
// ✅ stripeCustomerId, subscriptionStatus
// ❌ stripe_customer_id, subscription_status
```

---

## Common Mistakes

1. Reimplementing auth — use `authClient` / `auth.api.getSession()`
2. Building a custom toast — use `useToast()` from `@/lib/use-toast`
3. Building a custom theme toggle — use `useTheme()` from `@/lib/theme`
4. Module-level `new ServiceClient()` — always lazy init
5. Missing `force-dynamic` + `runtime` on API routes
6. Querying `users` table — Better Auth uses `user` (singular)
7. Forgetting `text-gray-900` on input fields
8. Using `useSearchParams()` without Suspense
9. Using BuildKit for Docker builds
10. Missing `--chown` in Dockerfile COPY commands
11. Not trimming/lowercasing email inputs
12. Committing `.env` — always keep in `.gitignore`
13. Missing `STRIPE_WEBHOOK_SECRET` — the webhook route will 500

---

## Extending the Template

### Adding a new data model
1. Create `migrations/NNN_create_yourmodel.sql` with UP/DOWN sections
2. Run `npm run db:migrate`
3. Create API routes in `app/api/yourmodel/`
4. Add UI components if needed

### Adding a new OAuth provider
Add to `lib/auth.ts` in the `socialProviders` section:
```ts
discord: {
  clientId: process.env.DISCORD_CLIENT_ID || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
},
```

Also add it to `account.accountLinking.trustedProviders` and add a button in `app/auth/page.tsx`'s `SOCIAL_PROVIDERS` array (providers already included: Google, GitHub, Apple, Facebook, Microsoft).

### Configuring OAuth providers (getting the actual credentials)

The five built-in SSO providers each require different steps to obtain credentials:

| Provider  | Automation level | Method |
|-----------|-----------------|--------|
| Microsoft | **Fully automated** | `az` CLI — no browser required |
| Google    | Semi-automated | Browser-guided (3-minute walkthrough) |
| GitHub    | Semi-automated | Browser-guided (2-minute walkthrough) |
| Facebook  | Semi-automated | Browser-guided (~5 minutes) |
| Apple     | Mostly guided  | Browser for setup, automated JWT generation |

**If using Claude Code** — use the `/configure-sso` skill. It handles detection, automation, and guided walkthroughs for all five providers, writing credentials to `.env.local` automatically.

Install once:
```bash
cp -r /path/to/coachk/.claude/skills/configure-sso ~/.claude/skills/
```

Then from any downstream project:
```
/configure-sso
```

**Microsoft only (no Claude Code needed):**
```bash
bash scripts/configure-microsoft-sso.sh
```

Runs the full `az` CLI flow unattended and writes `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID` to `.env.local`.

**Apple-specific note:** `APPLE_CLIENT_SECRET` is a JWT that expires every 180 days. Set a calendar reminder to regenerate it — run `/configure-sso` and select Apple, or re-run the JWT generation step manually.

### Adding a new email
Add a function to `lib/email.ts` using `getResend()` and the `wrapEmail()` helper.

### Adding commands to the command palette
Use `registerCommand()` from `@/lib/commands` inside a `useEffect` in any component.

### Adding a blog post
Create `content/blog/your-slug.mdx` with the required frontmatter fields.

---

## Syncing Updates from CoachK into a Downstream Project

CoachK is a **template, not a library** — there's no `npm update` to pull in new features. When CoachK ships improvements (new components, security fixes, better patterns), downstream projects need to port them manually. Here's the recommended agent workflow.

### When to sync

Check CoachK for updates when:
- Starting a significant new feature (make sure you're not about to reinvent something)
- CoachK has shipped a new phase of work (check `/changelog` or `content/changelog/changelog.mdx`)
- You notice a pattern in your project that feels like solved infrastructure

### Claude Code skill (recommended)

If using Claude Code, a `/sync-coachk` skill is included in this repo that automates the entire workflow below — parallel exploration, diff, interactive checklist, GH issue creation, and branch setup.

**Install once:**
```bash
cp -r /path/to/coachk/.claude/skills/sync-coachk ~/.claude/skills/
```

Then from any downstream project:
```
/sync-coachk
```

The skill file lives at `.claude/skills/sync-coachk/SKILL.md` in this repo.

### Manual agent workflow

If not using Claude Code, run two exploration agents in parallel — one on CoachK, one on your project — then diff and port:

```
Step 1: Explore both repos simultaneously
  Agent A: Map everything in CoachK (lib/, components/, app/, migrations/)
  Agent B: Map the current state of the downstream project (same directories)

Step 2: Diff the two inventories
  - What exists in CoachK that doesn't exist in the project?
  - What exists in both but CoachK's version is meaningfully better?
  - What CoachK features are irrelevant to this project? (skip those)

Step 3: Create a GH issue outlining the sync work
  - List each item to port with a brief rationale
  - Note any items that need adaptation (different DB schema, different naming, etc.)

Step 4: Create a branch + PR, implement the ports one at a time
  - Commit after each ported feature
  - Run `npm run build` before opening the PR
```

### What's usually worth porting

| Category | Port it? | Notes |
|---|---|---|
| `lib/errors.ts` | ✅ Always | Standardized error classes save a lot of boilerplate |
| `lib/logger.ts` | ✅ Always | Structured logging is immediately useful |
| `lib/rate-limit.ts` | ✅ Usually | Critical for any public-facing auth routes |
| `components/ui/*` | ✅ Usually | Port the components you'll actually use |
| Toast / theme system | ✅ Usually | Already wired up, trivial to add |
| Cookie consent | ✅ If public-facing | Required for GDPR compliance |
| Command palette | ⚠️ Optional | Useful for power users, skip if not needed |
| Blog / MDX system | ⚠️ Optional | Only if the project needs a blog |
| Onboarding flow | ⚠️ Optional | Good for complex apps, overkill for simple ones |
| SEO infrastructure | ✅ If public-facing | sitemap, robots, OG images, metadata |
| Auth system | ⚠️ Careful | If already custom auth, migration is a significant undertaking |
| DB migrations | ⚠️ Adapt | Port the pattern, not the schema — your tables will differ |

### What to check in CoachK

- **`AGENTS.md`** (this file) — authoritative list of what's been built
- **`content/changelog/changelog.mdx`** — versioned history of changes
- **`/changelog`** — rendered changelog page
- **GitHub commits/PRs** — `git log --oneline` on the CoachK repo for recent work

### Adapting rather than copy-pasting

Most CoachK code ports cleanly, but watch for:
- **Table/column names** — CoachK uses `user(id)` and camelCase custom fields. If your project predates Better Auth, schema mapping may be needed.
- **Environment variable names** — CoachK uses `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Older projects may use `JWT_SECRET`, `APP_URL`, etc.
- **Import paths** — CoachK uses `@/lib/...` and `@/components/...`. Verify your `tsconfig.json` `paths` match.
- **Tailwind version** — CoachK uses Tailwind v4. Projects on v3 will need to adapt class names and the config format.
