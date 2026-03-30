/**
 * E2E tests for the Business Foundation document system.
 */
import { test, expect } from "@playwright/test";

async function signUpFreshUser(page: import("@playwright/test").Page) {
  const email = `foundation-${Date.now()}@test.thrive.dev`;
  const res = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: "TestPassword123!", name: "Foundation Test" },
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
// API tests
// ---------------------------------------------------------------------------

test.describe("Foundation API", () => {
  test("GET /api/foundation returns 401 unauthenticated", async ({ page }) => {
    const res = await page.request.get("/api/foundation");
    expect(res.status()).toBe(401);
  });

  test("GET /api/foundation returns empty doc for new user", async ({ page }) => {
    await signUpFreshUser(page);
    const res = await page.request.get("/api/foundation");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    // Should have the structure but mostly null sections
    expect(json).toHaveProperty("milestoneProgress");
    expect(json).toHaveProperty("recommendations");
    expect(json).toHaveProperty("generatedAt");
  });

  test("GET /api/foundation returns populated doc after profile data", async ({ page }) => {
    await signUpFreshUser(page);

    // Populate profile fields
    for (const [key, value] of [
      ["business_name", "Test Yoga Studio"],
      ["business_type", "Yoga studio"],
      ["location", "Minneapolis, MN"],
      ["monthly_revenue", "$30,000"],
      ["primary_goal", "Grow to 150 members"],
    ]) {
      await page.request.post("/api/business-profile", {
        data: { field_key: key, field_value: value },
      });
    }

    const res = await page.request.get("/api/foundation");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.businessSnapshot).not.toBeNull();
    expect(json.businessSnapshot.name).toBe("Test Yoga Studio");
    expect(json.goals).not.toBeNull();
    expect(json.goals.primaryGoal).toBe("Grow to 150 members");
  });

  test("POST /api/foundation regenerates and saves", async ({ page }) => {
    await signUpFreshUser(page);

    await page.request.post("/api/business-profile", {
      data: { field_key: "business_name", field_value: "Regen Studio" },
    });

    const res = await page.request.post("/api/foundation");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.businessSnapshot.name).toBe("Regen Studio");

    // GET should return the saved version
    const getRes = await page.request.get("/api/foundation");
    const saved = await getRes.json();
    expect(saved.businessSnapshot.name).toBe("Regen Studio");
  });
});

// ---------------------------------------------------------------------------
// Page tests
// ---------------------------------------------------------------------------

test.describe("Foundation page", () => {
  test("foundation page loads for authenticated user", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app/foundation");
    await page.waitForTimeout(3000);

    await expect(
      page.getByText(/Business Foundation|Foundation|coaching/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("foundation page shows recommendations", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app/foundation");
    await page.waitForTimeout(3000);

    // Should show some recommendations or next steps
    await expect(
      page.getByText(/recommend|next step|connect|continue/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("nav dropdown has Business Foundation link", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app");
    await page.waitForTimeout(3000);

    // Click all header buttons to find and open the nav dropdown
    const headerButtons = page.locator("header button, div.flex button").filter({ has: page.locator("svg") });
    const count = await headerButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = headerButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
        const found = await page.getByText("Business Foundation", { exact: false }).isVisible().catch(() => false);
        if (found) {
          await expect(page.getByText("Business Foundation", { exact: false })).toBeVisible();
          return;
        }
      }
    }
    // Fallback — just check it exists in DOM
    await expect(page.getByText("Business Foundation", { exact: false }).first()).toBeAttached({ timeout: 5_000 });
  });
});
