import { useRef, useCallback } from 'react';
import { t } from '../i18n/translations';

export default function SealPanel({
  lang,
  sealImage,
  sealPlacements,
  requirements,
  matches,
  onUploadSeal,
  onRemoveSeal,
  onTogglePlacement,
  onSetPosition,
}) {
  const inputRef = useRef(null);

  // Only show matched requirements
  const matchedReqs = requirements.filter((r) => matches[r.id]);

  const handleFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate: must be image
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate: max 2 MB
      if (file.size > 2 * 1024 * 1024) {
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const dataUrl = URL.createObjectURL(file);
      onUploadSeal({ name: file.name, arrayBuffer, dataUrl });
      e.target.value = '';
    },
    [onUploadSeal]
  );

  const placementMap = {};
  for (const p of sealPlacements) {
    placementMap[p.reqId] = p;
  }

  return (
    <div className="seal-panel" id="seal-panel">
      <div className="seal-panel-header">
        <h3>{t(lang, 'sealSignature')}</h3>
      </div>

      {!sealImage ? (
        <div
          className="seal-upload"
          onClick={() => inputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" className="seal-upload-icon">
            <path
              d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"
              fill="currentColor"
            />
          </svg>
          <span>{t(lang, 'uploadSeal')}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleFile}
            id="seal-input"
          />
        </div>
      ) : (
        <div className="seal-config">
          <div className="seal-preview-row">
            <img
              src={sealImage.dataUrl}
              alt="Seal"
              className="seal-preview"
            />
            <div className="seal-meta">
              <span className="seal-name">{sealImage.name}</span>
              <button className="seal-remove" onClick={onRemoveSeal}>
                {t(lang, 'removeSeal')}
              </button>
            </div>
          </div>

          {matchedReqs.length > 0 && (
            <div className="seal-placements">
              <span className="seal-placements-label">
                {t(lang, 'stampOn')}:
              </span>
              {matchedReqs.map((req) => {
                const title = lang === 'bn' ? req.title_bn : req.title_en;
                const placement = placementMap[req.id];
                const isChecked = !!placement;
                return (
                  <div key={req.id} className="seal-placement-row">
                    <label className="seal-check-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onTogglePlacement(req.id)}
                      />
                      <span>{title}</span>
                    </label>
                    {isChecked && (
                      <select
                        className="seal-position-select"
                        value={placement.position}
                        onChange={(e) =>
                          onSetPosition(req.id, e.target.value)
                        }
                      >
                        <option value="bottom-right">{t(lang, 'bottomRight')}</option>
                        <option value="bottom-center">{t(lang, 'bottomCenter')}</option>
                        <option value="bottom-left">{t(lang, 'bottomLeft')}</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
