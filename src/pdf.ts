import { jsPDF } from "jspdf";
import * as QRCode from "qrcode";

export class PDFExport {
  /**
   * Exports QR codes to a PDF with multiple codes per page.
   *
   * @param data - Array of data strings to encode as QR codes.
   * @param matchName - Name of the match to include in the PDF header.
   * @throws Error if PDF generation fails.
   */
  public async exportToPDF(data: string[], matchName: string): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const qrSize = 80;
      const spacing = 15;

      const codesPerRow = Math.floor((pageWidth - 2 * margin) / (qrSize + spacing));
      const codesPerColumn = Math.floor((pageHeight - 2 * margin - 30) / (qrSize + spacing));
      const codesPerPage = codesPerRow * codesPerColumn;

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(matchName, pageWidth / 2, margin, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Scan each QR code in order (${data.length} total)`,
        pageWidth / 2,
        margin + 10,
        { align: "center" }
      );

      let currentPage = 0;
      let codeIndex = 0;

      for (let i = 0; i < data.length; i++) {
        const page = Math.floor(i / codesPerPage);
        const positionOnPage = i % codesPerPage;
        const row = Math.floor(positionOnPage / codesPerRow);
        const col = positionOnPage % codesPerRow;

        if (page > currentPage) {
          pdf.addPage();
          currentPage = page;

          pdf.setFontSize(16);
          pdf.setFont("helvetica", "bold");
          pdf.text(matchName, pageWidth / 2, margin, { align: "center" });
        }

        const startY = margin + 20;
        const x = margin + col * (qrSize + spacing);
        const y = startY + row * (qrSize + spacing);

        const qrDataUrl = await QRCode.toDataURL(data[i], {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        pdf.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `${i + 1} of ${data.length}`,
          x + qrSize / 2,
          y + qrSize + 5,
          { align: "center" }
        );

        codeIndex++;
      }

      const filename = `${matchName.replace(/[^a-z0-9]/gi, "_")}_QRCodes.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      throw new Error("Failed to generate PDF");
    }
  }

  /**
   * Exports QR codes to a PDF with one large code per page.
   *
   * @param data - Array of data strings to encode as QR codes.
   * @param matchName - Name of the match to include in the PDF header.
   * @throws Error if PDF generation fails.
   */
  public async exportToPDFLarge(
    data: string[],
    matchName: string
  ): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const qrSize = 150; // Large QR code

      for (let i = 0; i < data.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.text(matchName, pageWidth / 2, 30, { align: "center" });

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `QR Code ${i + 1} of ${data.length}`,
          pageWidth / 2,
          45,
          { align: "center" }
        );

        const qrDataUrl = await QRCode.toDataURL(data[i], {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        const x = (pageWidth - qrSize) / 2;
        const y = (pageHeight - qrSize) / 2;

        pdf.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

        pdf.setFontSize(14);
        pdf.text(
          "Scan this code, then move to the next page",
          pageWidth / 2,
          pageHeight - 30,
          { align: "center" }
        );
      }

      const filename = `${matchName.replace(/[^a-z0-9]/gi, "_")}_QRCodes_Large.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to export large PDF:", error);
      throw new Error("Failed to generate large PDF");
    }
  }
}
