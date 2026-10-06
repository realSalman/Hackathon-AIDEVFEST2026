import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { renderTextToImage } from './banglaRenderer';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 50;
const FOOTER_H = 24;
const FOOTER_FONT_SIZE = 8;
const LINE_H = 18;

/**
 * Build the final merged PDF package.
 *
 * @param {Object} tender — tender metadata
 * @param {Array} requirements — sorted by order
 * @param {Object} matches — { reqId: fileId }
 * @param {Array} files — [{ id, name, arrayBuffer, pageCount }]
 * @param {Object} options — { sealImage, sealPlacements, expiries }
 * @returns {Promise<Uint8Array>}
 */
export async function buildPackage(tender, requirements, matches, files, options = {}) {
  const { sealImage, sealPlacements = [], expiries = {} } = options;
  const mainDoc = await PDFDocument.create();
  const fontRegular = await mainDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await mainDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular: fontRegular, bold: fontBold };

  // Determine which requirements are included (matched files, in order)
  const included = requirements
    .filter((req) => matches[req.id])
    .sort((a, b) => a.order - b.order);

  const fileMap = {};
  for (const f of files) fileMap[f.id] = f;

  // === PASS 1: Assemble all pages ===

  // 1a. Cover page
  const coverPage = mainDoc.addPage([A4_W, A4_H]);
  await drawCoverPage(coverPage, tender, included, fonts, mainDoc);

  // 1b. Index page (placeholder — filled in pass 2)
  const indexPage = mainDoc.addPage([A4_W, A4_H]);

  // 1c. Copy document pages in order, track offsets
  const docOffsets = [];
  let nextPage = 3; // cover=1, index=2, first doc=3

  for (const req of included) {
    const file = fileMap[matches[req.id]];
    if (!file) continue;

    try {
      const srcDoc = await PDFDocument.load(file.arrayBuffer, {
        ignoreEncryption: true,
      });
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await mainDoc.copyPages(srcDoc, pageIndices);

      docOffsets.push({
        reqId: req.id,
        order: req.order,
        titleEn: req.title_en,
        titleBn: req.title_bn,
        startPage: nextPage,
        pageCount: copiedPages.length,
      });

      for (const page of copiedPages) {
        mainDoc.addPage(page);
      }
      nextPage += copiedPages.length;
    } catch (e) {
      console.error(`Failed to copy pages from ${file.name}:`, e);
    }
  }

  // === PASS 2: Fill index, stamp seals, stamp footers ===

  // 2a. Draw index table
  await drawIndexPage(indexPage, docOffsets, fonts, mainDoc, expiries, tender.submission_deadline);

  // 2b. Stamp seal on first page of selected documents
  if (sealImage && sealPlacements.length > 0) {
    await stampSeals(mainDoc, docOffsets, sealImage, sealPlacements);
  }

  // 2c. Stamp footer on ALL pages
  const allPages = mainDoc.getPages();
  const totalPages = allPages.length;
  const tenderId = tender.tender_id;

  for (let i = 0; i < totalPages; i++) {
    stampFooter(allPages[i], tenderId, i + 1, totalPages, fonts);
  }

  return mainDoc.save();
}

// === Cover Page ===

async function drawCoverPage(page, tender, included, fonts, mainDoc) {
  let y = A4_H - MARGIN;

  // Title
  page.drawText('TENDER SUBMISSION PACKAGE', {
    x: MARGIN,
    y,
    size: 18,
    font: fonts.bold,
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
    page.drawText(`${label}:`, {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.bold,
      color: rgb(0.2, 0.2, 0.24),
    });
    page.drawText(value, {
      x: MARGIN + 140,
      y,
      size: 10,
      font: fonts.regular,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= LINE_H;
  }

  // Divider line
  y -= LINE_H * 0.5;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_W - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.72),
  });
  y -= LINE_H * 1.2;

  // Included documents list
  page.drawText('Included Documents:', {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 1.4;

  for (const req of included) {
    // English title
    const text = `${req.order}. ${req.title_en}`;
    page.drawText(text, {
      x: MARGIN + 12,
      y,
      size: 10,
      font: fonts.regular,
      color: rgb(0.15, 0.15, 0.18),
    });
    y -= LINE_H * 0.7;

    // Bangla title (rendered as image)
    try {
      const banglaImg = await renderTextToImage(req.title_bn, {
        fontSize: 9,
        color: '#777',
        maxWidth: 300,
      });
      const pngImage = await mainDoc.embedPng(banglaImg.pngBytes);
      page.drawImage(pngImage, {
        x: MARGIN + 24,
        y: y - banglaImg.height + 4,
        width: banglaImg.width,
        height: banglaImg.height,
      });
      y -= banglaImg.height + 2;
    } catch {
      // If canvas rendering fails, skip Bangla
      y -= 4;
    }
    y -= LINE_H * 0.3;
  }
}

// === Index Page ===

async function drawIndexPage(page, docOffsets, fonts, mainDoc, expiries, deadline) {
  let y = A4_H - MARGIN;

  page.drawText('INDEX OF DOCUMENTS', {
    x: MARGIN,
    y,
    size: 14,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 2;

  // Table header
  const COL_NUM = MARGIN;
  const COL_DOC = MARGIN + 30;
  const COL_PAGE = A4_W - MARGIN - 40;

  page.drawText('#', { x: COL_NUM, y, size: 9, font: fonts.bold, color: rgb(0.3, 0.3, 0.35) });
  page.drawText('Document', { x: COL_DOC, y, size: 9, font: fonts.bold, color: rgb(0.3, 0.3, 0.35) });
  page.drawText('Page', { x: COL_PAGE, y, size: 9, font: fonts.bold, color: rgb(0.3, 0.3, 0.35) });
  y -= 4;

  // Header underline
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_W - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.64),
  });
  y -= LINE_H;

  for (const doc of docOffsets) {
    // Order number
    page.drawText(String(doc.order), {
      x: COL_NUM + 4,
      y,
      size: 9,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.24),
    });

    // English title
    page.drawText(doc.titleEn, {
      x: COL_DOC,
      y,
      size: 9,
      font: fonts.regular,
      color: rgb(0.15, 0.15, 0.18),
    });

    // Page number
    page.drawText(String(doc.startPage), {
      x: COL_PAGE + 8,
      y,
      size: 9,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.24),
    });

    y -= LINE_H * 0.6;

    // Bangla subtitle
    try {
      const banglaImg = await renderTextToImage(doc.titleBn, {
        fontSize: 8,
        color: '#888',
        maxWidth: 280,
      });
      const pngImage = await mainDoc.embedPng(banglaImg.pngBytes);
      page.drawImage(pngImage, {
        x: COL_DOC + 4,
        y: y - banglaImg.height + 3,
        width: banglaImg.width,
        height: banglaImg.height,
      });
      y -= banglaImg.height;
    } catch {
      // skip
    }

    y -= LINE_H * 0.5;
  }
}

// === Seal Stamping ===

async function stampSeals(mainDoc, docOffsets, sealImage, sealPlacements) {
  // Determine image type and embed
  const isJpeg = sealImage.name?.match(/\.jpe?g$/i);
  let embeddedImage;
  try {
    embeddedImage = isJpeg
      ? await mainDoc.embedJpg(sealImage.arrayBuffer)
      : await mainDoc.embedPng(sealImage.arrayBuffer);
  } catch (e) {
    console.error('Failed to embed seal image:', e);
    return;
  }

  const sealW = 80;
  const sealH = (embeddedImage.height / embeddedImage.width) * sealW;
  const allPages = mainDoc.getPages();

  for (const placement of sealPlacements) {
    const offset = docOffsets.find((d) => d.reqId === placement.reqId);
    if (!offset) continue;

    const pageIndex = offset.startPage - 1; // 0-indexed
    if (pageIndex < 0 || pageIndex >= allPages.length) continue;

    const page = allPages[pageIndex];
    const { width } = page.getSize();

    let x;
    switch (placement.position) {
      case 'bottom-left':
        x = MARGIN;
        break;
      case 'bottom-center':
        x = (width - sealW) / 2;
        break;
      case 'bottom-right':
      default:
        x = width - MARGIN - sealW;
        break;
    }

    page.drawImage(embeddedImage, {
      x,
      y: FOOTER_H + 10,
      width: sealW,
      height: sealH,
      opacity: 0.85,
    });
  }
}

// === Footer ===

function stampFooter(page, tenderId, pageNum, totalPages, fonts) {
  const { width } = page.getSize();
  const footerText = `${tenderId} | Page ${pageNum} of ${totalPages}`;
  const textWidth = fonts.regular.widthOfTextAtSize(footerText, FOOTER_FONT_SIZE);

  // White background strip
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: FOOTER_H,
    color: rgb(1, 1, 1),
    opacity: 0.85,
  });

  // Separator line
  page.drawLine({
    start: { x: 0, y: FOOTER_H },
    end: { x: width, y: FOOTER_H },
    thickness: 0.3,
    color: rgb(0.75, 0.75, 0.78),
  });

  // Centered text
  page.drawText(footerText, {
    x: (width - textWidth) / 2,
    y: (FOOTER_H - FOOTER_FONT_SIZE) / 2 + 1,
    size: FOOTER_FONT_SIZE,
    font: fonts.regular,
    color: rgb(0.25, 0.25, 0.28),
  });
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
