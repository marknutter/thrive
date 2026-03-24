# CLAUDE.md — Thrive

**Read `AGENTS.md` first.** It describes everything already implemented in this template so you don't rebuild it.

---

## Workflow Rules

- **Always use feature branches + PRs.** Never commit directly to `main`.
  ```bash
  git checkout -b feature/your-feature
  # ... implement ...
  git commit -m "descriptive message"
  gh pr create
  ```
- **Commit after each meaningful feature**, not in batches.
- **Run `npm run build` before creating a PR** to catch type errors and build failures.
- When there's a worktree lock preventing `git checkout main`, use:
  ```bash
  git fetch origin main && git reset --hard origin/main
  ```

## Key Libraries / Import Paths

```ts
// Auth
import { auth } from "@/lib/auth";                    // server only
import { authClient } from "@/lib/auth-client";        // client + server

// Database
import { getDb } from "@/lib/db";                     // returns better-sqlite3 instance

// Email
import { sendVerificationEmail, ... } from "@/lib/email";

// UI
import { Button, Input, Modal, ... } from "@/components/ui";

// Toast
import { useToast } from "@/lib/use-toast";

// Theme
import { useTheme } from "@/lib/theme";

// Errors
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";

// Logger
import { logger } from "@/lib/logger";
```

## API Route Template

```ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();
    // ...
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
```

## Auth — Current System

**Better Auth** (NOT custom JWT, NOT NextAuth). Migrated Feb 2026.

- Server session: `auth.api.getSession({ headers: request.headers })`
- Middleware: `getSessionCookie()` from `better-auth/cookies`
- DB table: `user` (singular) — not `users`
- Custom user fields are camelCase: `stripeCustomerId`, `subscriptionStatus`
- Env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (not `JWT_SECRET`)

## Database

- SQLite via `better-sqlite3` (synchronous API — no `await` needed)
- Add new tables via migration files in `migrations/` → run `npm run db:migrate`
- Always foreign key to `user(id)`, not `users(id)`

## Skills

Two Claude Code skills live in `.claude/skills/` — install them globally once:

```bash
cp -r .claude/skills/sync-thrive   ~/.claude/skills/
cp -r .claude/skills/configure-sso  ~/.claude/skills/
```

**`/sync-thrive`** — use from any downstream project to pull Thrive improvements in. Runs parallel exploration, diffs both repos, presents a checklist, creates a GH issue and branch.

**`/configure-sso`** — use when setting up OAuth providers on a new deployment. Fully automates Microsoft via `az` CLI; walks through Google, GitHub, Facebook, and Apple step-by-step, writing all credentials to `.env.local` automatically. For Microsoft-only without Claude Code: `bash scripts/configure-microsoft-sso.sh`.

---

## Things to Never Do

- Import `lib/auth.ts` in client components (server-only)
- Module-level `new ServiceClient()` — use lazy init pattern
- Forget `export const dynamic = "force-dynamic"` on API routes
- Use `docker buildx` — use `DOCKER_BUILDKIT=0 docker build`
- Use Tailwind `<input>` without `text-gray-900 dark:text-gray-100`
- Use `useSearchParams()` without a `<Suspense>` boundary
