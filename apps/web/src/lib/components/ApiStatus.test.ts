import { render, screen } from "@testing-library/svelte";
import { expect, test } from "@rstest/core";
import ApiStatus from "./ApiStatus.svelte";

test("shows the online state", () => {
  render(ApiStatus, {
    state: "online",
    latencyMs: 12,
  });

  expect(screen.getByText("API online")).toBeTruthy();
  expect(screen.getByText("12 ms")).toBeTruthy();
});
