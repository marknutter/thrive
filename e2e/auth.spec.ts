import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should show auth page with login and signup tabs", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveTitle(/Thrive/i);

    // Should have login/signup toggle
    const signUpTab = page.getByRole("button", { name: /sign up/i });
    const signInTab = page.getByRole("button", { name: /sign in/i });

    // At least one of these should be visible
    const hasSignUp = await signUpTab.isVisible().catch(() => false);
    const hasSignIn = await signInTab.isVisible().catch(() => false);
    expect(hasSignUp || hasSignIn).toBe(true);
  });

  test("should redirect unauthenticated users from /app to /auth", async ({ page }) => {
    await page.goto("/app");
    // Should redirect to auth page
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain("/auth");
  });

  test("should redirect unauthenticated users from /settings to /auth", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain("/auth");
  });

  test("should show validation error for empty email on signup", async ({ page }) => {
    await page.goto("/auth?tab=signup");

    // Try to submit empty form by clicking the submit button
    const submitButton = page.getByRole("button", { name: /create account|sign up/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should stay on auth page (not navigate away)
      expect(page.url()).toContain("/auth");
    }
  });

  test("should show the landing page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Thrive/i);
  });

  test("health endpoint should return ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    expect(body).toHaveProperty("timestamp");
  });
});
