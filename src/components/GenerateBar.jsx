import { t } from '../i18n/translations';

export default function GenerateBar({
  lang,
  tender,
  hasBlockers,
  blockingReasons,
  isGenerating,
  packageReady,
  generateError,
  onGenerate,
  onDownload,
  onExportChecklist,
}) {
  if (!tender) return null;

  return (
    <footer className="generate-bar" id="generate-bar">
      <div className="generate-bar-left">
        {generateError ? (
          <span className="generate-error">{t(lang, 'generateFailed')}: {generateError}</span>
        ) : hasBlockers ? (
          <div className="blocking-summary">
            <span className="blocking-label">
              {blockingReasons.length} {t(lang, 'blocking')}:
            </span>
            <div className="blocking-list">
              {blockingReasons.map((r) => (
                <span key={r.id} className="blocking-item">
                  <span className={`blocking-dot blocking-dot--${r.status}`} />
                  {r.title}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="no-blockers">{t(lang, 'noBlockers')}</span>
        )}
      </div>
      <div className="generate-bar-right">
        <button
          className="export-btn"
          onClick={onExportChecklist}
          id="export-checklist-btn"
        >
          {t(lang, 'exportChecklist')}
        </button>
        {packageReady && !isGenerating && (
          <button
            className="download-btn"
            onClick={onDownload}
            id="download-btn"
          >
            {t(lang, 'download')}
          </button>
        )}
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={hasBlockers || isGenerating}
          id="generate-btn"
        >
          {isGenerating ? t(lang, 'generating') : t(lang, 'generate')}
        </button>
      </div>
    </footer>
  );
}
