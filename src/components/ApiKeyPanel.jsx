import { useState } from 'react';
import { t } from '../i18n/translations';
import { testApiKey } from '../utils/aiMatcher';

export default function ApiKeyPanel({
  lang,
  apiKey,
  onSetApiKey,
  onClose,
}) {
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function handleTest() {
    if (!inputValue.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await testApiKey(inputValue.trim());
      setTestResult({ ok: true, msg: t(lang, 'apiKeyValid') });
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    onSetApiKey(inputValue.trim());
    onClose();
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{t(lang, 'apiSettings')}</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <p className="api-warning">{t(lang, 'apiKeyWarning')}</p>

          <label className="api-label">
            {t(lang, 'groqApiKey')}
            <input
              type="password"
              className="api-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="gsk_..."
              id="api-key-input"
            />
          </label>

          {testResult && (
            <div className={`api-test-result ${testResult.ok ? 'api-test-ok' : 'api-test-error'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button
            className="api-test-btn"
            onClick={handleTest}
            disabled={testing || !inputValue.trim()}
          >
            {testing ? '…' : t(lang, 'testConnection')}
          </button>
          <button
            className="api-save-btn"
            onClick={handleSave}
            disabled={!inputValue.trim()}
          >
            {t(lang, 'save')}
          </button>
        </div>
      </div>
    </div>
  );
}
