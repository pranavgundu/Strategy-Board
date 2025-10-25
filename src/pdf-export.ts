import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export class PDFExport {
  /**
   * Exports QR codes as a PDF with evenly spaced codes for easy scanning
   * @param data The data array to encode into QR codes
   * @param matchName The name of the match for the PDF title
   */
  public async exportToPDF(data: string[], matchName: string): Promise<void> {
    try {
      // Create a new PDF document in landscape mode for better QR code visibility
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const qrSize = 80; // Size of each QR code in mm
      const spacing = 15; // Spacing between QR codes

      // Calculate how many QR codes can fit per page
      const codesPerRow = Math.floor((pageWidth - 2 * margin) / (qrSize + spacing));
      const codesPerColumn = Math.floor((pageHeight - 2 * margin - 30) / (qrSize + spacing)); // 30mm for title/text
      const codesPerPage = codesPerRow * codesPerColumn;

      // Add title to first page
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

      // Generate QR codes and add them to the PDF
      for (let i = 0; i < data.length; i++) {
        const page = Math.floor(i / codesPerPage);
        const positionOnPage = i % codesPerPage;
        const row = Math.floor(positionOnPage / codesPerRow);
        const col = positionOnPage % codesPerRow;

        // Add new page if needed
        if (page > currentPage) {
          pdf.addPage();
          currentPage = page;

          // Add page header
          pdf.setFontSize(16);
          pdf.setFont("helvetica", "bold");
          pdf.text(matchName, pageWidth / 2, margin, { align: "center" });
        }

        // Calculate position for this QR code
        const startY = margin + 20; // Start below title
        const x = margin + col * (qrSize + spacing);
        const y = startY + row * (qrSize + spacing);

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(data[i], {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        // Add QR code to PDF
        pdf.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

        // Add label below QR code
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

      // Save the PDF
      const filename = `${matchName.replace(/[^a-z0-9]/gi, "_")}_QRCodes.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      throw new Error("Failed to generate PDF");
    }
  }

  /**
   * Alternative layout: One QR code per page for maximum visibility
   * Useful for displaying on tablets or projecting
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

        // Add title
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.text(matchName, pageWidth / 2, 30, { align: "center" });

        // Add page number
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `QR Code ${i + 1} of ${data.length}`,
          pageWidth / 2,
          45,
          { align: "center" }
        );

        // Generate and add QR code
        const qrDataUrl = await QRCode.toDataURL(data[i], {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        const x = (pageWidth - qrSize) / 2;
        const y = (pageHeight - qrSize) / 2;

        pdf.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

        // Add instruction text
        pdf.setFontSize(14);
        pdf.text(
          "Scan this code, then move to the next page",
          pageWidth / 2,
          pageHeight - 30,
          { align: "center" }
        );
      }

      // Save the PDF
      const filename = `${matchName.replace(/[^a-z0-9]/gi, "_")}_QRCodes_Large.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to export large PDF:", error);
      throw new Error("Failed to generate large PDF");
    }
  }
}