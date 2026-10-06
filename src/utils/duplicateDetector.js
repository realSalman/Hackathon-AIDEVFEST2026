/**
 * Compute SHA-256 hash of an ArrayBuffer using the Web Crypto API.
 * Returns a hex string.
 */
export async function hashBuffer(arrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Given a list of files with { id, hash }, return groups of duplicate file IDs.
 * Only returns groups with 2+ files.
 *
 * @param {Array<{ id: string, hash: string }>} files
 * @returns {Array<string[]>} — each element is an array of file IDs sharing the same hash
 */
export function findDuplicateGroups(files) {
  const byHash = {};
  for (const f of files) {
    if (!byHash[f.hash]) byHash[f.hash] = [];
    byHash[f.hash].push(f.id);
  }
  return Object.values(byHash).filter((group) => group.length > 1);
}

/**
 * Flatten duplicate groups into a Set of file IDs that are duplicates.
 */
export function getDuplicateFileIds(duplicateGroups) {
  const s = new Set();
  for (const group of duplicateGroups) {
    for (const id of group) s.add(id);
  }
  return s;
}

/**
 * Check if matching fileId to reqId would violate duplicate constraints.
 * Rule: if fileA is a duplicate of fileB, and fileB is already matched
 * to a DIFFERENT requirement, then fileA cannot be matched.
 *
 * @param {string} fileId — file being matched
 * @param {string} reqId — requirement being matched to
 * @param {Array<string[]>} duplicateGroups
 * @param {Object} matches — { reqId: fileId }
 * @returns {{ allowed: boolean, conflictFileId?: string }}
 */
export function canMatchFile(fileId, reqId, duplicateGroups, matches) {
  // Find the group this file belongs to
  const group = duplicateGroups.find((g) => g.includes(fileId));
  if (!group) return { allowed: true };

  // Check if any other file in the same group is matched to a DIFFERENT requirement
  const reverseMatches = {};
  for (const [rId, fId] of Object.entries(matches)) {
    reverseMatches[fId] = rId;
  }

  for (const otherId of group) {
    if (otherId === fileId) continue;
    const matchedToReq = reverseMatches[otherId];
    if (matchedToReq && matchedToReq !== reqId) {
      return { allowed: false, conflictFileId: otherId };
    }
  }

  return { allowed: true };
}
