import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function requireResend(): Resend {
  const r = getResend();
  if (!r) throw new Error("RESEND_API_KEY not configured — skipping email");
  return r;
}

const APP_NAME = process.env.APP_NAME || 'Thrive';
const FROM_DOMAIN = process.env.EMAIL_FROM_DOMAIN || 'thrive.app';
const FROM = `${APP_NAME} <hello@${FROM_DOMAIN}>`;
const APP_URL = process.env.APP_URL || 'https://thrive.app';

// ── Shared layout ─────────────────────────────────────────────────────────────

function emailWrapper(body: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#fafafa;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #059669 0%, #10b981 100%);padding:32px 40px;text-align:left;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Thrive</span>
              <span style="color:rgba(255,255,255,0.7);font-size:13px;font-weight:400;margin-left:8px;">Financial clarity for your studio</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">
                You received this email because you have an account with ${APP_NAME}.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${APP_NAME} &middot;
                <a href="${APP_URL}" style="color:#10b981;text-decoration:none;">${APP_NAME}</a> &middot;
                <a href="${APP_URL}/privacy-policy" style="color:#9ca3af;text-decoration:none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
        <!-- Unsubscribe -->
        <p style="margin:24px 0 0;font-size:11px;color:#d1d5db;text-align:center;">
          <a href="${APP_URL}/settings" style="color:#d1d5db;text-decoration:underline;">Manage email preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:linear-gradient(135deg, #059669 0%, #10b981 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">${label}</a>`;
}
function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;line-height:1.3;">${text}</h1>`;
}
function para(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:#4b5563;line-height:1.7;">${text}</p>`;
}
function small(text: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">${text}</p>`;
}
function divider(): string {
  return `<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />`;
}
function featureRow(icon: string, title: string, desc: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:16px;width:100%;">
    <tr>
      <td style="width:36px;vertical-align:top;padding-top:2px;">
        <span style="font-size:20px;">${icon}</span>
      </td>
      <td style="vertical-align:top;">
        <strong style="color:#111827;font-size:14px;">${title}</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${desc}</p>
      </td>
    </tr>
  </table>`;
}

// ── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string): Promise<void> {
  const body = `
    ${heading("Welcome to Thrive")}
    ${para("You just took the first step toward real financial clarity for your studio. That's a big deal.")}
    ${para("Thrive is your AI-powered financial coach. It helps you understand your numbers, plan ahead, and grow with confidence - without needing accounting experience.")}
    ${divider()}
    ${featureRow("💬", "Start a coaching session", "Your AI coach will walk you through understanding your business in about 15 minutes.")}
    ${featureRow("📊", "Connect your tools", "Link Stripe and your studio software to see your financial dashboard.")}
    ${featureRow("🎯", "Get monthly guidance", "Insights, forecasts, and clear priorities delivered every month.")}
    ${ctaButton(`${APP_URL}/app`, "Start Your First Session")}
    ${small("Questions? Just reply to this email. We're here to help.")}
  `;
  try {
    await requireResend().emails.send({
      from: FROM,
      to: email,
      subject: "Welcome to Thrive - let's build financial clarity",
      html: emailWrapper(body, "Your AI financial coach is ready. Let's get started."),
    });
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err);
    throw err;
  }
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  const body = `
    ${heading("Verify your email")}
    ${para("One quick step to secure your account. Click below to confirm your email address.")}
    ${ctaButton(url, "Verify Email")}
    ${small("This link expires in <strong>24 hours</strong>. If you didn't create a Thrive account, you can safely ignore this.")}
  `;
  try {
    await requireResend().emails.send({
      from: FROM,
      to: email,
      subject: "Verify your email - Thrive",
      html: emailWrapper(body, "Confirm your email to get started with Thrive."),
    });
  } catch (err) {
    console.error('[email] sendVerificationEmail failed:', err);
    throw err;
  }
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  const body = `
    ${heading("Reset your password")}
    ${para("We received a request to reset your Thrive password. Click below to choose a new one.")}
    ${ctaButton(url, "Reset Password")}
    ${small("This link expires in <strong>1 hour</strong>. If you didn't request this, no action needed - your account is still secure.")}
  `;
  try {
    await requireResend().emails.send({
      from: FROM,
      to: email,
      subject: "Reset your password - Thrive",
      html: emailWrapper(body, "Reset your Thrive password."),
    });
  } catch (err) {
    console.error('[email] sendPasswordResetEmail failed:', err);
    throw err;
  }
}

// ── Waitlist Invite ───────────────────────────────────────────────────────────

export async function sendWaitlistInviteEmail(email: string, inviteCode: string): Promise<void> {
  const signupUrl = `${APP_URL}/auth?tab=signup&invite=${encodeURIComponent(inviteCode)}`;
  const body = `
    ${heading("You're in!")}
    ${para("Great news - your spot is ready. You've been selected for early access to Thrive, the AI-powered financial coach built for fitness and wellness studio owners.")}
    ${para("We built Thrive because we believe every studio owner deserves financial clarity - not just the ones who can afford a CFO.")}
    ${ctaButton(signupUrl, "Create Your Account")}
    ${small(`Your invite code: <strong>${inviteCode}</strong><br />This is a single-use invite. If you didn't sign up for the Thrive waitlist, you can safely ignore this.`)}
  `;
  try {
    await requireResend().emails.send({
      from: FROM,
      to: email,
      subject: "Your Thrive invite is ready",
      html: emailWrapper(body, "You've been selected for early access to Thrive."),
    });
  } catch (err) {
    console.error('[email] sendWaitlistInviteEmail failed:', err);
  }
}

// ── Subscription Confirmation ─────────────────────────────────────────────────

export async function sendSubscriptionConfirmationEmail(email: string, plan: string): Promise<void> {
  const body = `
    ${heading("You're on the ${plan} plan")}
    ${para("Your subscription is now active. You have full access to everything Thrive offers.")}
    ${divider()}
    ${featureRow("📈", "Financial Dashboard", "Real-time view of your revenue, expenses, and cash position.")}
    ${featureRow("🔮", "Forecasts & Scenarios", "12-month projections and what-if planning.")}
    ${featureRow("🧭", "Monthly Compass", "Clear priorities and strategic guidance each month.")}
    ${featureRow("💬", "AI Coaching", "Ask anything about your business finances, anytime.")}
    ${ctaButton(`${APP_URL}/app`, "Go to Thrive")}
    ${small("Manage your subscription anytime from Settings. Questions? Just reply to this email.")}
  `;
  try {
    await requireResend().emails.send({
      from: FROM,
      to: email,
      subject: `Welcome to Thrive ${plan} - full access activated`,
      html: emailWrapper(body, `Your Thrive ${plan} subscription is active.`),
    });
  } catch (err) {
    console.error('[email] sendSubscriptionConfirmationEmail failed:', err);
    throw err;
  }
}
