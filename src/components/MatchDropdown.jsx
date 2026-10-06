import { t } from '../i18n/translations';

/**
 * Dropdown to select which uploaded file matches a requirement.
 * Shows only unmatched files + the currently matched file.
 * Enforces 1:1 constraint and duplicate blocking.
 */
export default function MatchDropdown({
  lang,
  reqId,
  files,
  matches,
  currentFileId,
  duplicateFileIds,
  duplicateGroups,
  onMatch,
  onUnmatch,
}) {
  // Build available options: files not matched to OTHER requirements
  const matchedFileIds = new Set(Object.values(matches));

  const options = files.filter((f) => {
    // Always show the currently matched file
    if (f.id === currentFileId) return true;
    // Exclude files matched to other requirements
    if (matchedFileIds.has(f.id)) return false;
    return true;
  });

  // Check if a file can be matched (duplicate constraint)
  function isDuplicateBlocked(fileId) {
    if (!duplicateFileIds.has(fileId)) return false;
    const group = duplicateGroups.find((g) => g.includes(fileId));
    if (!group) return false;
    for (const otherId of group) {
      if (otherId === fileId) continue;
      // Check if another file in the same duplicate group is matched to a different req
      for (const [rId, fId] of Object.entries(matches)) {
        if (fId === otherId && rId !== reqId) return true;
      }
    }
    return false;
  }

  function handleChange(e) {
    const val = e.target.value;
    if (val === '') {
      onUnmatch(reqId);
    } else {
      onMatch(reqId, val);
    }
  }

  return (
    <select
      className="match-dropdown"
      value={currentFileId || ''}
      onChange={handleChange}
      id={`match-${reqId}`}
    >
      <option value="">{t(lang, 'selectFile')}</option>
      {options.map((f) => {
        const blocked = isDuplicateBlocked(f.id);
        const isDup = duplicateFileIds.has(f.id);
        const label = f.name + (isDup ? ` [${t(lang, 'duplicate')}]` : '');
        return (
          <option key={f.id} value={f.id} disabled={blocked}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
