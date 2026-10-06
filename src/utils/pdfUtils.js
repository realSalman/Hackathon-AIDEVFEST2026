import { PDFDocument } from 'pdf-lib';

/**
 * Validate that an ArrayBuffer is a valid PDF and return its page count.
 * Returns { valid, pageCount, error }.
 */
export async function validateAndCountPages(arrayBuffer) {
  // Check for empty
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return { valid: false, pageCount: 0, error: 'empty' };
  }

  // Check PDF magic bytes: %PDF-
  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const magic = String.fromCharCode(...header);
  if (magic !== '%PDF-') {
    return { valid: false, pageCount: 0, error: 'not_pdf' };
  }

  try {
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageCount = pdf.getPageCount();
    return { valid: true, pageCount, error: null };
  } catch (e) {
    return { valid: false, pageCount: 0, error: 'corrupt' };
  }
}

/**
 * Read a File object into an ArrayBuffer.
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
