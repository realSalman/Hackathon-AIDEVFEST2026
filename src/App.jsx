import { useState, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import RequirementsList from './components/RequirementsList';
import FilePanel from './components/FilePanel';
import GenerateBar from './components/GenerateBar';
import { computeStatuses, getBlockingReasons } from './utils/statusEngine';
import { findDuplicateGroups, getDuplicateFileIds } from './utils/duplicateDetector';
import { hashBuffer } from './utils/duplicateDetector';
import { validateAndCountPages, readFileAsArrayBuffer } from './utils/pdfUtils';
import { buildPackage, downloadPdf } from './utils/packageBuilder';
import './App.css';

let fileCounter = 0;

export default function App() {
  const [lang, setLang] = useState('en');
  const [tender, setTender] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState([]);
  const [matches, setMatches] = useState({});
  const [expiries, setExpiries] = useState({});
  const [rejections, setRejections] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Store the last generated package bytes + download url
  const packageRef = useRef(null);
  const [packageReady, setPackageReady] = useState(false);

  // --- Derived state ---
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

  // --- Handlers ---
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
        packageRef.current = null;
        setLoadError(null);
      } catch (err) {
        setLoadError(err.message);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(
    async (fileList) => {
      const newFiles = [];
      const newRejections = [];

      for (const rawFile of Array.from(fileList)) {
        const id = `f_${++fileCounter}`;

        try {
          const buffer = await readFileAsArrayBuffer(rawFile);
          const { valid, pageCount, error } = await validateAndCountPages(buffer);

          if (!valid) {
            const reasonKey =
              error === 'empty'
                ? 'rejectEmpty'
                : error === 'not_pdf'
                  ? 'rejectNotPdf'
                  : 'rejectCorrupt';
            newRejections.push({ id, name: rawFile.name, reason: reasonKey });
            continue;
          }

          const hash = await hashBuffer(buffer);
          newFiles.push({
            id,
            name: rawFile.name,
            arrayBuffer: buffer,
            pageCount,
            hash,
          });
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
    []
  );

  const handleRemoveFile = useCallback(
    (fileId) => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      // Clear any matches pointing to this file
      setMatches((prev) => {
        const next = { ...prev };
        for (const [reqId, fId] of Object.entries(next)) {
          if (fId === fileId) delete next[reqId];
        }
        return next;
      });
      setPackageReady(false);
    },
    []
  );

  const handleRemoveAllFiles = useCallback(() => {
    setFiles([]);
    setMatches({});
    setExpiries({});
    setRejections([]);
    setPackageReady(false);
  }, []);

  const handleMatch = useCallback((reqId, fileId) => {
    setMatches((prev) => {
      const next = { ...prev };
      // Remove any existing match from this file to another req (1 file → 1 req)
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
    // Also clear expiry for this requirement
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

  const handleGenerate = useCallback(async () => {
    if (hasBlockers || !tender) return;
    setIsGenerating(true);
    try {
      const pdfBytes = await buildPackage(tender, requirements, matches, files);
      packageRef.current = pdfBytes;
      setPackageReady(true);
    } catch (err) {
      console.error('Package generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [hasBlockers, tender, requirements, matches, files]);

  const handleDownload = useCallback(() => {
    if (!packageRef.current || !tender) return;
    const filename = `${tender.tender_id}_Package.pdf`;
    downloadPdf(packageRef.current, filename);
  }, [tender]);

  return (
    <div className="app" id="app">
      <Header
        tender={tender}
        lang={lang}
        onToggleLang={toggleLang}
        onLoadRequirements={handleLoadRequirements}
      />

      {loadError && (
        <div className="load-error" id="load-error">
          {loadError}
        </div>
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
      </main>

      <GenerateBar
        lang={lang}
        tender={tender}
        hasBlockers={hasBlockers}
        blockingReasons={blockingReasons}
        isGenerating={isGenerating}
        packageReady={packageReady}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
      />
    </div>
  );
}
