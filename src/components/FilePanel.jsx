import { useRef, useCallback } from 'react';
import { t } from '../i18n/translations';
import { MAX_FILES, MAX_TOTAL_BYTES } from '../utils/pdfUtils';
import FileRow from './FileRow';

export default function FilePanel({
  lang,
  files,
  rejections,
  duplicateFileIds,
  matches,
  requirements,
  onUpload,
  onRemoveFile,
  onRemoveAllFiles,
  onDismissRejection,
}) {
  const inputRef = useRef(null);

  // Build reverse match map: fileId → requirement title
  const reverseMatches = {};
  for (const [reqId, fileId] of Object.entries(matches)) {
    const req = requirements.find((r) => r.id === reqId);
    if (req) {
      reverseMatches[fileId] = lang === 'bn' ? req.title_bn : req.title_en;
    }
  }
  const matchedFileIds = new Set(Object.values(matches));

  const totalBytes = files.reduce((s, f) => s + (f.arrayBuffer?.byteLength || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const maxMB = (MAX_TOTAL_BYTES / (1024 * 1024)).toFixed(0);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drop-zone--active');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('drop-zone--active');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drop-zone--active');
      if (e.dataTransfer.files.length > 0) {
        onUpload(e.dataTransfer.files);
      }
    },
    [onUpload]
  );

  const handleInputChange = useCallback(
    (e) => {
      if (e.target.files.length > 0) {
        onUpload(e.target.files);
        e.target.value = '';
      }
    },
    [onUpload]
  );

  return (
    <div className="panel panel-files" id="files-panel">
      <div className="panel-header">
        <h2>{t(lang, 'uploadedFiles')}</h2>
        {files.length > 0 && (
          <div className="panel-header-actions">
            <span className="panel-count">
              {files.length}/{MAX_FILES} · {totalMB}/{maxMB} MB
            </span>
            <button
              className="remove-all-btn"
              onClick={onRemoveAllFiles}
              id="remove-all-files"
            >
              {t(lang, 'removeAll')}
            </button>
          </div>
        )}
      </div>

      <div
        className="drop-zone"
        id="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="drop-icon" viewBox="0 0 24 24" width="28" height="28">
          <path
            d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-5-6v4h-2v-4H8l4-4 4 4h-3z"
            fill="currentColor"
          />
        </svg>
        <span className="drop-text">{t(lang, 'dropHint')}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
          id="file-input"
        />
      </div>

      {/* Rejections */}
      {rejections.length > 0 && (
        <div className="rejections" id="rejections-list">
          {rejections.map((r) => (
            <div key={r.id} className="rejection-row">
              <span className="rejection-name">{r.name}</span>
              <span className="rejection-reason">{t(lang, r.reason)}</span>
              <button
                className="rejection-dismiss"
                onClick={() => onDismissRejection(r.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <p className="panel-empty">{t(lang, 'noFiles')}</p>
      ) : (
        <div className="file-list" id="file-list">
          {files.map((f) => (
            <FileRow
              key={f.id}
              lang={lang}
              file={f}
              isDuplicate={duplicateFileIds.has(f.id)}
              isMatched={matchedFileIds.has(f.id)}
              matchedReqTitle={reverseMatches[f.id] || null}
              onRemove={onRemoveFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
