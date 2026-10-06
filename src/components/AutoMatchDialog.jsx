import { t } from '../i18n/translations';

export default function AutoMatchDialog({
  lang,
  suggestions,
  isAI,
  onAccept,
  onAcceptAll,
  onReject,
  onClose,
}) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header">
            <h3>{isAI ? t(lang, 'aiMatch') : t(lang, 'autoMatch')}</h3>
            <button className="dialog-close" onClick={onClose}>×</button>
          </div>
          <p className="dialog-empty">{t(lang, 'noSuggestions')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{isAI ? t(lang, 'aiMatch') : t(lang, 'autoMatch')}</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {suggestions.map((s, i) => (
            <div key={i} className="suggestion-row">
              <div className="suggestion-info">
                <span className="suggestion-file">{s.fileName}</span>
                <span className="suggestion-arrow">→</span>
                <span className="suggestion-req">{s.reqTitle}</span>
                {s.confidence != null && (
                  <span className="suggestion-confidence">
                    {Math.round(s.confidence * 100)}%
                  </span>
                )}
                {s.reason && (
                  <span className="suggestion-reason">{s.reason}</span>
                )}
              </div>
              <div className="suggestion-actions">
                <button
                  className="suggestion-accept"
                  onClick={() => onAccept(s.reqId, s.fileId)}
                  title={t(lang, 'accept')}
                >
                  ✓
                </button>
                <button
                  className="suggestion-reject"
                  onClick={() => onReject(i)}
                  title={t(lang, 'reject')}
                >
                  ✗
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-footer">
          <button className="dialog-accept-all" onClick={onAcceptAll}>
            {t(lang, 'acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
