import { t } from '../i18n/translations';
import StatusBadge from './StatusBadge';
import MatchDropdown from './MatchDropdown';

export default function RequirementRow({
  lang,
  req,
  status,
  files,
  matches,
  expiries,
  duplicateFileIds,
  duplicateGroups,
  onMatch,
  onUnmatch,
  onSetExpiry,
}) {
  const title = lang === 'bn' ? req.title_bn : req.title_en;
  const currentFileId = matches[req.id] || null;
  const currentFile = currentFileId
    ? files.find((f) => f.id === currentFileId)
    : null;

  return (
    <div
      className={`req-row ${status.blocking ? 'req-row--blocking' : ''}`}
      id={`req-${req.id}`}
    >
      <div className="req-row-header">
        <span className="req-order">{req.order}</span>
        <span className="req-title">{title}</span>
        <span className={`req-tag ${req.mandatory ? 'req-tag--mandatory' : 'req-tag--optional'}`}>
          {req.mandatory ? t(lang, 'mandatory') : t(lang, 'optional')}
        </span>
        <StatusBadge status={status.status} lang={lang} />
      </div>

      <div className="req-row-controls">
        <MatchDropdown
          lang={lang}
          reqId={req.id}
          files={files}
          matches={matches}
          currentFileId={currentFileId}
          duplicateFileIds={duplicateFileIds}
          duplicateGroups={duplicateGroups}
          onMatch={onMatch}
          onUnmatch={onUnmatch}
        />

        {currentFile && (
          <span className="req-file-info">
            {currentFile.name} — {currentFile.pageCount}{' '}
            {currentFile.pageCount === 1 ? t(lang, 'page') : t(lang, 'pages')}
          </span>
        )}

        {req.has_expiry && currentFileId && (
          <div className="req-expiry">
            <label htmlFor={`expiry-${req.id}`} className="req-expiry-label">
              {t(lang, 'expiryDate')}:
            </label>
            <input
              type="date"
              id={`expiry-${req.id}`}
              className="expiry-input"
              value={expiries[req.id] || ''}
              onChange={(e) => onSetExpiry(req.id, e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
