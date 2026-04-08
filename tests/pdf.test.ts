import { describe, it, expect, vi, beforeEach } from "vitest";

describe("pdf", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should export PDFExport class", async () => {
    const { PDFExport } = await import("../src/pdf.ts");
    expect(PDFExport).toBeDefined();
  });

  it("should have exportToPDF method", async () => {
    const { PDFExport } = await import("../src/pdf.ts");
    const pdf = new PDFExport([], 2025);
    expect(typeof pdf.exportToPDF).toBe("function");
  });

  it("should have exportToPDFLarge method", async () => {
    const { PDFExport } = await import("../src/pdf.ts");
    const pdf = new PDFExport([], 2025);
    expect(typeof pdf.exportToPDFLarge).toBe("function");
  });
});
