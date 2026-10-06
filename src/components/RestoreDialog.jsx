import { t } from '../i18n/translations';

export default function RestoreDialog({
  lang,
  autoSaveData,
  onRestore,
  onDiscard,
}) {
  const savedAt = autoSaveData?.savedAt
    ? new Date(autoSaveData.savedAt).toLocaleString()
    : '';
  const tenderId = autoSaveData?.tender?.tender_id || '';
  const fileRefs = autoSaveData?.fileRefs || [];

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog--narrow">
        <div className="dialog-header">
          <h3>{t(lang, 'resumeSession')}</h3>
        </div>

        <div className="dialog-body">
          <p className="restore-info">
            {t(lang, 'sessionFound')}
          </p>

          <div className="restore-details">
            <div className="restore-row">
              <span className="restore-label">{t(lang, 'tenderId')}:</span>
              <span>{tenderId}</span>
            </div>
            <div className="restore-row">
              <span className="restore-label">{t(lang, 'savedAt')}:</span>
              <span>{savedAt}</span>
            </div>
          </div>

          {fileRefs.length > 0 && (
            <div className="restore-files">
              <p className="restore-files-label">{t(lang, 'reuploadNeeded')}:</p>
              <ul className="restore-file-list">
                {fileRefs.map((f) => (
                  <li key={f.id}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="restore-discard-btn" onClick={onDiscard}>
            {t(lang, 'discard')}
          </button>
          <button className="restore-resume-btn" onClick={onRestore}>
            {t(lang, 'resume')}
          </button>
        </div>
      </div>
    </div>
  );
}
