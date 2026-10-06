import { t } from '../i18n/translations';

/**
 * Export the checklist as a CSV file with BOM for Excel compatibility.
 */
export function exportChecklist(requirements, matches, expiries, statuses, files, lang) {
  const statusMap = {};
  for (const s of statuses) statusMap[s.id] = s;
  const fileMap = {};
  for (const f of files) fileMap[f.id] = f;

  const headers = [
    'Order',
    lang === 'bn' ? 'নথি' : 'Document',
    lang === 'bn' ? 'আবশ্যিক' : 'Mandatory',
    lang === 'bn' ? 'ফাইলের নাম' : 'File Name',
    lang === 'bn' ? 'পৃষ্ঠা' : 'Pages',
    lang === 'bn' ? 'মেয়াদের তারিখ' : 'Expiry Date',
    lang === 'bn' ? 'অবস্থা' : 'Status',
  ];

  const rows = requirements.map((req) => {
    const st = statusMap[req.id];
    const fileId = matches[req.id];
    const file = fileId ? fileMap[fileId] : null;
    const title = lang === 'bn' ? req.title_bn : req.title_en;
    const statusLabel = st ? t(lang, `status_${st.status}`) : '';

    return [
      req.order,
      title,
      req.mandatory ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes') : (lang === 'bn' ? 'না' : 'No'),
      file ? file.name : '',
      file ? file.pageCount : '',
      expiries[req.id] || '',
      statusLabel,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\r\n');

  // UTF-8 BOM so Excel reads Bangla correctly
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'checklist.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
