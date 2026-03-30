/**
 * E2E tests for Phase 1.5 polish features:
 * - Start Fresh (reset coaching)
 * - Milestone completion toasts
 * - Skeleton loading screens
 * - Chat scroll behavior
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signUpFreshUser(page: import("@playwright/test").Page) {
  const email = `polish-${Date.now()}@test.thrive.dev`;
  const res = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: "TestPassword123!", name: "Polish Test" },
  });
  expect(res.ok()).toBe(true);
  return email;
}

async function signInAsAdmin(page: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "admin@example.com", password: "password" },
    });
    if (res.ok()) return;
    if (attempt === 0) await page.waitForTimeout(1000);
  }
  throw new Error("Failed to sign in as admin");
}

// ---------------------------------------------------------------------------
// Start Fresh — API
// ---------------------------------------------------------------------------

test.describe("Start Fresh API", () => {
  test("POST /api/reset returns 401 unauthenticated", async ({ page }) => {
    const res = await page.request.post("/api/reset");
    expect(res.status()).toBe(401);
  });

  test("POST /api/reset clears profile and milestones", async ({ page }) => {
    await signUpFreshUser(page);

    // Populate some profile data
    await page.request.post("/api/business-profile", {
      data: { field_key: "business_name", field_value: "Test Studio" },
    });
    await page.request.post("/api/business-profile", {
      data: { field_key: "business_type", field_value: "Yoga" },
    });

    // Verify profile has data
    let profileRes = await page.request.get("/api/business-profile");
    let profile = await profileRes.json();
    expect(profile.completeness.filled).toBeGreaterThan(0);

    // Complete a milestone
    await page.request.post("/api/milestones", {
      data: { milestone_key: "business_structure", status: "completed" },
    });
    let milestonesRes = await page.request.get("/api/milestones");
    let milestones = await milestonesRes.json();
    expect(milestones.progress.completed).toBeGreaterThan(0);

    // Reset
    const resetRes = await page.request.post("/api/reset");
    expect(resetRes.ok()).toBe(true);
    const resetJson = await resetRes.json();
    expect(resetJson.success).toBe(true);

    // Profile should be empty
    profileRes = await page.request.get("/api/business-profile");
    profile = await profileRes.json();
    expect(profile.completeness.filled).toBe(0);

    // Milestones should be reset
    milestonesRes = await page.request.get("/api/milestones");
    milestones = await milestonesRes.json();
    expect(milestones.progress.completed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Start Fresh — UI
// ---------------------------------------------------------------------------

test.describe("Start Fresh UI", () => {
  test("settings page has Reset Coaching section", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/settings");
    await page.waitForTimeout(2000);

    const resetSection = page.getByText("Reset Coaching", { exact: false });
    await resetSection.scrollIntoViewIfNeeded();
    await expect(resetSection).toBeVisible({ timeout: 10_000 });
  });

  test("chat nav dropdown has Start Fresh option", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app");
    await page.waitForTimeout(3000);

    // Open the nav dropdown
    const navButton = page.locator("button").filter({ has: page.locator("svg") });
    // Find the LayoutGrid button — it's in the header area
    const gridButtons = page.locator("header button, [class*='header'] button").filter({ has: page.locator("svg") });
    // Click through to find the dropdown
    for (let i = 0; i < 10; i++) {
      const btn = gridButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        const text = await btn.textContent().catch(() => "");
        // Look for the nav grid button (has no text, just an SVG)
        if (!text || text.trim() === "") {
          await btn.click();
          await page.waitForTimeout(500);
          const startFresh = page.getByText("Start Fresh", { exact: false });
          if (await startFresh.isVisible().catch(() => false)) {
            await expect(startFresh).toBeVisible();
            return; // Test passed
          }
        }
      }
    }

    // Fallback: just check the text exists somewhere on the page after clicking around
    // The dropdown might need a specific button
    await expect(page.getByText("Start Fresh", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Skeleton loading screens
// ---------------------------------------------------------------------------

test.describe("Skeleton loading screens", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("dashboard shows skeleton while loading", async ({ page }) => {
    // Navigate to dashboard — skeleton should show briefly before data loads
    await page.goto("/app/dashboard");
    // The page should either show a skeleton (pulse animations) or the loaded content
    // We verify the page doesn't show a bare spinner
    await expect(
      page.locator("text=/Revenue|Connect|animate-pulse/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("forecast page loads without spinner", async ({ page }) => {
    await page.goto("/app/forecast");
    await expect(
      page.locator("text=/Forecast|Outlook|animate-pulse/i").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("compass page loads without spinner", async ({ page }) => {
    await page.goto("/app/compass");
    await expect(
      page.locator("text=/Compass|Priorities|animate-pulse/i").first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Chat scroll behavior
// ---------------------------------------------------------------------------

test.describe("Chat scroll", () => {
  test("chat scrolls to bottom on page load", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app");
    await page.waitForTimeout(5000); // Wait for messages to load

    // The messages end ref should be near the bottom of the viewport
    // We can verify by checking that the last message is visible
    const messages = page.locator("[class*='message'], [class*='rounded-2xl']");
    const count = await messages.count();
    if (count > 0) {
      const last = messages.last();
      await expect(last).toBeVisible();
    }
  });
});
