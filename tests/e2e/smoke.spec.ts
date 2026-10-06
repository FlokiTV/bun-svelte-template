import { expect, test } from "@playwright/test";

test("loads the static app and reaches the API", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Um template com trilhos fortes para vibe coding.",
    }),
  ).toBeVisible();

  await expect(page.getByText("API online")).toBeVisible();
});
