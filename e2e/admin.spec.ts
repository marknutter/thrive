import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signInAsAdmin(page: import("@playwright/test").Page) {
  // Retry once — the very first request after server start can race with DB init
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "admin@example.com", password: "password" },
    });
    if (res.ok()) return;
    if (attempt === 0) await page.waitForTimeout(1000);
  }
  throw new Error("Failed to sign in as admin after 2 attempts");
}

/**
 * Sign up a fresh non-admin user and sign in. Uses a unique email per call
 * to avoid collisions across test runs.
 */
async function signInAsRegularUser(page: import("@playwright/test").Page) {
  const email = `nonadmin-${Date.now()}@example.com`;
  const signUpRes = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: "password", name: "Regular User" },
  });
  // If user already exists, sign in instead
  if (!signUpRes.ok()) {
    const signInRes = await page.request.post("/api/auth/sign-in/email", {
      data: { email, password: "password" },
    });
    expect(signInRes.ok()).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated access — redirects to /auth
// ---------------------------------------------------------------------------

test.describe("Admin — unauthenticated", () => {
  test("redirects /admin to /auth when not logged in", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toContain("/auth");
  });

  test("redirects /admin/users to /auth when not logged in", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toContain("/auth");
  });
});

// ---------------------------------------------------------------------------
// 2. Non-admin authenticated user — 403 from admin APIs
// ---------------------------------------------------------------------------

test.describe("Admin — non-admin user rejected", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsRegularUser(page);
  });

  test("GET /api/admin/users returns 403 for non-admin", async ({ page }) => {
    const res = await page.request.get("/api/admin/users");
    expect(res.status()).toBe(403);
  });

  test("GET /api/admin/analytics returns 403 for non-admin", async ({ page }) => {
    const res = await page.request.get("/api/admin/analytics");
    expect(res.status()).toBe(403);
  });

  test("GET /api/admin/database/tables returns 403 for non-admin", async ({ page }) => {
    const res = await page.request.get("/api/admin/database/tables");
    expect(res.status()).toBe(403);
  });

  test("GET /api/admin/logs returns 403 for non-admin", async ({ page }) => {
    const res = await page.request.get("/api/admin/logs");
    expect(res.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 3–7. Admin authenticated — page-level tests
// ---------------------------------------------------------------------------

test.describe("Admin — authenticated admin", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  // 3. Dashboard loads with sidebar navigation
  test("dashboard page loads with sidebar navigation", async ({ page }) => {
    await page.goto("/admin");

    // Verify the dashboard heading
    const heading = page.getByRole("heading", { name: /dashboard/i });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Verify sidebar nav links exist
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /users/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /database/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /analytics/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /audit logs/i })).toBeVisible();
  });

  // 4. Users page shows user list
  test("users page loads and shows user list", async ({ page }) => {
    await page.goto("/admin/users");

    const heading = page.getByRole("heading", { name: /users/i });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Should show total count
    await expect(page.getByText(/total/i)).toBeVisible();

    // Should have a search input
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  // 5. Database browser loads with table references
  test("database browser loads", async ({ page }) => {
    await page.goto("/admin/database");

    const heading = page.getByRole("heading", { name: /database browser/i });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Should show curated views section
    await expect(page.getByText(/curated views/i)).toBeVisible();

    // Should show generic table browser section
    await expect(page.getByText(/generic table browser/i)).toBeVisible();
  });

  // 6. Analytics page shows Growth/Revenue/Product tabs
  test("analytics page shows Growth, Revenue, and Product tabs", async ({ page }) => {
    await page.goto("/admin/analytics");

    // Wait for the page to load
    await expect(page.getByText(/growth/i).first()).toBeVisible({ timeout: 10_000 });

    // Verify all three tabs are present
    await expect(page.getByText(/growth/i).first()).toBeVisible();
    await expect(page.getByText(/revenue/i).first()).toBeVisible();
    await expect(page.getByText(/product/i).first()).toBeVisible();
  });

  // 7. Logs page loads
  test("logs page loads", async ({ page }) => {
    await page.goto("/admin/logs");

    // Should show the audit logs heading or the scroll text icon context
    await expect(
      page.getByText(/audit log/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
