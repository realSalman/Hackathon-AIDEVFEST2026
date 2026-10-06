/**
 * Pure status engine.
 * Takes the full state and returns a status for every requirement.
 *
 * @param {Array} requirements — sorted requirement objects
 * @param {Object} matches — { requirementId: fileId }
 * @param {Object} expiries — { requirementId: 'YYYY-MM-DD' }
 * @param {string} deadline — 'YYYY-MM-DD'
 * @returns {Array<{ id, status, blocking }>}
 */
export function computeStatuses(requirements, matches, expiries, deadline) {
  return requirements.map((req) => {
    const fileId = matches[req.id];
    const hasFile = fileId !== undefined && fileId !== null;

    // No file matched
    if (!hasFile) {
      if (req.mandatory) {
        return { id: req.id, status: 'missing', blocking: true };
      }
      return { id: req.id, status: 'not_provided', blocking: false };
    }

    // File matched, check expiry if needed
    if (req.has_expiry) {
      const expiryStr = expiries[req.id];
      if (!expiryStr) {
        return { id: req.id, status: 'expiry_needed', blocking: true };
      }
      // Compare dates: expired if expiry is BEFORE deadline
      // Same day is OK → only block if strictly before
      const expiry = new Date(expiryStr + 'T00:00:00');
      const deadlineDate = new Date(deadline + 'T00:00:00');
      if (expiry < deadlineDate) {
        return { id: req.id, status: 'expired', blocking: true };
      }
    }

    return { id: req.id, status: 'ok', blocking: false };
  });
}

/**
 * Get human-readable blocking reasons.
 */
export function getBlockingReasons(requirements, statuses, lang) {
  const reasons = [];
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i].blocking) {
      const req = requirements.find((r) => r.id === statuses[i].id);
      const title = lang === 'bn' ? req.title_bn : req.title_en;
      reasons.push({ id: statuses[i].id, title, status: statuses[i].status });
    }
  }
  return reasons;
}
