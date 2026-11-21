import { expect, test, type Page } from "@playwright/test";

const username = process.env.E2E_USERNAME ?? "";
const password = process.env.E2E_PASSWORD ?? "";

test.skip(!username || !password, "E2E_USERNAME and E2E_PASSWORD are needed");

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

test("serves the app with its security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  // /api reaches the backend, not the app shell
  const api = await request.post("/api/v1/auth/refresh", { headers: { "X-Client-Platform": "web" } });
  expect(api.headers()["content-type"]).toContain("application/json");
});

test("keeps posts and profiles behind sign-in", async ({ page }) => {
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("signs in, posts, likes, comments, deletes and signs out", async ({ page }, testInfo) => {
  const caption = `e2e ${testInfo.project.name} ${Date.now().toString(36)}`;
  await signIn(page);

  // the session survives a reload (refresh cookie)
  await page.reload();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.getByRole("button", { name: "Create post" }).first().click();
  const composer = page.getByRole("dialog", { name: "New post" });
  await composer.getByLabel("Caption").fill(caption);
  await composer.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Your post is live")).toBeVisible();

  await page.goto(`/u/${username}`);
  const card = page.locator("article").filter({ hasText: caption });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: caption }).click();
  await expect(page.getByRole("heading", { name: "Post" })).toBeVisible();

  const post = page.locator("article").filter({ hasText: caption }).first();
  const like = post.getByRole("button", { name: /^Like, / });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Write a comment").fill("e2e comment");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("e2e comment")).toBeVisible();

  await post.getByRole("button", { name: "Delete post" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Post deleted")).toBeVisible();

  await page.goto(`/u/${username}`);
  await expect(page.getByText(caption)).toHaveCount(0);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).last().click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
