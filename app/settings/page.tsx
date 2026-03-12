"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Sprout,
  ChevronLeft,
  Shield,
  Download,
  AlertTriangle,
  User,
  CreditCard,
  Trash2,
  Loader2,
  Star,
  ExternalLink,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Palette,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/lib/use-toast";

// ─── Provider label helper ──────────────────────────────────────────────────
function providerLabel(provider: string) {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    default:
      return "Email";
  }
}

// ─── Delete Account Modal ───────────────────────────────────────────────────
function DeleteModalContent({
  onDismiss,
  onConfirm,
  loading,
}: {
  onDismiss: () => void;
  onConfirm: (value: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        This will permanently delete your account and all associated data. This action cannot be
        undone.
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Type <span className="font-mono font-semibold text-red-600 dark:text-red-400">DELETE</span> to confirm.
      </p>

      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type DELETE"
        className="mb-4"
      />

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onDismiss} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(value)}
          loading={loading}
          disabled={value !== "DELETE"}
          className="flex-1"
        >
          Delete Account
        </Button>
      </div>
    </>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();

  // Account
  const [accountLoading, setAccountLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState("credential");
  const [emailVerified, setEmailVerified] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  // Plan
  const [plan, setPlan] = useState("free");

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [enrollmentStep, setEnrollmentStep] = useState<"idle" | "qr" | "verify">("idle");
  const [mfaLoading, setMfaLoading] = useState(false);

  // Data & privacy
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subscription portal
  const [portalLoading, setPortalLoading] = useState(false);

  const isPro = plan === "pro";

  // ─── Data loading ───────────────────────────────────────────────────────
  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/account");
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email);
        setProvider(data.provider);
        setEmailVerified(data.emailVerified);
        setCreatedAt(data.createdAt);
      }
    } catch {
      // silent
    }
  }, []);

  const loadPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/status");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan ?? "free");
      }
    } catch {
      // silent
    }
  }, []);

  const loadMFA = useCallback(async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        setMfaEnabled(!!session.user.twoFactorEnabled);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function init() {
      await Promise.all([loadAccount(), loadPlan(), loadMFA()]);
      setAccountLoading(false);
    }
    init();
  }, [loadAccount, loadPlan, loadMFA]);

  // ─── MFA handlers ──────────────────────────────────────────────────────
  const startEnrollment = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    setMfaLoading(true);

    try {
      const { data, error: enableError } = await authClient.twoFactor.enable({ password });
      if (enableError) throw new Error(enableError.message || "Failed to start enrollment");

      if (data?.totpURI) {
        const qrDataUrl = await QRCode.toDataURL(data.totpURI);
        setQrCodeDataUrl(qrDataUrl);
        const uriMatch = data.totpURI.match(/secret=([^&]+)/);
        setSecret(uriMatch ? uriMatch[1] : null);
      }
      if (data?.backupCodes) setBackupCodes(data.backupCodes);
      setEnrollmentStep("qr");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start enrollment");
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!verificationCode) {
      toast.error("Please enter a verification code");
      return;
    }
    setMfaLoading(true);

    try {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: verificationCode,
      });
      if (verifyError) throw new Error(verifyError.message || "Verification failed");

      toast.success("MFA enabled successfully!");
      setMfaEnabled(true);
      setEnrollmentStep("idle");
      setVerificationCode("");
      setPassword("");
      setQrCodeDataUrl(null);
      setSecret(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setMfaLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!disablePassword) {
      toast.error("Please enter your password");
      return;
    }
    setMfaLoading(true);

    try {
      const { error: disableError } = await authClient.twoFactor.disable({
        password: disablePassword,
      });
      if (disableError) throw new Error(disableError.message || "Failed to disable MFA");

      toast.success("MFA disabled successfully");
      setMfaEnabled(false);
      setDisablePassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setMfaLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "CoachK";
    const text = backupCodes.join("\n");
    const blob = new Blob(
      [`${appName} Backup Codes\n\n${text}\n\nSave these codes in a safe place!`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName.toLowerCase()}-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Data & privacy handlers ────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sprintbook-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async (confirmation: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      router.push("/auth");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleteLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal");
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        toast.error("Could not open subscription portal");
      }
    } catch {
      toast.error("Could not open subscription portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      toast.error("Could not start checkout");
    } finally {
      setPortalLoading(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────
  if (accountLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Skeleton circle width="w-8" height="h-8" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        titleIcon={<Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />}
      >
        <DeleteModalContent
          onDismiss={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          loading={deleteLoading}
        />
      </Modal>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/app")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-gray-900 dark:text-gray-100">CoachK</span>
          </button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Account ───────────────────────────────────────────────────── */}
        <Card icon={<User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Account">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Auth Provider</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{providerLabel(provider)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {createdAt
                    ? new Date(createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {emailVerified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email Verification</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {emailVerified ? "Verified" : "Not verified"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Card icon={<Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Choose between light, dark, or system preference.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </Card>

        {/* ── Subscription & Billing ────────────────────────────────────── */}
        <Card icon={<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Subscription &amp; Billing">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current plan</span>
              {isPro ? (
                <Badge variant="pro" icon={<Star className="w-3 h-3" />}>Pro</Badge>
              ) : (
                <Badge variant="default">Free</Badge>
              )}
            </div>

            {isPro ? (
              <Button
                variant="primary"
                loading={portalLoading}
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={handleManageSubscription}
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={portalLoading}
                icon={<Star className="w-4 h-4" />}
                onClick={handleUpgrade}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>
        </Card>

        {/* ── Security (MFA) ────────────────────────────────────────────── */}
        <Card icon={<Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Security">
          {/* MFA idle state */}
          {enrollmentStep === "idle" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {mfaEnabled
                      ? "Your account is protected with authenticator app codes."
                      : "Add an extra layer of security with TOTP codes."}
                  </p>
                </div>
                {mfaEnabled ? (
                  <Badge variant="success">Enabled</Badge>
                ) : (
                  <Badge variant="default">Disabled</Badge>
                )}
              </div>

              {!mfaEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enter your password to enable MFA:</p>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    loading={mfaLoading}
                    disabled={!password}
                    onClick={startEnrollment}
                    className="w-full"
                  >
                    Enable MFA
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enter your password to disable MFA:</p>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                  <Button
                    variant="danger"
                    loading={mfaLoading}
                    disabled={!disablePassword}
                    onClick={disableMFA}
                    className="w-full"
                  >
                    Disable MFA
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* MFA enrollment: QR */}
          {enrollmentStep === "qr" && qrCodeDataUrl && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Scan QR Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) to scan this
                code:
              </p>
              <div className="flex justify-center">
                <img src={qrCodeDataUrl} alt="MFA QR Code" className="w-48 h-48" />
              </div>
              {secret && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Or enter manually:{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{secret}</code>
                </p>
              )}

              {backupCodes.length > 0 && (
                <Alert variant="warning">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Save Your Backup Codes
                  </h4>
                  <p className="text-xs mb-3">
                    These codes can be used if you lose access to your authenticator app.
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-amber-200 dark:border-amber-800 mb-3 font-mono text-xs">
                    {backupCodes.map((code, i) => (
                      <div key={i}>{code}</div>
                    ))}
                  </div>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex items-center gap-2 text-xs font-medium hover:opacity-80"
                  >
                    <Download className="w-3 h-3" />
                    Download Codes
                  </button>
                </Alert>
              )}

              <Button variant="primary" onClick={() => setEnrollmentStep("verify")} className="w-full">
                Continue to Verification
              </Button>
            </div>
          )}

          {/* MFA enrollment: verify */}
          {enrollmentStep === "verify" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Verify Setup</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app:
              </p>
              <input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setEnrollmentStep("qr")} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  loading={mfaLoading}
                  disabled={verificationCode.length !== 6}
                  onClick={verifyEnrollment}
                  className="flex-1"
                >
                  Verify &amp; Enable
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Data & Privacy ────────────────────────────────────────────── */}
        <Card icon={<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} title="Data &amp; Privacy">
          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Your Data</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Download a JSON file with your account info and items.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={exportLoading}
                icon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                Export
              </Button>
            </div>

            {/* Delete */}
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
              <div>
                <h3 className="text-sm font-medium text-red-900 dark:text-red-300">Delete Account</h3>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Permanently remove your account and all data.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>

        {/* Bottom padding */}
        <div className="pb-8" />
      </main>
    </div>
  );
}
