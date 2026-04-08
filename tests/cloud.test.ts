import { describe, it, expect, vi, beforeEach } from "vitest";

describe("cloud", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should export uploadMatch function", async () => {
    const { uploadMatch } = await import("../src/cloud.ts");
    expect(typeof uploadMatch).toBe("function");
  });

  it("should export downloadMatch function", async () => {
    const { downloadMatch } = await import("../src/cloud.ts");
    expect(typeof downloadMatch).toBe("function");
  });

  it("should export checkShareCode function", async () => {
    const { checkShareCode } = await import("../src/cloud.ts");
    expect(typeof checkShareCode).toBe("function");
  });
});
