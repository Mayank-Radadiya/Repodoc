import { expect, test } from "@playwright/test";

test("landing page renders and rejects an invalid repository without auditing", async ({ page }) => {
  let audits = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/audit") audits++;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("textbox", { name: "GitHub repository", exact: true }).fill("invalid-repository");
  await page.getByRole("button", { name: "Audit repository", exact: true }).click();
  await expect(page.getByRole("search").getByRole("alert")).toContainText("Invalid repository format");
  expect(audits).toBe(0);
});

test("anonymous dashboard access redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/api\/auth\/signin\?callbackUrl=/);
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
});

test("anonymous remediation is rejected before request parsing", async ({ request }) => {
  const response = await request.post("/api/remediate", { data: {} });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ error: "Sign in with GitHub to create a remediation pull request." });
});
