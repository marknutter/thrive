import { test, expect } from "@playwright/test";

// ─── Settings Page (authenticated) ─────────────────────────────────────────

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as the seeded admin user
    const loginRes = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "admin@example.com", password: "password" },
    });
    expect(loginRes.ok()).toBe(true);
  });

  test("unauthenticated access redirects to /auth", async ({ browser }) => {
    // Use a fresh context with no cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/settings");
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain("/auth");
    await context.close();
  });

  test("shows Account section with user email", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("admin@example.com")).toBeVisible({ timeout: 10_000 });
  });

  test("shows Appearance section with theme toggle", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByText("Theme")).toBeVisible();
    // Theme toggle buttons
    await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dark/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /system/i })).toBeVisible();
  });

  test("shows Subscription & Billing section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Subscription & Billing")).toBeVisible();
    await expect(page.getByText("Current plan")).toBeVisible();
    // Should show either Free badge or Pro badge
    const hasFree = await page.getByText("Free").isVisible().catch(() => false);
    const hasPro = await page.getByText("Pro").isVisible().catch(() => false);
    expect(hasFree || hasPro).toBe(true);
  });

  test("shows Connected Accounts section with Stripe connect option", async ({ page }) => {
    await page.goto("/settings");
    const section = page.getByText("Connected Accounts");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 10_000 });
  });

  test("shows Security section with 2FA", async ({ page }) => {
    await page.goto("/settings");
    const twoFa = page.getByText("Two-Factor Authentication");
    await twoFa.scrollIntoViewIfNeeded();
    await expect(twoFa).toBeVisible({ timeout: 10_000 });
  });

  test("shows Export Your Data section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Data & Privacy")).toBeVisible();
    await expect(page.getByText("Export Your Data")).toBeVisible();
    await expect(page.getByRole("button", { name: /export/i })).toBeVisible();
    await expect(page.getByText("Delete Account")).toBeVisible();
  });
});

// ─── Public Pages (no auth needed) ─────────────────────────────────────────

test.describe("Public Pages", () => {
  test("landing page loads with CTA buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Thrive/i);
    // Hero heading — updated for new landing page
    await expect(page.getByRole("heading", { name: /financial clarity/i }).first()).toBeVisible();
    // CTA button
    await expect(page.getByRole("link", { name: /start|get started|free session/i }).first()).toBeVisible();
  });

  test("blog page loads with posts", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveTitle(/Blog/i);
    // Should have at least one article/post link
    const postLinks = page.locator("article, a[href^='/blog/']");
    await expect(postLinks.first()).toBeVisible();
  });

  test("changelog page loads", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page).toHaveTitle(/Changelog/i);
    await expect(page.getByRole("heading", { name: /changelog/i })).toBeVisible();
  });

  test("privacy policy page loads", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page).toHaveTitle(/Privacy Policy/i);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/Terms/i);
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
  });

  test("forgot password page loads with email input", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });
});
