import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Helper: sign in as the seeded admin user and return the authenticated
 * request context (cookies are forwarded automatically by Playwright).
 */
async function signInAsAdmin(request: APIRequestContext) {
  const res = await request.post("/api/auth/sign-in/email", {
    data: { email: "admin@example.com", password: "password" },
  });
  expect(res.ok()).toBe(true);
  return request; // cookies are now stored on this context
}

// ---------------------------------------------------------------------------
// Unauthenticated requests — every protected endpoint must return 401
// ---------------------------------------------------------------------------
test.describe("API — unauthenticated", () => {
  test("GET /api/health returns 200 (public)", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: true });
  });

  test("GET /api/cron returns 200 (public)", async ({ request }) => {
    const res = await request.get("/api/cron");
    expect(res.ok()).toBe(true);
  });

  test("GET /api/notifications returns 401", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect(res.status()).toBe(401);
  });

  test("GET /api/webhooks returns 401", async ({ request }) => {
    const res = await request.get("/api/webhooks");
    expect(res.status()).toBe(401);
  });

  test("GET /api/files returns 401", async ({ request }) => {
    const res = await request.get("/api/files");
    expect(res.status()).toBe(401);
  });

  test("GET /api/search?q=test returns 401", async ({ request }) => {
    const res = await request.get("/api/search?q=test");
    expect(res.status()).toBe(401);
  });

  test("GET /api/stripe/connect-status returns 401", async ({ request }) => {
    const res = await request.get("/api/stripe/connect-status");
    expect(res.status()).toBe(401);
  });

  test("POST /api/stripe/disconnect returns 401", async ({ request }) => {
    const res = await request.post("/api/stripe/disconnect");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/users returns 401", async ({ request }) => {
    const res = await request.get("/api/admin/users");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/analytics returns 401", async ({ request }) => {
    const res = await request.get("/api/admin/analytics");
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Authenticated requests — sign in once per test via the beforeEach hook
// ---------------------------------------------------------------------------
test.describe("API — authenticated", () => {
  test.beforeEach(async ({ request }) => {
    await signInAsAdmin(request);
  });

  test("GET /api/health returns { ok: true, db: true }", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, db: true });
  });

  test("GET /api/cron returns 200", async ({ request }) => {
    const res = await request.get("/api/cron");
    expect(res.ok()).toBe(true);
  });

  test("GET /api/notifications returns notifications and unreadCount", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty("notifications");
    expect(body).toHaveProperty("unreadCount");
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(typeof body.unreadCount).toBe("number");
  });

  test("GET /api/webhooks returns 200", async ({ request }) => {
    const res = await request.get("/api/webhooks");
    expect(res.ok()).toBe(true);
  });

  test("GET /api/files returns 200", async ({ request }) => {
    const res = await request.get("/api/files");
    expect(res.ok()).toBe(true);
  });

  test("GET /api/search?q=test returns 200", async ({ request }) => {
    const res = await request.get("/api/search?q=test");
    expect(res.ok()).toBe(true);
  });

  test("GET /api/stripe/connect-status returns { connected: false }", async ({ request }) => {
    const res = await request.get("/api/stripe/connect-status");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toMatchObject({ connected: false });
  });

  test("POST /api/stripe/disconnect returns 400 when not connected", async ({ request }) => {
    const res = await request.post("/api/stripe/disconnect");
    expect(res.status()).toBe(400);
  });

  // Admin-only endpoints (admin@example.com has admin role)
  test("GET /api/admin/users returns data and total", async ({ request }) => {
    const res = await request.get("/api/admin/users");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("GET /api/admin/analytics returns 200", async ({ request }) => {
    const res = await request.get("/api/admin/analytics");
    expect(res.ok()).toBe(true);
  });
});
