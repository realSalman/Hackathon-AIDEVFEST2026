/**
 * Generate output/T-2026-0417_Package.pdf from the sample pack.
 * Standalone Node.js script using pdf-lib — no browser dependencies.
 *
 * Run: node scripts/generate_output.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SAMPLE = join(ROOT, 'sample-pack');
const OUTPUT = join(ROOT, 'output');

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 50;
const FOOTER_H = 24;
const FOOTER_FONT_SIZE = 8;
const LINE_H = 18;

// === Correct matches (from file analysis) ===
const MATCHES = {
  R01: { file: 'trade_license_2026.pdf',     expiry: '2027-03-15' },
  R02: { file: '03_tin_certificate.pdf',     expiry: null },
  R03: { file: '04_vat_certificate.pdf',     expiry: null },
  R04: { file: 'bank_solvency.pdf',          expiry: '2027-01-31' },
  R05: { file: 'experience_cert.pdf',        expiry: null },
  // R06: optional, no file
  // R07: optional, no file
  R08: { file: '02_technical_proposal.pdf',  expiry: null },
  R09: { file: '01_financial_proposal.pdf',  expiry: null },
  R10: { file: 'scan_0042.pdf',             expiry: null },
};

async function main() {
  // 1. Read requirements
  const reqData = JSON.parse(readFileSync(join(SAMPLE, 'requirements.json'), 'utf-8'));
  const tender = reqData.tender;
  const requirements = [...reqData.requirements].sort((a, b) => a.order - b.order);

  // 2. Filter to included requirements (matched only)
  const included = requirements.filter((r) => MATCHES[r.id]);

  // 3. Create main document
  const mainDoc = await PDFDocument.create();
  const fontRegular = await mainDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await mainDoc.embedFont(StandardFonts.HelveticaBold);

  // === Cover Page ===
  const coverPage = mainDoc.addPage([A4_W, A4_H]);
  let y = A4_H - MARGIN;

  coverPage.drawText('TENDER SUBMISSION PACKAGE', {
    x: MARGIN, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 2.2;

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
      x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.24),
    });
    coverPage.drawText(value, {
      x: MARGIN + 140, y, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.12),
    });
    y -= LINE_H;
  }

  y -= LINE_H * 0.5;
  coverPage.drawLine({
    start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.72),
  });
  y -= LINE_H * 1.2;

  coverPage.drawText('Included Documents:', {
    x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 1.4;

  for (const req of included) {
    coverPage.drawText(`${req.order}. ${req.title_en}`, {
      x: MARGIN + 12, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.18),
    });
    y -= LINE_H;
  }

  // === Index Page (placeholder) ===
  const indexPage = mainDoc.addPage([A4_W, A4_H]);

  // === Copy document pages ===
  const docOffsets = [];
  let nextPage = 3;

  for (const req of included) {
    const match = MATCHES[req.id];
    const filePath = join(SAMPLE, 'documents', match.file);
    const fileBytes = readFileSync(filePath);

    const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const indices = srcDoc.getPageIndices();
    const copied = await mainDoc.copyPages(srcDoc, indices);

    docOffsets.push({
      order: req.order,
      titleEn: req.title_en,
      startPage: nextPage,
      pageCount: copied.length,
    });

    for (const page of copied) mainDoc.addPage(page);
    nextPage += copied.length;
  }

  // === Fill Index Page ===
  y = A4_H - MARGIN;
  const COL_NUM = MARGIN;
  const COL_DOC = MARGIN + 30;
  const COL_PAGE = A4_W - MARGIN - 40;

  indexPage.drawText('INDEX OF DOCUMENTS', {
    x: MARGIN, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.12),
  });
  y -= LINE_H * 2;

  indexPage.drawText('#', { x: COL_NUM, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.35) });
  indexPage.drawText('Document', { x: COL_DOC, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.35) });
  indexPage.drawText('Page', { x: COL_PAGE, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.35) });
  y -= 4;

  indexPage.drawLine({
    start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y },
    thickness: 0.5, color: rgb(0.6, 0.6, 0.64),
  });
  y -= LINE_H;

  for (const doc of docOffsets) {
    indexPage.drawText(String(doc.order), {
      x: COL_NUM + 4, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.24),
    });
    indexPage.drawText(doc.titleEn, {
      x: COL_DOC, y, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.18),
    });
    indexPage.drawText(String(doc.startPage), {
      x: COL_PAGE + 8, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.24),
    });
    y -= LINE_H;
  }

  // === Stamp footers on ALL pages ===
  const allPages = mainDoc.getPages();
  const totalPages = allPages.length;

  for (let i = 0; i < totalPages; i++) {
    const page = allPages[i];
    const { width } = page.getSize();
    const footerText = `${tender.tender_id} | Page ${i + 1} of ${totalPages}`;
    const textWidth = fontRegular.widthOfTextAtSize(footerText, FOOTER_FONT_SIZE);

    page.drawRectangle({
      x: 0, y: 0, width, height: FOOTER_H,
      color: rgb(1, 1, 1), opacity: 0.85,
    });
    page.drawLine({
      start: { x: 0, y: FOOTER_H }, end: { x: width, y: FOOTER_H },
      thickness: 0.3, color: rgb(0.75, 0.75, 0.78),
    });
    page.drawText(footerText, {
      x: (width - textWidth) / 2,
      y: (FOOTER_H - FOOTER_FONT_SIZE) / 2 + 1,
      size: FOOTER_FONT_SIZE, font: fontRegular, color: rgb(0.25, 0.25, 0.28),
    });
  }

  // === Save ===
  const pdfBytes = await mainDoc.save();

  if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true });
  const outPath = join(OUTPUT, `${tender.tender_id}_Package.pdf`);
  writeFileSync(outPath, pdfBytes);

  console.log(`✓ Generated ${outPath}`);
  console.log(`  Cover + Index + ${docOffsets.length} documents = ${totalPages} pages`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
