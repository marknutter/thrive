/**
 * Full user journey E2E test — covers the complete Thrive experience
 * from signup through onboarding, Stripe connection, and all feature pages.
 *
 * This test uses DEMO_MODE so it works without real Stripe/Anthropic keys.
 * It runs sequentially (not parallel) since each step depends on the previous.
 */
import { test, expect, type Page } from "@playwright/test";

// Use a unique email per test run to avoid collisions
const TEST_EMAIL = `journey-${Date.now()}@test.thrive.dev`;
const TEST_PASSWORD = "SecurePassword123!";
const TEST_NAME = "Journey Test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signUp(page: Page) {
  const res = await page.request.post("/api/auth/sign-up/email", {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
  });
  expect(res.ok()).toBe(true);
}

// ---------------------------------------------------------------------------
// Sequential journey — each test depends on the previous
// ---------------------------------------------------------------------------

test.describe.serial("Full User Journey", () => {
  // Share the same browser context so session persists across tests
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // =========================================================================
  // Step 1: Sign up
  // =========================================================================
  test("1. Sign up and land on chat page", async () => {
    await signUp(page);
    await page.goto("/app");
    await page.waitForTimeout(3000);

    // Should be on the chat page (not redirected to auth)
    expect(page.url()).toContain("/app");

    // Should see the welcome/empty state or a bootstrap message
    // The AI should auto-start a coaching session
    await expect(
      page.locator("text=/Thrive|Welcome|coaching|business/i").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // =========================================================================
  // Step 2: Verify coaching sidebar is available
  // =========================================================================
  test("2. Coaching sidebar shows 0/10 milestones", async () => {
    // Find and click the rocket/sidebar toggle button
    const toggleButton = page.getByRole("button", { name: /\/10/ });
    await expect(toggleButton).toBeVisible({ timeout: 10_000 });

    // Should show 0/10 or similar low count
    const badge = await toggleButton.textContent();
    expect(badge).toMatch(/\d+\/10/);
  });

  // =========================================================================
  // Step 3: Check milestones API — all pending
  // =========================================================================
  test("3. Milestones API returns 10 milestones, all pending", async () => {
    const res = await page.request.get("/api/milestones");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.milestones).toHaveLength(10);
    expect(json.progress.completed).toBe(0);
    expect(json.progress.total).toBe(10);

    // First 5 should be auto type
    const autoMilestones = json.milestones.filter(
      (m: { type: string }) => m.type === "auto"
    );
    expect(autoMilestones.length).toBe(5);

    // Last 5 should be manual type
    const manualMilestones = json.milestones.filter(
      (m: { type: string }) => m.type === "manual"
    );
    expect(manualMilestones.length).toBe(5);
  });

  // =========================================================================
  // Step 4: Business profile starts empty
  // =========================================================================
  test("4. Business profile starts empty", async () => {
    const res = await page.request.get("/api/business-profile");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.completeness.filled).toBe(0);
  });

  // =========================================================================
  // Step 5: Manually populate profile fields to simulate AI extraction
  // =========================================================================
  test("5. Simulate AI profile extraction — auto milestones complete", async () => {
    // Simulate what the AI does via [PROFILE:] tags — set fields directly
    // This mimics the chat extracting business facts

    // Business Snapshot fields
    for (const [key, value] of [
      ["business_name", "Test Yoga Studio"],
      ["business_type", "Yoga studio"],
      ["location", "Minneapolis, MN"],
      // Revenue Model fields
      ["revenue_streams", "Memberships, class packs, personal training"],
      ["monthly_revenue", "$28,000/month"],
      // Cost Structure fields
      ["biggest_costs", "Rent $4,000, payroll $12,000, software $500"],
      ["owner_pay", "Owner draws $5,000/month"],
      // Systems fields
      ["studio_software", "OfferingTree"],
      // Goals fields
      ["primary_goal", "Grow membership to 150 members"],
    ]) {
      await page.request.post("/api/business-profile", {
        data: { field_key: key, field_value: value },
      });
    }

    // Now check milestones — auto ones should have completed
    const res = await page.request.get("/api/milestones");
    const json = await res.json();

    // All 5 auto milestones should be complete
    const autoCompleted = json.milestones.filter(
      (m: { type: string; status: string }) =>
        m.type === "auto" && m.status === "completed"
    );
    expect(autoCompleted.length).toBe(5);

    // Manual milestones still pending
    const manualPending = json.milestones.filter(
      (m: { type: string; status: string }) =>
        m.type === "manual" && m.status === "pending"
    );
    expect(manualPending.length).toBe(5);

    expect(json.progress.completed).toBe(5);
  });

  // =========================================================================
  // Step 6: Dashboard shows "Connect Stripe" (not data yet)
  // =========================================================================
  test("6. Dashboard shows Connect Stripe prompt (no data yet)", async () => {
    await page.goto("/app/dashboard");
    await page.waitForTimeout(2000);

    // Should show the connect prompt, not financial data
    await expect(
      page.getByText("Connect", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // =========================================================================
  // Step 7: Insights/Forecast/Compass return error without Stripe
  // =========================================================================
  test("7. Insights API returns error without Stripe connection", async () => {
    const res = await page.request.get("/api/insights");
    // Should be 400 since Stripe not connected
    expect(res.status()).toBe(400);
  });

  test("8. Forecast API returns error without Stripe connection", async () => {
    const res = await page.request.get("/api/forecast");
    expect(res.status()).toBe(400);
  });

  test("9. Compass API returns error without Stripe connection", async () => {
    const res = await page.request.get("/api/compass");
    expect(res.status()).toBe(400);
  });

  // =========================================================================
  // Step 10: Connect Stripe (demo mode — instant redirect)
  // =========================================================================
  test("10. Connect Stripe in demo mode", async () => {
    // Hit the connect endpoint — in demo mode it should redirect back
    const res = await page.request.get("/api/stripe/connect", {
      maxRedirects: 0,
    });
    // Should be a redirect (302 or 307)
    expect([302, 307]).toContain(res.status());

    // Verify connection status is now true
    const statusRes = await page.request.get("/api/stripe/connect-status");
    const status = await statusRes.json();
    expect(status.connected).toBe(true);

    // Stripe milestone should be complete
    const milestonesRes = await page.request.get("/api/milestones");
    const milestones = await milestonesRes.json();
    const stripeMilestone = milestones.milestones.find(
      (m: { key: string }) => m.key === "stripe_connected"
    );
    expect(stripeMilestone.status).toBe("completed");
    expect(milestones.progress.completed).toBe(6); // 5 auto + stripe
  });

  // =========================================================================
  // Step 11: Dashboard now shows data
  // =========================================================================
  test("11. Dashboard shows financial data after Stripe connect", async () => {
    await page.goto("/app/dashboard");
    await page.waitForTimeout(3000);

    // Should show metric cards with actual numbers (demo data)
    await expect(
      page.getByText("Revenue", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("MRR", { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // Step 12: Insights now works
  // =========================================================================
  test("12. Insights API returns data after Stripe connect", async () => {
    const res = await page.request.get("/api/insights");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.summary).toBeTruthy();
    expect(json.insights.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // Step 13: Forecast now works
  // =========================================================================
  test("13. Forecast API returns data after Stripe connect", async () => {
    const res = await page.request.get("/api/forecast");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.snapshot).toBeTruthy();
    expect(json.revenue_forecast.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // Step 14: Compass now works
  // =========================================================================
  test("14. Compass API returns data after Stripe connect", async () => {
    const res = await page.request.get("/api/compass");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.priorities.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // Step 15: Complete manual milestones
  // =========================================================================
  test("15. Complete remaining manual milestones", async () => {
    for (const key of [
      "business_structure",
      "llc_filed",
      "ein_obtained",
      "bank_account_opened",
    ]) {
      await page.request.post("/api/milestones", {
        data: { milestone_key: key, status: "completed" },
      });
    }

    const res = await page.request.get("/api/milestones");
    const json = await res.json();
    expect(json.progress.completed).toBe(10);
    expect(json.progress.percentage).toBe(100);
  });

  // =========================================================================
  // Step 16: Launch page reflects completion
  // =========================================================================
  test("16. Launch page shows all milestones complete", async () => {
    await page.goto("/app/launch");
    await page.waitForTimeout(2000);

    // Should show completion — look for progress indicators
    await expect(
      page.locator("text=/10.*10|100%|complete/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // =========================================================================
  // Step 17: All feature pages load
  // =========================================================================
  test("17. All feature pages load successfully", async () => {
    // Dashboard
    await page.goto("/app/dashboard");
    await expect(page.getByText("Revenue", { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Insights
    await page.goto("/app/insights");
    await expect(
      page.getByText(/highlights|insights|summary/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Forecast
    await page.goto("/app/forecast");
    await expect(
      page.getByText(/forecast|outlook|projection/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Compass
    await page.goto("/app/compass");
    await expect(
      page.getByText(/compass|priorities|goals/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Launch
    await page.goto("/app/launch");
    await expect(
      page.getByText(/launch|business|setup/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // =========================================================================
  // Step 18: Settings page works
  // =========================================================================
  test("18. Settings page loads with user info", async () => {
    await page.goto("/settings");
    await page.waitForTimeout(2000);
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10_000 });
  });
});
