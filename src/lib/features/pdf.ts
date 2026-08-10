import { native } from "$lib/native/api";
import type { PdfDocumentPlan } from "$lib/native/types";

import { saveFile, type SaveFileResult } from "./files";
import { safeFilename } from "./runtime";

const POINTS_PER_MM = 72 / 25.4;

type PdfLib = typeof import("pdf-lib");
type QrCodeModule = typeof import("qrcode");
let pdfLib: Promise<PdfLib> | null = null;
let qrCode: Promise<QrCodeModule> | null = null;

const loadPdfLib = (): Promise<PdfLib> => (pdfLib ??= import("pdf-lib"));
const loadQrCode = (): Promise<QrCodeModule> => (qrCode ??= import("qrcode"));
const toPoints = (millimetres: number): number => millimetres * POINTS_PER_MM;

export type PdfSize = "standard" | "large";

export async function createQrPdf(frames: string[], matchName: string, size: PdfSize = "standard"): Promise<Uint8Array> {
  const plan = size === "large"
    ? await native.pdf.largePlan(frames, matchName)
    : await native.pdf.standardPlan(frames, matchName);
  return renderPdfPlan(plan);
}

/** Renders the native, deterministic layout plan; no browser popup or print dialog is used. */
export async function renderPdfPlan(plan: PdfDocumentPlan): Promise<Uint8Array> {
  const [{ PDFDocument, StandardFonts, rgb }, QRCode] = await Promise.all([loadPdfLib(), loadQrCode()]);
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = toPoints(plan.widthMm);
  const pageHeight = toPoints(plan.heightMm);

  for (const pagePlan of plan.pages) {
    const page = document.addPage([pageWidth, pageHeight]);
    for (const text of pagePlan.texts) {
      const font = text.bold ? bold : regular;
      const fontSize = text.fontSizePt;
      const width = font.widthOfTextAtSize(text.value, fontSize);
      page.drawText(text.value, {
        x: toPoints(text.xMm) - width / 2,
        y: pageHeight - toPoints(text.yMm) - fontSize,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
    for (const qr of pagePlan.qrCodes) {
      const dataUrl = await QRCode.toDataURL(qr.payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 900,
      });
      const image = await document.embedPng(dataUrl);
      const qrSize = toPoints(qr.sizeMm);
      page.drawImage(image, {
        x: toPoints(qr.xMm),
        y: pageHeight - toPoints(qr.yMm) - qrSize,
        width: qrSize,
        height: qrSize,
      });
      if (qr.label) {
        const font = qr.label.bold ? bold : regular;
        const width = font.widthOfTextAtSize(qr.label.value, qr.label.fontSizePt);
        page.drawText(qr.label.value, {
          x: toPoints(qr.label.xMm) - width / 2,
          y: pageHeight - toPoints(qr.label.yMm) - qr.label.fontSizePt,
          size: qr.label.fontSizePt,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
  return document.save();
}

export async function exportQrPdf(frames: string[], matchName: string, size: PdfSize = "standard"): Promise<SaveFileResult> {
  const bytes = await createQrPdf(frames, matchName, size);
  return saveFile(bytes, {
    filename: `${safeFilename(matchName)} QR export`,
    extension: "pdf",
    mimeType: "application/pdf",
    title: "Export Strategy Board QR PDF",
  });
}
