import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signInAsAdmin(page: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "admin@example.com", password: "password" },
    });
    if (res.ok()) return;
    if (attempt === 0) await page.waitForTimeout(1000);
  }
  throw new Error("Failed to sign in as admin after 2 attempts");
}

async function signUpFreshUser(page: import("@playwright/test").Page) {
  const email = `onboard-${Date.now()}@example.com`;
  const res = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: "TestPassword123!", name: "Onboard Test" },
  });
  expect(res.ok()).toBe(true);
  return email;
}

// ---------------------------------------------------------------------------
// 1. API — unauthenticated
// ---------------------------------------------------------------------------

test.describe("Onboarding API — unauthenticated", () => {
  test("GET /api/onboarding returns 401", async ({ page }) => {
    const res = await page.request.get("/api/onboarding");
    expect(res.status()).toBe(401);
  });

  test("POST /api/onboarding returns 401", async ({ page }) => {
    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "create_llc", status: "completed" },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. API — authenticated, fresh user
// ---------------------------------------------------------------------------

test.describe("Onboarding API — authenticated", () => {
  test("GET returns 7 steps, all pending for new user", async ({ page }) => {
    await signUpFreshUser(page);
    const res = await page.request.get("/api/onboarding");
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.steps).toHaveLength(7);
    expect(json.completion.completed).toBe(0);
    expect(json.completion.total).toBe(7);
    expect(json.completion.percentage).toBe(0);

    // All steps should be pending
    for (const step of json.steps) {
      expect(step.status).toBe("pending");
    }
  });

  test("GET returns correct step keys in order", async ({ page }) => {
    await signUpFreshUser(page);
    const res = await page.request.get("/api/onboarding");
    const json = await res.json();

    const keys = json.steps.map((s: { key: string }) => s.key);
    expect(keys).toEqual([
      "business_structure",
      "create_llc",
      "get_ein",
      "bank_account",
      "accounting_setup",
      "connect_studio",
      "connect_stripe",
    ]);
  });

  test("POST updates a step to completed", async ({ page }) => {
    await signUpFreshUser(page);

    // Initialize rows via GET first
    await page.request.get("/api/onboarding");

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "business_structure", status: "completed", notes: "Chose LLC" },
    });
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify via GET
    const getRes = await page.request.get("/api/onboarding");
    const getJson = await getRes.json();
    const step = getJson.steps.find((s: { key: string }) => s.key === "business_structure");
    expect(step.status).toBe("completed");
    expect(step.notes).toBe("Chose LLC");
    expect(getJson.completion.completed).toBe(1);
  });

  test("POST updates a step to in_progress", async ({ page }) => {
    await signUpFreshUser(page);
    await page.request.get("/api/onboarding"); // init rows

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "create_llc", status: "in_progress" },
    });
    expect(res.ok()).toBe(true);

    const getRes = await page.request.get("/api/onboarding");
    const getJson = await getRes.json();
    const step = getJson.steps.find((s: { key: string }) => s.key === "create_llc");
    expect(step.status).toBe("in_progress");
  });

  test("POST updates a step to skipped", async ({ page }) => {
    await signUpFreshUser(page);
    await page.request.get("/api/onboarding"); // init rows

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "get_ein", status: "skipped" },
    });
    expect(res.ok()).toBe(true);

    const getRes = await page.request.get("/api/onboarding");
    const getJson = await getRes.json();
    const step = getJson.steps.find((s: { key: string }) => s.key === "get_ein");
    expect(step.status).toBe("skipped");
    expect(getJson.completion.completed).toBe(1);
  });

  test("POST rejects invalid step_key", async ({ page }) => {
    await signUpFreshUser(page);

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "fake_step", status: "completed" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST rejects invalid status", async ({ page }) => {
    await signUpFreshUser(page);

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "create_llc", status: "invalid_status" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST rejects missing fields", async ({ page }) => {
    await signUpFreshUser(page);

    const res = await page.request.post("/api/onboarding", {
      data: { step_key: "create_llc" },
    });
    expect(res.status()).toBe(400);
  });

  test("completing all 7 steps shows 100%", async ({ page }) => {
    await signUpFreshUser(page);
    await page.request.get("/api/onboarding"); // init rows

    const steps = [
      "business_structure", "create_llc", "get_ein",
      "bank_account", "accounting_setup", "connect_studio", "connect_stripe",
    ];

    for (const key of steps) {
      await page.request.post("/api/onboarding", {
        data: { step_key: key, status: "completed" },
      });
    }

    const res = await page.request.get("/api/onboarding");
    const json = await res.json();
    expect(json.completion.completed).toBe(7);
    expect(json.completion.percentage).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 3. UI — progress sidebar
// ---------------------------------------------------------------------------

test.describe("Onboarding UI — chat page", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("chat page has rocket toggle button", async ({ page }) => {
    await page.goto("/app");
    const rocketButton = page.getByRole("button", { name: /\d+\/7/ });
    await expect(rocketButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test("rocket button shows completion badge", async ({ page }) => {
    await page.goto("/app");
    // Look for the badge showing step count (e.g. "0/7" or similar)
    const badge = page.locator("text=/\\d+\\/7/");
    await expect(badge.first()).toBeVisible({ timeout: 10_000 });
  });

  test("rocket toggle opens and closes progress panel", async ({ page }) => {
    await page.goto("/app");
    await page.waitForTimeout(3000);

    const rocketButton = page.getByRole("button", { name: /\d+\/7/ });
    await expect(rocketButton).toBeVisible({ timeout: 10_000 });

    // If panel is not visible, click to open
    const panelHeading = page.getByRole("heading", { name: "Thrive Launch" });
    const isOpen = await panelHeading.isVisible().catch(() => false);
    if (!isOpen) {
      await rocketButton.click();
    }

    // Panel should be visible with heading and steps
    await expect(panelHeading).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Business Structure", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("EIN", { exact: false }).first()).toBeVisible();

    // Click again to close
    await rocketButton.click();
    await expect(panelHeading).not.toBeVisible({ timeout: 5_000 });
  });

  test("progress badge shows step count", async ({ page }) => {
    await page.goto("/app");
    await page.waitForTimeout(2000);

    // Badge should show X/7 format
    const badge = page.locator("text=/\\d+\\/7/");
    await expect(badge.first()).toBeVisible({ timeout: 10_000 });
  });
});
