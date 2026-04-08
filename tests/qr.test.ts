import { describe, it, expect, vi, beforeEach } from "vitest";

describe("qr", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should export QRExport class", async () => {
    const { QRExport } = await import("../src/qr.ts");
    expect(QRExport).toBeDefined();
  });

  it("should export QRImport class", async () => {
    const { QRImport } = await import("../src/qr.ts");
    expect(QRImport).toBeDefined();
  });

  it("QRExport should have export method", async () => {
    const { QRExport } = await import("../src/qr.ts");
    const qr = new QRExport("test", () => {});
    expect(typeof qr.export).toBe("function");
  });

  it("QRExport should have close method", async () => {
    const { QRExport } = await import("../src/qr.ts");
    const qr = new QRExport("test", () => {});
    expect(typeof qr.close).toBe("function");
  });

  it("QRImport should have start method", async () => {
    const { QRImport } = await import("../src/qr.ts");
    expect(QRImport.prototype.start).toBeDefined();
  });

  it("QRImport should have stop method", async () => {
    const { QRImport } = await import("../src/qr.ts");
    expect(QRImport.prototype.stop).toBeDefined();
  });
});
