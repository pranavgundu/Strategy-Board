import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseShareCode, removeShareCodeFromUrl } from "../src/lib/features/share-link";

let originalWindow: PropertyDescriptor | undefined;

beforeEach(() => { originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window"); });
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;
});

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true, writable: true });
}

describe("startup share links", () => {
  it("accepts only the public six-character alphabet from raw codes and URLs", () => {
    expect(parseShareCode("ab2cde")).toBe("AB2CDE");
    expect(parseShareCode("https://strategyboard.app/?share=Q7Z2KM#board")).toBe("Q7Z2KM");
    expect(parseShareCode("AB10IO")).toBeNull();
    expect(parseShareCode("too-long-code")).toBeNull();
  });

  it("consumes the share query without losing the rest of the startup URL", () => {
    const replaceState = vi.fn();
    setWindow({
      location: { href: "https://strategyboard.app/board?share=Q7Z2KM&mode=plan#notes" },
      history: { state: { from: "test" }, replaceState },
    });

    removeShareCodeFromUrl();

    expect(replaceState).toHaveBeenCalledWith({ from: "test" }, "", "/board?mode=plan#notes");
  });

  it("does not rewrite history when there is no share query", () => {
    const replaceState = vi.fn();
    setWindow({ location: { href: "https://strategyboard.app/board?mode=plan" }, history: { state: null, replaceState } });

    removeShareCodeFromUrl();

    expect(replaceState).not.toHaveBeenCalled();
  });
});
