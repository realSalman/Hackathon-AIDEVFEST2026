export default function StatusBadge({ status, lang }) {
  const labels = {
    en: {
      missing: 'Missing',
      expired: 'Expired',
      expiry_needed: 'Expiry Needed',
      not_provided: 'Not Provided',
      ok: 'OK',
    },
    bn: {
      missing: 'অনুপস্থিত',
      expired: 'মেয়াদোত্তীর্ণ',
      expiry_needed: 'মেয়াদ প্রয়োজন',
      not_provided: 'দেওয়া হয়নি',
      ok: 'ঠিক আছে',
    },
  };

  const label = labels[lang]?.[status] ?? labels.en[status] ?? status;
  const cls = `status-badge status-${status}`;

  return <span className={cls}>{label}</span>;
}
