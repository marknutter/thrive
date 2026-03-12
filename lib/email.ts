import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const APP_NAME = process.env.APP_NAME || 'CoachK';
const FROM = `${APP_NAME} <noreply@YOUR_DOMAIN>`;
const APP_URL = process.env.APP_URL || 'https://YOUR_DOMAIN';

// ── Shared layout ─────────────────────────────────────────────────────────────

function emailWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#10b981;padding:28px 40px;text-align:left;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${APP_NAME}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You received this email because you have an account with ${APP_NAME}.<br />
                © ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#10b981;text-decoration:none;">${APP_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>`;
}
function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">${text}</h1>`;
}
function para(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;color:#4b5563;line-height:1.7;">${text}</p>`;
}
function small(text: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">${text}</p>`;
}

// ── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string): Promise<void> {
  const body = `
    ${heading(`Welcome to ${APP_NAME} 👋`)}
    ${para("Thanks for signing up. Your account is ready.")}
    ${ctaButton(`${APP_URL}/app`, "Get started")}
  `;
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Welcome to ${APP_NAME} 👋`,
      html: emailWrapper(body),
    });
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err);
    throw err;
  }
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  const body = `
    ${heading("Verify your email address")}
    ${para(`Click below to verify your email and activate your ${APP_NAME} account.`)}
    ${ctaButton(url, "Verify Email")}
    ${small("This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.")}
  `;
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Verify your email — ${APP_NAME}`,
      html: emailWrapper(body),
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
    ${para(`We received a request to reset the password for your ${APP_NAME} account.`)}
    ${ctaButton(url, "Reset Password")}
    ${small("This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.")}
  `;
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Reset your password — ${APP_NAME}`,
      html: emailWrapper(body),
    });
  } catch (err) {
    console.error('[email] sendPasswordResetEmail failed:', err);
    throw err;
  }
}

// ── Subscription Confirmation ─────────────────────────────────────────────────

export async function sendSubscriptionConfirmationEmail(email: string, plan: string): Promise<void> {
  const body = `
    ${heading("You're on Pro 🎉")}
    ${para(`Your <strong>${plan}</strong> subscription is now active. Enjoy full access to all ${APP_NAME} features.`)}
    ${ctaButton(`${APP_URL}/app`, "Go to app")}
  `;
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `You're on Pro 🎉 — ${APP_NAME}`,
      html: emailWrapper(body),
    });
  } catch (err) {
    console.error('[email] sendSubscriptionConfirmationEmail failed:', err);
    throw err;
  }
}
