# Deploy Thrive to Railway

## Prerequisites
- Railway account: https://railway.app
- Railway CLI: `npm install -g @railway/cli`
- This repo pushed to GitHub

## Steps

### 1. Login and create project
```bash
railway login
railway init
# Name: "thrive"
```

### 2. Connect GitHub repo
In Railway dashboard (https://railway.app):
- Open your project
- Settings → Connect GitHub repo → select `marknutter/thrive`
- Branch: `main`

### 3. Add persistent volume
In Railway dashboard:
- Click your service
- Settings → Volumes → Add Volume
- Mount path: `/data`
- This stores the SQLite database

### 4. Set environment variables
```bash
# Required
railway variables set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
railway variables set DATABASE_PATH="/data/thrive.db"
railway variables set NODE_ENV="production"
railway variables set APP_NAME="Thrive"
railway variables set ANTHROPIC_API_KEY="sk-ant-..."

# Demo mode (use mock financial data, no real Stripe needed)
railway variables set DEMO_MODE="true"
```

### 5. Deploy
```bash
railway up
```
Or just push to main — Railway auto-deploys.

### 6. Get your URL
Railway assigns a URL like `thrive-production.up.railway.app`. Set it:
```bash
railway variables set BETTER_AUTH_URL="https://YOUR-URL.up.railway.app"
railway variables set APP_URL="https://YOUR-URL.up.railway.app"
```
This triggers a redeploy automatically.

### 7. Verify
- Visit `https://YOUR-URL.up.railway.app/api/health` — should return `{"ok":true}`
- Visit the landing page — should show "Financial clarity for your studio"
- Create an account and test the coaching flow

## Optional: Custom domain
In Railway dashboard:
- Settings → Domains → Add Custom Domain
- Point your DNS (A or CNAME) to Railway
- Update `BETTER_AUTH_URL` and `APP_URL` to your custom domain

## Optional: Additional env vars
```bash
# Email (for verification, password reset)
railway variables set RESEND_API_KEY="re_..."

# OAuth (social login)
railway variables set GOOGLE_CLIENT_ID="..."
railway variables set GOOGLE_CLIENT_SECRET="..."

# Real Stripe (disable DEMO_MODE first)
railway variables set DEMO_MODE=""
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_CONNECT_CLIENT_ID="ca_..."
```

## Useful commands
```bash
railway logs              # View logs
railway open              # Open dashboard
railway redeploy --yes    # Force rebuild
railway variables         # List all env vars
```

## Troubleshooting

**"Invalid origin" on signup/login:**
`BETTER_AUTH_URL` doesn't match the actual URL. Update it to match exactly.

**"SQLITE_CANTOPEN":**
Volume not mounted. Check Settings → Volumes → mount path is `/data`.

**Blank page / 500 errors:**
Check `railway logs`. Usually a missing env var (BETTER_AUTH_SECRET or DATABASE_PATH).
