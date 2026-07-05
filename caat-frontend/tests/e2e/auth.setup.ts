/**
 * Auth setup — runs once before the "e2e" project.
 * Signs in and saves the session to tests/e2e/.auth/user.json so all
 * authenticated tests can reuse the session without re-logging in.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

// Use `||` (not `??`) so an empty-string env falls back to the seeded account.
// GitHub Actions substitutes an unset secret as "" (not undefined), and `??`
// would keep that empty string, filling the login form blank and failing.
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "test@gmail.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "testtest123";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
});
