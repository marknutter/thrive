import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { user } from "@/lib/schema";
import { Resend } from "resend";

const APP_NAME = process.env.APP_NAME || "Thrive";
const FROM = `${APP_NAME} <noreply@YOUR_DOMAIN>`;

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function sendAdminEmail(to: string, subject: string, body: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <p style="font-size:15px;color:#111827;white-space:pre-wrap;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:12px;color:#9ca3af;">— The ${APP_NAME} team</p>
</body>
</html>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: { subject: string; body: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { subject, body: emailBody } = body;

  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (!emailBody || typeof emailBody !== "string") {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const row = getDb()
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await sendAdminEmail(row.email, subject, emailBody);
  } catch (err) {
    console.error("[admin] Failed to send admin email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  const adminId = session.user.id;
  logAdminAction(adminId, "admin_email_sent", "user", id, { subject });

  return NextResponse.json({ data: { success: true } });
}
