import { t } from '../i18n/translations';
import RequirementRow from './RequirementRow';

export default function RequirementsList({
  lang,
  tender,
  requirements,
  statuses,
  files,
  matches,
  expiries,
  duplicateFileIds,
  duplicateGroups,
  onMatch,
  onUnmatch,
  onSetExpiry,
}) {
  if (!tender) {
    return (
      <div className="panel panel-requirements" id="requirements-panel">
        <div className="panel-header">
          <h2>{t(lang, 'requirements')}</h2>
        </div>
        <p className="panel-empty">{t(lang, 'noRequirements')}</p>
      </div>
    );
  }

  // Build status map by id
  const statusMap = {};
  for (const s of statuses) statusMap[s.id] = s;

  return (
    <div className="panel panel-requirements" id="requirements-panel">
      <div className="panel-header">
        <h2>{t(lang, 'requirements')}</h2>
        <span className="panel-count">{requirements.length}</span>
      </div>

      <div className="tender-info" id="tender-info">
        <div className="tender-info-row">
          <span className="tender-info-label">{t(lang, 'tenderTitle')}:</span>
          <span className="tender-info-value">{tender.title}</span>
        </div>
        <div className="tender-info-row">
          <span className="tender-info-label">{t(lang, 'procuringEntity')}:</span>
          <span className="tender-info-value">{tender.procuring_entity}</span>
        </div>
        <div className="tender-info-row">
          <span className="tender-info-label">{t(lang, 'bidder')}:</span>
          <span className="tender-info-value">{tender.bidder}</span>
        </div>
        <div className="tender-info-row">
          <span className="tender-info-label">{t(lang, 'submissionDeadline')}:</span>
          <span className="tender-info-value">{tender.submission_deadline}</span>
        </div>
      </div>

      <div className="req-list" id="req-list">
        {requirements.map((req) => (
          <RequirementRow
            key={req.id}
            lang={lang}
            req={req}
            status={statusMap[req.id] || { status: 'missing', blocking: true }}
            files={files}
            matches={matches}
            expiries={expiries}
            duplicateFileIds={duplicateFileIds}
            duplicateGroups={duplicateGroups}
            onMatch={onMatch}
            onUnmatch={onUnmatch}
            onSetExpiry={onSetExpiry}
          />
        ))}
      </div>
    </div>
  );
}
