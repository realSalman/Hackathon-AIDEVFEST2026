import { useRef } from 'react';
import { t } from '../i18n/translations';

export default function Header({
  tender,
  lang,
  onToggleLang,
  onLoadRequirements,
  onSaveProject,
  onOpenProject,
  onAutoMatch,
  onAiMatch,
  onShowApiPanel,
  apiKey,
}) {
  const openRef = useRef(null);

  function handleOpenProject(e) {
    const file = e.target.files?.[0];
    if (file) {
      onOpenProject(file);
      e.target.value = '';
    }
  }

  return (
    <header className="header" id="header">
      <div className="header-left">
        <h1 className="header-title">{t(lang, 'appTitle')}</h1>
        {tender && (
          <span className="header-tender-id">{tender.tender_id}</span>
        )}
      </div>
      <div className="header-right">
        {tender && (
          <>
            <button
              className="header-btn"
              onClick={onAutoMatch}
              id="auto-match-btn"
              title={t(lang, 'autoMatch')}
            >
              {t(lang, 'autoMatch')}
            </button>
            {apiKey && (
              <button
                className="header-btn header-btn--ai"
                onClick={onAiMatch}
                id="ai-match-btn"
                title={t(lang, 'aiMatch')}
              >
                {t(lang, 'aiMatch')}
              </button>
            )}
            <button
              className="header-btn"
              onClick={onSaveProject}
              id="save-project-btn"
              title={t(lang, 'saveProject')}
            >
              {t(lang, 'saveProject')}
            </button>
          </>
        )}

        <label className="header-btn header-btn--open" id="open-project-btn">
          <input
            ref={openRef}
            type="file"
            accept=".tdp,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.name.endsWith('.tdp')) {
                  handleOpenProject(e);
                } else {
                  onLoadRequirements(e);
                }
              }
            }}
          />
          {tender ? t(lang, 'openProject') : t(lang, 'loadRequirements')}
        </label>

        <button
          className="header-btn header-btn--settings"
          onClick={onShowApiPanel}
          id="api-settings-btn"
          title={t(lang, 'apiSettings')}
        >
          ⚙
        </button>

        <button
          className="lang-toggle"
          id="lang-toggle"
          onClick={onToggleLang}
          title={t(lang, 'language')}
        >
          {lang === 'en' ? t(lang, 'switchToBn') : t(lang, 'switchToEn')}
        </button>
      </div>
    </header>
  );
}
