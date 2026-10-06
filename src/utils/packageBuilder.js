import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 50;
const FOOTER_H = 24;
const FOOTER_FONT_SIZE = 8;

/**
 * Build the final merged PDF package.
 *
 * @param {Object} tender — tender metadata
 * @param {Array} requirements — sorted by order
 * @param {Object} matches — { reqId: fileId }
 * @param {Array} files — [{ id, name, arrayBuffer, pageCount }]
 * @returns {Promise<Uint8Array>}
 */
export async function buildPackage(tender, requirements, matches, files) {
  const mainDoc = await PDFDocument.create();
  const fontRegular = await mainDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await mainDoc.embedFont(StandardFonts.HelveticaBold);

  // Determine which requirements are included (matched files, in order)
  const included = requirements
    .filter((req) => matches[req.id])
    .sort((a, b) => a.order - b.order);

  // --- Cover page ---
  const coverPage = mainDoc.addPage([A4_W, A4_H]);
  let y = A4_H - MARGIN;
  const LINE_H = 18;

  // Title
  coverPage.drawText('TENDER SUBMISSION PACKAGE', {
    x: MARGIN,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 2.2;

  // Tender details
  const details = [
    ['Tender ID', tender.tender_id],
    ['Title', tender.title],
    ['Procuring Entity', tender.procuring_entity],
    ['Bidder', tender.bidder],
    ['Submission Deadline', tender.submission_deadline],
    ['Package Date', new Date().toISOString().slice(0, 10)],
  ];

  for (const [label, value] of details) {
    coverPage.drawText(`${label}:`, {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.24),
    });
    coverPage.drawText(value, {
      x: MARGIN + 140,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= LINE_H;
  }

  // Divider line
  y -= LINE_H * 0.5;
  coverPage.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_W - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.72),
  });
  y -= LINE_H * 1.2;

  // Included documents list
  coverPage.drawText('Included Documents:', {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 1.4;

  for (const req of included) {
    const text = `${req.order}. ${req.title_en}`;
    coverPage.drawText(text, {
      x: MARGIN + 12,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.18),
    });
    y -= LINE_H;
  }

  // --- Copy document pages in order ---
  const fileMap = {};
  for (const f of files) fileMap[f.id] = f;

  for (const req of included) {
    const file = fileMap[matches[req.id]];
    if (!file) continue;

    try {
      const srcDoc = await PDFDocument.load(file.arrayBuffer, {
        ignoreEncryption: true,
      });
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await mainDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        mainDoc.addPage(page);
      }
    } catch (e) {
      // Skip files that can't be loaded (shouldn't happen after validation)
      console.error(`Failed to copy pages from ${file.name}:`, e);
    }
  }

  // --- Stamp footers on ALL pages ---
  const allPages = mainDoc.getPages();
  const totalPages = allPages.length;
  const tenderId = tender.tender_id;

  for (let i = 0; i < totalPages; i++) {
    const page = allPages[i];
    const { width, height } = page.getSize();
    const footerText = `${tenderId} | Page ${i + 1} of ${totalPages}`;
    const textWidth = fontRegular.widthOfTextAtSize(footerText, FOOTER_FONT_SIZE);

    // White background strip for readability
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: FOOTER_H,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });

    // Thin separator line
    page.drawLine({
      start: { x: 0, y: FOOTER_H },
      end: { x: width, y: FOOTER_H },
      thickness: 0.3,
      color: rgb(0.75, 0.75, 0.78),
    });

    // Footer text centered
    page.drawText(footerText, {
      x: (width - textWidth) / 2,
      y: (FOOTER_H - FOOTER_FONT_SIZE) / 2 + 1,
      size: FOOTER_FONT_SIZE,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.28),
    });
  }

  return mainDoc.save();
}

/**
 * Trigger download of a Uint8Array as a PDF file.
 */
export function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
