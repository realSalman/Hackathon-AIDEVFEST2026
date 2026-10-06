/**
 * Project persistence — save/restore work to file or localStorage.
 */

const AUTOSAVE_KEY = 'tdp_autosave';

// --- Base64 helpers ---

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- Full project file (download/upload) ---

export function serializeProject(state) {
  const { lang, tender, requirements, matches, expiries, files, sealImage, sealPlacements } = state;

  return JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    lang,
    tender,
    requirements,
    matches,
    expiries,
    sealPlacements: sealPlacements || [],
    sealImage: sealImage
      ? {
          name: sealImage.name,
          data: arrayBufferToBase64(sealImage.arrayBuffer),
        }
      : null,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      pageCount: f.pageCount,
      hash: f.hash,
      data: arrayBufferToBase64(f.arrayBuffer),
    })),
  });
}

export function deserializeProject(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.tender || !data.requirements) {
    throw new Error('Invalid project file');
  }

  const files = (data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    pageCount: f.pageCount,
    hash: f.hash,
    arrayBuffer: base64ToArrayBuffer(f.data),
  }));

  const sealImage = data.sealImage
    ? {
        name: data.sealImage.name,
        arrayBuffer: base64ToArrayBuffer(data.sealImage.data),
        dataUrl: null, // Rebuild below
      }
    : null;

  if (sealImage) {
    const blob = new Blob([sealImage.arrayBuffer], { type: 'image/png' });
    sealImage.dataUrl = URL.createObjectURL(blob);
  }

  return {
    lang: data.lang || 'en',
    tender: data.tender,
    requirements: data.requirements,
    matches: data.matches || {},
    expiries: data.expiries || {},
    files,
    sealImage,
    sealPlacements: data.sealPlacements || [],
  };
}

export function downloadProject(state, tenderId) {
  const json = serializeProject(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tenderId || 'project'}_project.tdp`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- localStorage auto-save (metadata only, no file data) ---

export function autoSave(state) {
  try {
    const data = {
      version: 1,
      savedAt: new Date().toISOString(),
      lang: state.lang,
      tender: state.tender,
      requirements: state.requirements,
      matches: state.matches,
      expiries: state.expiries,
      sealPlacements: state.sealPlacements || [],
      fileRefs: (state.files || []).map((f) => ({
        id: f.id,
        name: f.name,
        hash: f.hash,
        pageCount: f.pageCount,
      })),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError — silently ignore
  }
}

export function loadAutoSave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.version || !data.tender) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Given restored metadata and re-uploaded files, reconnect matches by hash.
 */
export function reconnectFiles(autoSaveData, uploadedFiles) {
  const hashToNewId = {};
  for (const f of uploadedFiles) {
    hashToNewId[f.hash] = f.id;
  }

  const oldIdToNewId = {};
  for (const ref of autoSaveData.fileRefs || []) {
    if (hashToNewId[ref.hash]) {
      oldIdToNewId[ref.id] = hashToNewId[ref.hash];
    }
  }

  // Remap matches
  const newMatches = {};
  for (const [reqId, oldFileId] of Object.entries(autoSaveData.matches || {})) {
    if (oldIdToNewId[oldFileId]) {
      newMatches[reqId] = oldIdToNewId[oldFileId];
    }
  }

  return newMatches;
}
