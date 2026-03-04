# Sprintbook

**Sprintbook** is a production-ready Next.js boilerplate designed to eliminate infrastructure boilerplate so you can focus on building your actual idea. Clone it, rename it, and ship.

---

## What's Already Solved

- **Auth system** — signup, login, logout, forgot/reset password, email verification
- **OAuth SSO** — Google and GitHub via NextAuth v5, automatic user creation
- **Two-Factor Authentication (MFA)** — TOTP-based (Google Authenticator, Authy, 1Password), optional, `/settings` page included
- **JWT sessions** — `jose`-based, stored in httpOnly cookies, centralized `cookieOptions()`
- **SQLite database** — lazy-init `better-sqlite3`, WAL mode, foreign keys, indexed
- **Rate limiting** — 5 attempts / 15 min on login, signup, forgot-password, and MFA verify
- **Security headers** — X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Route protection** — Next.js middleware guards `/app/*`
- **Stripe payments** — hosted checkout, customer portal, webhook handling, plan management
- **Email (Resend)** — verification, welcome, password reset, subscription confirmation
- **Health check** — `/api/health` for uptime monitoring
- **Docker + Caddy** — Dockerfile and docker-compose entry included
- **TypeScript strict mode** — no compromises

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, API routes, middleware — one deploy |
| Language | TypeScript (strict) | Catch bugs at compile time |
| Styling | Tailwind CSS v4 | Utility-first, zero config |
| Database | SQLite via `better-sqlite3` | Zero infra, fast, file-based |
| Auth | `jose` JWT + `bcryptjs` + NextAuth v5 | Custom JWT for credentials, NextAuth for OAuth |
| Email | Resend | Simple transactional email API |
| Payments | Stripe (hosted checkout) | No PCI burden, webhook-driven |
| Runtime | Node.js 20 on Alpine | Small container |

---

## Using Sprintbook for a New Project

### 1. Clone (or copy) the repo

```bash
cp -r sprintbook my-new-app
cd my-new-app
```

### 2. Rename the app

- `package.json` → update `"name"`
- `app/layout.tsx` → update `<title>` and description
- `lib/auth.ts` → update `COOKIE_NAME` to something unique (e.g., `myapp_session`)
- `.env.example` → copy to `.env.local`, fill in secrets
- Set `APP_NAME` env var (used in emails, MFA enrollment)
- Search/replace `Sprintbook` in page components with your app name
- Update `lib/email.ts` → change `noreply@YOUR_DOMAIN` to your verified Resend domain

### 3. Generate a JWT secret

```bash
openssl rand -base64 32
```

Add it to `.env.local` as `JWT_SECRET`.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Adding to docker-compose

In `/workspace/docker-compose.yml`, add:

```yaml
my-app:
  build:
    context: ./my-new-app
    dockerfile: Dockerfile
  container_name: my-app
  ports:
    - "3006:3000"          # pick the next available port
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - JWT_SECRET=${MY_APP_JWT_SECRET:-change-me}
    - DATABASE_PATH=/data/myapp.db
    - APP_URL=https://myapp.yourdomain.com
    - APP_NAME=MyApp
    - RESEND_API_KEY=${RESEND_API_KEY}
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    - STRIPE_PRICE_ID=${STRIPE_PRICE_ID}
    - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
  volumes:
    - my-app-data:/data
  networks:
    - app-network
```

And in the `volumes:` section:

```yaml
volumes:
  my-app-data:
```

Build and start:

```bash
docker-compose up -d --build my-app
```

---

## Adding to Caddy

In `~/.config/caddy/Caddyfile`, add inside the `:8080` block:

```caddy
@myapp host myapp.oqodo.com
handle @myapp {
    reverse_proxy localhost:3006
}
```

Then reload:

```bash
caddy reload --config ~/.config/caddy/Caddyfile
```

---

## Auth Flow

```
POST /api/auth/signup
  → rate limit check (5/15min per IP)
  → validate + trim email, validate password (8+ chars)
  → bcrypt hash (cost 12)
  → INSERT user
  → send verification email + welcome email (via Resend)
  → sign JWT (30d expiry)
  → set httpOnly cookie via cookieOptions() → return user

POST /api/auth/login
  → rate limit check
  → lookup user by email (trimmed + lowercased)
  → bcrypt.compare
  → if MFA enabled: return { mfaRequired, userId }
  → else: sign JWT → set cookie → return user

POST /api/auth/mfa/verify-login
  → rate limit check
  → verify TOTP code (or backup code)
  → if backup code used: remove from stored codes, warn user
  → sign JWT → set cookie → return user

POST /api/auth/logout
  → clear cookie → return ok

GET /api/auth/me
  → read cookie → verify JWT → return { user }

POST /api/auth/forgot-password
  → rate limit check (silent — always returns ok)
  → generate 32-byte random token
  → store in password_reset_tokens (1h TTL)
  → send reset email via Resend
  → always return success (prevent enumeration)

POST /api/auth/reset-password
  → verify token exists + not expired + not used
  → hash new password (cost 12) → update user
  → mark token used → auto-login → return user

GET /api/auth/verify-email?token=...
  → verify token exists + not expired + not used
  → mark user email_verified = 1
  → redirect to /app?verified=1

OAuth (Google / GitHub via NextAuth)
  → /api/auth/[...nextauth] handles callbacks
  → auto-creates user on first OAuth sign-in
  → sets provider column, marks email_verified = 1

Middleware (/middleware.ts)
  → matches /app/* routes
  → reads cookie → verifyToken
  → if invalid: clear cookie + redirect /auth?tab=login
```

---

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                          -- NULL for OAuth-only users
  email_verified INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',                    -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive', -- 'active' | 'inactive' | 'past_due'
  provider TEXT DEFAULT 'email',               -- 'email' | 'google' | 'github'
  totp_secret TEXT,                            -- MFA: TOTP secret key
  totp_enabled INTEGER DEFAULT 0,             -- MFA: 0/1
  backup_codes TEXT,                           -- MFA: JSON array of bcrypt-hashed codes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
```

Add your own tables in `lib/db.ts` inside the `db.exec(...)` block.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | `dev-secret-...` | Secret for signing JWTs. Generate with `openssl rand -base64 32` |
| `DATABASE_PATH` | No | `./data/sprintbook.db` | Path to SQLite file |
| `APP_URL` | No | `http://localhost:3000` | Used in emails and Stripe redirects |
| `APP_NAME` | No | `Sprintbook` | Display name in emails and MFA enrollment |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret |
| `RESEND_API_KEY` | No | — | Resend API key for transactional emails |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key |
| `STRIPE_PRICE_ID` | No | — | Stripe price ID for subscription checkout |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret |

**Note:** Stripe routes will return 500 if `STRIPE_PRICE_ID` or `STRIPE_WEBHOOK_SECRET` are not set when accessed.

---

## Common TODOs Per Project

### OpenAI integration
```bash
npm install openai
```
```ts
// lib/openai.ts
import OpenAI from "openai";
let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
```

### Plaid integration
```bash
npm install plaid react-plaid-link
```
Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` to `.env.local`.
Create `/api/plaid/link-token` and `/api/plaid/exchange-token` routes.

### Data models
Add your domain tables in `lib/db.ts`:
```ts
db.exec(`
  CREATE TABLE IF NOT EXISTS widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
```

### Switch to Postgres
Replace `better-sqlite3` with `postgres` or `@neondatabase/serverless`.
Update `lib/db.ts` to use a connection pool. Keep the same lazy-init pattern.

---

## File Structure

```
sprintbook/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  ← OAuth callback handler
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── me/route.ts
│   │   │   ├── signup/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   ├── reset-password/route.ts
│   │   │   ├── verify-email/route.ts
│   │   │   └── mfa/
│   │   │       ├── enroll/route.ts
│   │   │       ├── verify-enroll/route.ts
│   │   │       ├── verify-login/route.ts
│   │   │       ├── status/route.ts
│   │   │       └── disable/route.ts
│   │   ├── health/route.ts
│   │   ├── items/
│   │   │   ├── route.ts               ← generic CRUD example
│   │   │   └── [id]/route.ts
│   │   └── stripe/
│   │       ├── create-checkout/route.ts
│   │       ├── webhook/route.ts
│   │       ├── portal/route.ts
│   │       └── status/route.ts
│   ├── app/page.tsx                    ← protected dashboard
│   ├── auth/page.tsx                   ← login/signup + OAuth buttons
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   ├── settings/page.tsx              ← MFA management
│   ├── privacy-policy/page.tsx
│   ├── terms/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── providers.tsx                   ← NextAuth SessionProvider
│   └── page.tsx                        ← landing page
├── lib/
│   ├── auth.ts                         ← JWT sign/verify, cookieOptions()
│   ├── auth-config.ts                  ← NextAuth config (OAuth + credentials)
│   ├── db.ts                           ← lazy SQLite init, schema, migrations, indices
│   ├── email.ts                        ← Resend lazy init, all email templates
│   ├── rate-limit.ts                   ← in-memory rate limiter
│   ├── stripe.ts                       ← Stripe lazy init
│   └── totp.ts                         ← TOTP secret/QR/verify, backup codes
├── types/
│   └── next-auth.d.ts                  ← NextAuth type augmentation
├── middleware.ts                        ← protects /app/* routes
├── next.config.ts                       ← security headers, better-sqlite3 external
├── tsconfig.json
├── Dockerfile
├── .env.example
├── .gitignore
├── AGENTS.md
├── LAUNCH_CHECKLIST.md
└── PROJECT.md
```

---

## Health Check

`GET /api/health` returns:

```json
{ "ok": true, "db": true, "timestamp": "2026-02-18T16:00:00.000Z" }
```

Use this for uptime monitors (Better Uptime, UptimeRobot, etc.).

---

## Rate Limiting

The in-memory rate limiter allows **5 attempts per IP per 15 minutes** on:
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/forgot-password`
- `POST /api/auth/mfa/verify-login`

Resets on server restart. For persistence across restarts, move the store to SQLite
(add a `rate_limit_attempts` table) or Redis.

---

## Security Headers

Configured in `next.config.ts`, applied to all routes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
