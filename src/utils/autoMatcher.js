/**
 * Auto-match files to requirements by filename scoring.
 *
 * Algorithm:
 * 1. Normalize filenames and requirement titles.
 * 2. Score each (file, requirement) pair using word overlap + keyword aliases.
 * 3. Greedy assignment: pick highest-scoring pair, remove both, repeat.
 * 4. Only suggest matches with score >= THRESHOLD.
 */

const THRESHOLD = 35;

const ALIASES = {
  trade: ['trade license', 'trade'],
  tin: ['tin certificate', 'tin', 'tax identification'],
  vat: ['vat registration', 'vat', 'value added tax'],
  bank: ['bank solvency', 'solvency', 'bank'],
  experience: ['experience certificate', 'experience'],
  financial_proposal: ['financial proposal'],
  technical_proposal: ['technical proposal'],
  financial_stmt: ['audited financial statement', 'audited financial', 'audit'],
  manufacturer: ['manufacturer authorization', 'manufacturer'],
  declaration: ['signed declaration', 'declaration'],
};

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(s) {
  return new Set(s.split(' ').filter((w) => w.length > 1));
}

function score(fileName, reqTitleEn) {
  const fn = normalize(fileName);
  const tn = normalize(reqTitleEn);

  // Exact containment
  if (fn.includes(tn)) return 100;
  if (tn.includes(fn)) return 90;

  // Word overlap
  const wordsF = wordSet(fn);
  const wordsT = wordSet(tn);
  const shared = [...wordsF].filter((w) => wordsT.has(w));
  const union = new Set([...wordsF, ...wordsT]);
  let overlapScore = union.size > 0 ? (shared.length / union.size) * 80 : 0;

  // Alias boost: check if any alias group matches both filename and title
  for (const aliases of Object.values(ALIASES)) {
    const fnHit = aliases.some((a) => fn.includes(a));
    const tnHit = aliases.some((a) => tn.includes(a));
    if (fnHit && tnHit) {
      overlapScore = Math.max(overlapScore, 75);
    }
  }

  return overlapScore;
}

/**
 * Compute match suggestions.
 *
 * @param {Array} files — [{ id, name }]
 * @param {Array} requirements — [{ id, title_en }]
 * @param {Object} currentMatches — { reqId: fileId } (already matched)
 * @param {Set} duplicateFileIds — files that are duplicates
 * @returns {Array<{ reqId, fileId, fileName, reqTitle, score }>}
 */
export function computeAutoMatchSuggestions(
  files,
  requirements,
  currentMatches,
  duplicateFileIds
) {
  const matchedReqIds = new Set(Object.keys(currentMatches));
  const matchedFileIds = new Set(Object.values(currentMatches));

  const unmatchedReqs = requirements.filter((r) => !matchedReqIds.has(r.id));
  const unmatchedFiles = files.filter((f) => {
    if (matchedFileIds.has(f.id)) return false;
    if (duplicateFileIds.has(f.id)) {
      // Allow if no duplicate sibling is already matched
      // (simplified: just skip all duplicates for auto-match)
      return false;
    }
    return true;
  });

  if (unmatchedReqs.length === 0 || unmatchedFiles.length === 0) return [];

  // Score all pairs
  const pairs = [];
  for (const req of unmatchedReqs) {
    for (const file of unmatchedFiles) {
      const s = score(file.name, req.title_en);
      if (s >= THRESHOLD) {
        pairs.push({
          reqId: req.id,
          fileId: file.id,
          fileName: file.name,
          reqTitle: req.title_en,
          score: s,
        });
      }
    }
  }

  // Sort by score descending
  pairs.sort((a, b) => b.score - a.score);

  // Greedy assignment
  const usedReqs = new Set();
  const usedFiles = new Set();
  const suggestions = [];

  for (const pair of pairs) {
    if (usedReqs.has(pair.reqId) || usedFiles.has(pair.fileId)) continue;
    suggestions.push(pair);
    usedReqs.add(pair.reqId);
    usedFiles.add(pair.fileId);
  }

  // Sort suggestions by requirement order
  const reqOrder = {};
  for (const r of requirements) reqOrder[r.id] = r.order;
  suggestions.sort((a, b) => (reqOrder[a.reqId] || 0) - (reqOrder[b.reqId] || 0));

  return suggestions;
}
