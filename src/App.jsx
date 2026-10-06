import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Header from './components/Header';
import RequirementsList from './components/RequirementsList';
import FilePanel from './components/FilePanel';
import GenerateBar from './components/GenerateBar';
import SealPanel from './components/SealPanel';
import AutoMatchDialog from './components/AutoMatchDialog';
import ApiKeyPanel from './components/ApiKeyPanel';
import RestoreDialog from './components/RestoreDialog';
import { computeStatuses, getBlockingReasons } from './utils/statusEngine';
import { findDuplicateGroups, getDuplicateFileIds } from './utils/duplicateDetector';
import { hashBuffer } from './utils/duplicateDetector';
import { validateAndCountPages, readFileAsArrayBuffer, MAX_FILES, MAX_TOTAL_BYTES } from './utils/pdfUtils';
import { buildPackage, downloadPdf } from './utils/packageBuilder';
import { computeAutoMatchSuggestions } from './utils/autoMatcher';
import { aiMatch } from './utils/aiMatcher';
import { exportChecklist } from './utils/checklistExporter';
import {
  autoSave,
  loadAutoSave,
  clearAutoSave,
  downloadProject,
  deserializeProject,
} from './utils/projectPersistence';
import './App.css';

let fileCounter = 0;

export default function App() {
  // === Core state ===
  const [lang, setLang] = useState('en');
  const [tender, setTender] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState([]);
  const [matches, setMatches] = useState({});
  const [expiries, setExpiries] = useState({});

  // === UI state ===
  const [rejections, setRejections] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const packageRef = useRef(null);
  const [packageReady, setPackageReady] = useState(false);

  // === Seal state ===
  const [sealImage, setSealImage] = useState(null);
  const [sealPlacements, setSealPlacements] = useState([]);

  // === Auto/AI match state ===
  const [showAutoMatch, setShowAutoMatch] = useState(false);
  const [autoMatchSuggestions, setAutoMatchSuggestions] = useState([]);
  const [isAISuggestion, setIsAISuggestion] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // === API key state ===
  const [apiKey, setApiKey] = useState('');
  const [showApiPanel, setShowApiPanel] = useState(false);

  // === Persistence state ===
  const [autoSaveData, setAutoSaveData] = useState(null);
  const [showRestore, setShowRestore] = useState(false);

  // === Check for autosave on mount ===
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && saved.tender) {
      setAutoSaveData(saved);
      setShowRestore(true);
    }
  }, []);

  // === Autosave on state changes (debounced) ===
  const autosaveTimer = useRef(null);
  useEffect(() => {
    if (!tender) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autoSave({ lang, tender, requirements, matches, expiries, files, sealPlacements });
    }, 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [lang, tender, requirements, matches, expiries, files, sealPlacements]);

  // === Derived state ===
  const duplicateGroups = useMemo(() => findDuplicateGroups(files), [files]);
  const duplicateFileIds = useMemo(
    () => getDuplicateFileIds(duplicateGroups),
    [duplicateGroups]
  );

  const statuses = useMemo(
    () =>
      requirements.length > 0
        ? computeStatuses(requirements, matches, expiries, tender?.submission_deadline)
        : [],
    [requirements, matches, expiries, tender]
  );

  const hasBlockers = useMemo(
    () => statuses.some((s) => s.blocking),
    [statuses]
  );

  const blockingReasons = useMemo(
    () => getBlockingReasons(requirements, statuses, lang),
    [requirements, statuses, lang]
  );

  // === Handlers ===

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'en' ? 'bn' : 'en'));
  }, []);

  const handleLoadRequirements = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.tender || !Array.isArray(data.requirements)) {
          throw new Error('Invalid format');
        }
        const sorted = [...data.requirements].sort((a, b) => a.order - b.order);
        setTender(data.tender);
        setRequirements(sorted);
        setMatches({});
        setExpiries({});
        setRejections([]);
        setPackageReady(false);
        setGenerateError(null);
        packageRef.current = null;
        setLoadError(null);
        setSealPlacements([]);
        clearAutoSave();
      } catch (err) {
        setLoadError(err.message);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(
    async (fileList) => {
      const incoming = Array.from(fileList);

      // F1: Check file count limit
      if (files.length + incoming.length > MAX_FILES) {
        setRejections((prev) => [
          ...prev,
          { id: `batch_${Date.now()}`, name: `${incoming.length} files`, reason: 'rejectTooManyFiles' },
        ]);
        return;
      }

      // F1: Check total size limit (using File.size before reading)
      const currentBytes = files.reduce((s, f) => s + (f.arrayBuffer?.byteLength || 0), 0);
      let batchBytes = 0;
      for (const f of incoming) batchBytes += f.size;
      if (currentBytes + batchBytes > MAX_TOTAL_BYTES) {
        setRejections((prev) => [
          ...prev,
          { id: `batch_${Date.now()}`, name: `${incoming.length} files`, reason: 'rejectTotalSize' },
        ]);
        return;
      }

      const newFiles = [];
      const newRejections = [];

      for (const rawFile of incoming) {
        const id = `f_${++fileCounter}`;

        try {
          const buffer = await readFileAsArrayBuffer(rawFile);
          const { valid, pageCount, error } = await validateAndCountPages(buffer);

          if (!valid) {
            const reasonMap = {
              empty: 'rejectEmpty',
              not_pdf: 'rejectNotPdf',
              corrupt: 'rejectCorrupt',
              password_protected: 'rejectPasswordProtected',
              no_pages: 'rejectNoPages',
            };
            newRejections.push({ id, name: rawFile.name, reason: reasonMap[error] || 'rejectCorrupt' });
            continue;
          }

          const hash = await hashBuffer(buffer);
          newFiles.push({ id, name: rawFile.name, arrayBuffer: buffer, pageCount, hash });
        } catch (err) {
          newRejections.push({ id, name: rawFile.name, reason: 'rejectCorrupt' });
        }
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setPackageReady(false);
      }
      if (newRejections.length > 0) {
        setRejections((prev) => [...prev, ...newRejections]);
      }
    },
    [files]
  );

  const handleRemoveFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setMatches((prev) => {
      const next = { ...prev };
      for (const [reqId, fId] of Object.entries(next)) {
        if (fId === fileId) delete next[reqId];
      }
      return next;
    });
    setPackageReady(false);
  }, []);

  const handleRemoveAllFiles = useCallback(() => {
    setFiles([]);
    setMatches({});
    setExpiries({});
    setRejections([]);
    setPackageReady(false);
    setSealPlacements([]);
  }, []);

  const handleMatch = useCallback((reqId, fileId) => {
    setMatches((prev) => {
      const next = { ...prev };
      for (const [rId, fId] of Object.entries(next)) {
        if (fId === fileId && rId !== reqId) delete next[rId];
      }
      next[reqId] = fileId;
      return next;
    });
    setPackageReady(false);
  }, []);

  const handleUnmatch = useCallback((reqId) => {
    setMatches((prev) => {
      const next = { ...prev };
      delete next[reqId];
      return next;
    });
    setExpiries((prev) => {
      const next = { ...prev };
      delete next[reqId];
      return next;
    });
    setPackageReady(false);
  }, []);

  const handleSetExpiry = useCallback((reqId, date) => {
    setExpiries((prev) => ({ ...prev, [reqId]: date }));
    setPackageReady(false);
  }, []);

  const handleDismissRejection = useCallback((id) => {
    setRejections((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // === Generate + Download ===

  const handleGenerate = useCallback(async () => {
    if (hasBlockers || !tender) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const pdfBytes = await buildPackage(tender, requirements, matches, files, {
        sealImage,
        sealPlacements,
        expiries,
      });
      packageRef.current = pdfBytes;
      setPackageReady(true);
    } catch (err) {
      console.error('Package generation failed:', err);
      setGenerateError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [hasBlockers, tender, requirements, matches, files, sealImage, sealPlacements, expiries]);

  const handleDownload = useCallback(() => {
    if (!packageRef.current || !tender) return;
    downloadPdf(packageRef.current, `${tender.tender_id}_Package.pdf`);
  }, [tender]);

  // === Auto-Match ===

  const handleAutoMatch = useCallback(() => {
    const suggestions = computeAutoMatchSuggestions(files, requirements, matches, duplicateFileIds);
    setAutoMatchSuggestions(suggestions);
    setIsAISuggestion(false);
    setShowAutoMatch(true);
  }, [files, requirements, matches, duplicateFileIds]);

  // === AI Match ===

  const handleAiMatch = useCallback(async () => {
    if (!apiKey || !tender) return;
    setAiLoading(true);
    try {
      const matchedFileIds = new Set(Object.values(matches));
      const matchedReqIds = new Set(Object.keys(matches));
      const unmatchedReqs = requirements.filter((r) => !matchedReqIds.has(r.id));
      const unmatchedFiles = files.filter((f) => !matchedFileIds.has(f.id));

      if (unmatchedReqs.length === 0 || unmatchedFiles.length === 0) {
        setAutoMatchSuggestions([]);
        setIsAISuggestion(true);
        setShowAutoMatch(true);
        return;
      }

      const result = await aiMatch(apiKey, unmatchedReqs, unmatchedFiles, tender);
      const suggestions = result
        .filter((m) => m.reqId && m.fileId)
        .map((m) => {
          const req = requirements.find((r) => r.id === m.reqId);
          const file = files.find((f) => f.id === m.fileId);
          return {
            reqId: m.reqId,
            fileId: m.fileId,
            fileName: file?.name || m.fileId,
            reqTitle: req?.title_en || m.reqId,
            confidence: m.confidence,
            reason: m.reason,
            score: (m.confidence || 0) * 100,
          };
        });
      setAutoMatchSuggestions(suggestions);
      setIsAISuggestion(true);
      setShowAutoMatch(true);
    } catch (err) {
      setAutoMatchSuggestions([]);
      setIsAISuggestion(true);
      setShowAutoMatch(true);
      console.error('AI match failed:', err);
    } finally {
      setAiLoading(false);
    }
  }, [apiKey, tender, requirements, files, matches]);

  const handleAcceptSuggestion = useCallback(
    (reqId, fileId) => {
      handleMatch(reqId, fileId);
      setAutoMatchSuggestions((prev) =>
        prev.filter((s) => s.reqId !== reqId && s.fileId !== fileId)
      );
    },
    [handleMatch]
  );

  const handleAcceptAllSuggestions = useCallback(() => {
    for (const s of autoMatchSuggestions) {
      handleMatch(s.reqId, s.fileId);
    }
    setAutoMatchSuggestions([]);
    setShowAutoMatch(false);
  }, [autoMatchSuggestions, handleMatch]);

  const handleRejectSuggestion = useCallback((index) => {
    setAutoMatchSuggestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // === CSV Export ===

  const handleExportChecklist = useCallback(() => {
    if (!tender) return;
    exportChecklist(requirements, matches, expiries, statuses, files, lang);
  }, [tender, requirements, matches, expiries, statuses, files, lang]);

  // === Seal handlers ===

  const handleUploadSeal = useCallback((seal) => {
    setSealImage(seal);
    setPackageReady(false);
  }, []);

  const handleRemoveSeal = useCallback(() => {
    setSealImage(null);
    setSealPlacements([]);
    setPackageReady(false);
  }, []);

  const handleTogglePlacement = useCallback((reqId) => {
    setSealPlacements((prev) => {
      const exists = prev.find((p) => p.reqId === reqId);
      if (exists) return prev.filter((p) => p.reqId !== reqId);
      return [...prev, { reqId, position: 'bottom-right' }];
    });
    setPackageReady(false);
  }, []);

  const handleSetPosition = useCallback((reqId, position) => {
    setSealPlacements((prev) =>
      prev.map((p) => (p.reqId === reqId ? { ...p, position } : p))
    );
    setPackageReady(false);
  }, []);

  // === Project persistence ===

  const handleSaveProject = useCallback(() => {
    if (!tender) return;
    downloadProject(
      { lang, tender, requirements, matches, expiries, files, sealImage, sealPlacements },
      tender.tender_id
    );
  }, [lang, tender, requirements, matches, expiries, files, sealImage, sealPlacements]);

  const handleOpenProject = useCallback(async (file) => {
    try {
      const text = await file.text();
      const state = deserializeProject(text);
      setLang(state.lang);
      setTender(state.tender);
      setRequirements(state.requirements);
      setMatches(state.matches);
      setExpiries(state.expiries);
      setFiles(state.files);
      setSealImage(state.sealImage);
      setSealPlacements(state.sealPlacements);
      setRejections([]);
      setPackageReady(false);
      setLoadError(null);
      setGenerateError(null);
      packageRef.current = null;
      // Bump file counter
      const maxId = Math.max(0, ...state.files.map((f) => parseInt(f.id.replace('f_', ''), 10) || 0));
      fileCounter = Math.max(fileCounter, maxId);
    } catch (err) {
      setLoadError('Failed to open project: ' + err.message);
    }
  }, []);

  const handleRestore = useCallback(() => {
    if (!autoSaveData) return;
    setTender(autoSaveData.tender);
    setRequirements(autoSaveData.requirements || []);
    setMatches({}); // Matches need files — will reconnect after re-upload
    setExpiries(autoSaveData.expiries || {});
    setLang(autoSaveData.lang || 'en');
    setSealPlacements(autoSaveData.sealPlacements || []);
    setShowRestore(false);
  }, [autoSaveData]);

  const handleDiscardRestore = useCallback(() => {
    clearAutoSave();
    setShowRestore(false);
    setAutoSaveData(null);
  }, []);

  return (
    <div className="app" id="app">
      <Header
        tender={tender}
        lang={lang}
        onToggleLang={toggleLang}
        onLoadRequirements={handleLoadRequirements}
        onSaveProject={handleSaveProject}
        onOpenProject={handleOpenProject}
        onAutoMatch={handleAutoMatch}
        onAiMatch={handleAiMatch}
        onShowApiPanel={() => setShowApiPanel(true)}
        apiKey={apiKey}
      />

      {loadError && (
        <div className="load-error" id="load-error">{loadError}</div>
      )}

      <main className="main-content" id="main-content">
        <RequirementsList
          lang={lang}
          tender={tender}
          requirements={requirements}
          statuses={statuses}
          files={files}
          matches={matches}
          expiries={expiries}
          duplicateFileIds={duplicateFileIds}
          duplicateGroups={duplicateGroups}
          onMatch={handleMatch}
          onUnmatch={handleUnmatch}
          onSetExpiry={handleSetExpiry}
        />
        <div className="right-panels">
          <FilePanel
            lang={lang}
            files={files}
            rejections={rejections}
            duplicateFileIds={duplicateFileIds}
            matches={matches}
            requirements={requirements}
            onUpload={handleUpload}
            onRemoveFile={handleRemoveFile}
            onRemoveAllFiles={handleRemoveAllFiles}
            onDismissRejection={handleDismissRejection}
          />
          <SealPanel
            lang={lang}
            sealImage={sealImage}
            sealPlacements={sealPlacements}
            requirements={requirements}
            matches={matches}
            onUploadSeal={handleUploadSeal}
            onRemoveSeal={handleRemoveSeal}
            onTogglePlacement={handleTogglePlacement}
            onSetPosition={handleSetPosition}
          />
        </div>
      </main>

      <GenerateBar
        lang={lang}
        tender={tender}
        hasBlockers={hasBlockers}
        blockingReasons={blockingReasons}
        isGenerating={isGenerating}
        packageReady={packageReady}
        generateError={generateError}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        onExportChecklist={handleExportChecklist}
      />

      {/* Dialogs */}
      {showAutoMatch && (
        <AutoMatchDialog
          lang={lang}
          suggestions={autoMatchSuggestions}
          isAI={isAISuggestion}
          onAccept={handleAcceptSuggestion}
          onAcceptAll={handleAcceptAllSuggestions}
          onReject={handleRejectSuggestion}
          onClose={() => setShowAutoMatch(false)}
        />
      )}

      {showApiPanel && (
        <ApiKeyPanel
          lang={lang}
          apiKey={apiKey}
          onSetApiKey={setApiKey}
          onClose={() => setShowApiPanel(false)}
        />
      )}

      {showRestore && autoSaveData && (
        <RestoreDialog
          lang={lang}
          autoSaveData={autoSaveData}
          onRestore={handleRestore}
          onDiscard={handleDiscardRestore}
        />
      )}

      {aiLoading && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-spinner" />
          <span>{lang === 'bn' ? 'এআই জিজ্ঞাসা করা হচ্ছে…' : 'Asking AI…'}</span>
        </div>
      )}
    </div>
  );
}
