import { t } from '../i18n/translations';

export default function FileRow({
  lang,
  file,
  isDuplicate,
  isMatched,
  matchedReqTitle,
  onRemove,
}) {
  return (
    <div
      className={`file-row ${isDuplicate ? 'file-row--duplicate' : ''} ${isMatched ? 'file-row--matched' : ''}`}
      id={`file-${file.id}`}
    >
      <div className="file-row-main">
        <svg className="file-icon" viewBox="0 0 16 20" width="14" height="18">
          <path
            d="M10 0H2C.9 0 0 .9 0 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6l-6-6zm4 18H2V2h7v5h5v11z"
            fill="currentColor"
          />
        </svg>
        <span className="file-name" title={file.name}>{file.name}</span>
        <span className="file-pages">
          {file.pageCount} {file.pageCount === 1 ? t(lang, 'page') : t(lang, 'pages')}
        </span>
        {isDuplicate && (
          <span className="file-dup-badge">{t(lang, 'duplicate')}</span>
        )}
      </div>
      <div className="file-row-actions">
        {isMatched && matchedReqTitle && (
          <span className="file-matched-info">
            → {matchedReqTitle}
          </span>
        )}
        <button
          className="file-remove-btn"
          onClick={() => onRemove(file.id)}
          title={t(lang, 'remove')}
          id={`remove-${file.id}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
