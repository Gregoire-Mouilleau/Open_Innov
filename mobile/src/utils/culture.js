export const STATUS_COLOR = { ok: '#2ecc71', low: '#e74c3c', high: '#f39c12', na: '#7f8c8d' };

export function verdictLabel(metric, status) {
  if (status === 'ok') return 'Optimal';
  if (status === 'na') return '—';
  const map = {
    soil:   { low: "Manque d'eau", high: "Excès d'eau" },
    temp:   { low: 'Trop froid',   high: 'Trop chaud' },
    humAir: { low: 'Air trop sec', high: 'Air trop humide' },
  };
  return map[metric]?.[status] ?? (status === 'low' ? 'Insuffisant' : 'Excès');
}
