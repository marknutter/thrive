import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper: sign in via API and store the session cookie on the browser context
// ---------------------------------------------------------------------------

async function signIn(page: import("@playwright/test").Page) {
  const loginRes = await page.request.post("/api/auth/sign-in/email", {
    data: { email: "admin@example.com", password: "password" },
  });
  expect(loginRes.ok()).toBe(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Financial Dashboard", () => {
  test("redirects unauthenticated users from /app/dashboard to /auth", async ({
    page,
  }) => {
    await page.goto("/app/dashboard");
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain("/auth");
  });

  test("shows 'Connect Your Stripe Account' when no Stripe connected", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/app/dashboard");

    const heading = page.getByRole("heading", {
      name: /connect your stripe account/i,
    });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Explanatory copy should also be present
    await expect(
      page.getByText(/link your stripe account/i)
    ).toBeVisible();
  });

  test("connect button links to /api/stripe/connect", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/dashboard");

    const connectLink = page.getByRole("link", { name: /connect stripe/i });
    await expect(connectLink).toBeVisible({ timeout: 10_000 });
    await expect(connectLink).toHaveAttribute("href", "/api/stripe/connect");
  });

  test("has the correct page title", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/dashboard");
    await expect(page).toHaveTitle(/Financial Dashboard/i);
  });

  test("API /api/stripe/connect-status returns { connected: false } for user without connection", async ({
    page,
  }) => {
    await signIn(page);

    const res = await page.request.get("/api/stripe/connect-status");
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toEqual({ connected: false });
  });

  test("API /api/stripe/connect-data returns 400 when no Stripe connected", async ({
    page,
  }) => {
    await signIn(page);

    const res = await page.request.get("/api/stripe/connect-data");
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });

  test("chat page (/app) has the dashboard icon in the header toolbar", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/app");

    const dashboardButton = page.getByRole("button", {
      name: /financial dashboard/i,
    });
    await expect(dashboardButton).toBeVisible({ timeout: 10_000 });

    // Verify it contains an SVG (the BarChart3 icon from lucide)
    const svg = dashboardButton.locator("svg");
    await expect(svg).toBeVisible();
  });
});
