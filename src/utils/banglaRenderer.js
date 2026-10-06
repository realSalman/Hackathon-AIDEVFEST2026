/**
 * Render Bangla text to a PNG image using an offscreen canvas.
 * This bypasses pdf-lib's lack of complex text shaping for Bengali script.
 */

const DEFAULT_FONT = "'Noto Sans Bengali', 'Kalpurush', 'Bangla MN', sans-serif";

/**
 * Render a line of text to PNG bytes via canvas.
 *
 * @param {string} text — text to render (Bangla or any script)
 * @param {Object} options
 * @returns {Promise<{ pngBytes: Uint8Array, width: number, height: number }>}
 */
export async function renderTextToImage(text, options = {}) {
  const {
    fontSize = 11,
    fontFamily = DEFAULT_FONT,
    fontWeight = '400',
    color = '#1a1a2e',
    maxWidth = 420,
  } = options;

  // Wait for fonts to load
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const fontStr = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // Measure text
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  const textWidth = Math.min(Math.ceil(metrics.width), maxWidth);
  const textHeight = Math.ceil(fontSize * 1.5);

  // 2x scale for crisp rendering
  const scale = 2;
  canvas.width = (textWidth + 4) * scale;
  canvas.height = (textHeight + 4) * scale;

  ctx.scale(scale, scale);
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 2, 2, maxWidth);

  // Convert to PNG bytes
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const buffer = await blob.arrayBuffer();

  return {
    pngBytes: new Uint8Array(buffer),
    width: textWidth + 4,
    height: textHeight + 4,
  };
}
