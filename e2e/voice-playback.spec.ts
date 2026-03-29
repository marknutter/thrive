/**
 * Voice playback regression test.
 *
 * Verifies that after the AI responds, the app attempts to call
 * /api/voice/speak when audio responses are enabled. This catches
 * the stale closure bug where `speak` was null in sendMessage.
 *
 * We can't verify actual audio output in headless mode, but we CAN
 * verify the TTS API request is made — which proves the speak function
 * is wired up correctly.
 */
import { test, expect } from "@playwright/test";

test.describe("Voice playback wiring", () => {
  test("TTS endpoint is called after AI responds with audio enabled", async ({ page }) => {
    // Sign up a fresh user
    const email = `voice-${Date.now()}@test.thrive.dev`;
    await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: "TestPassword123!", name: "Voice Test" },
    });

    // Track whether /api/voice/speak was called
    let ttsRequested = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/voice/speak")) {
        ttsRequested = true;
      }
    });

    // Navigate to chat
    await page.goto("/app");
    await page.waitForTimeout(5000); // Wait for bootstrap message + AI response

    // The bootstrap auto-sends a message and the AI responds.
    // With audio enabled (default), it should attempt TTS after the response.
    // Wait for the AI to finish streaming and the TTS call to fire.
    await page.waitForTimeout(15000); // AI response + TTS call

    // Verify TTS was attempted
    expect(ttsRequested).toBe(true);
  });

  test("audio toggle button is present and clickable", async ({ page }) => {
    // Sign up a fresh user
    const email = `voice-toggle-${Date.now()}@test.thrive.dev`;
    await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: "TestPassword123!", name: "Voice Toggle Test" },
    });

    await page.goto("/app");
    await page.waitForTimeout(3000);

    // Audio toggle should be visible
    const audioButton = page.locator("button").filter({ hasText: /audio/i }).first();
    await expect(audioButton).toBeVisible({ timeout: 10_000 });

    // Should show "on" state by default
    await expect(audioButton).toHaveAttribute("title", /on/i);

    // Click to disable
    await audioButton.click();
    await page.waitForTimeout(500);

    // Should now show "off" state
    await expect(audioButton).toHaveAttribute("title", /off/i);
  });
});
