import { PDFDocument } from 'pdf-lib';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

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
    if (pageCount === 0) {
      return { valid: false, pageCount: 0, error: 'no_pages' };
    }
    return { valid: true, pageCount, error: null };
  } catch (e) {
    // Distinguish password-protected from other corruption
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('encrypt') || msg.includes('password') || msg.includes('protected')) {
      return { valid: false, pageCount: 0, error: 'password_protected' };
    }
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
