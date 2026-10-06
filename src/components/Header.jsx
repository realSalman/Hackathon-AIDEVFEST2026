import { t } from '../i18n/translations';

export default function Header({ tender, lang, onToggleLang, onLoadRequirements }) {
  return (
    <header className="header" id="header">
      <div className="header-left">
        <h1 className="header-title">{t(lang, 'appTitle')}</h1>
        {tender && (
          <span className="header-tender-id">{tender.tender_id}</span>
        )}
      </div>
      <div className="header-right">
        <label className="load-btn" id="load-requirements-btn">
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={onLoadRequirements}
          />
          {t(lang, 'loadRequirements')}
        </label>
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
