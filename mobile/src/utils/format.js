export function relativeTime(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)  return "à l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)   return `Il y a ${h} h`;
  return `Il y a ${Math.round(h / 24)} j`;
}

// Échantillonne ~count labels répartis uniformément depuis les labels réels des mesures.
export function sampleTicks(labels, count = 4) {
  if (!labels || labels.length === 0) return [];
  if (labels.length <= count) return labels;
  const step = (labels.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => labels[Math.round(i * step)]);
}

// Arrondit à un pas « lisible » (1, 2, 5, 10, 20, …) ≥ x.
function niceNum(x) {
  if (!isFinite(x) || x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const f   = x / Math.pow(10, exp);
  const nf  = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nf * Math.pow(10, exp);
}

/**
 * Échelle Y adaptative : zoome sur la plage réelle des données (+ marge) pour que
 * les petites fluctuations soient visibles, au lieu d'une échelle fixe partant de 0.
 * @param {number[]} data
 * @param {{ clampMin?: number, clampMax?: number, ticks?: number, minSpan?: number }} opts
 *   - clampMin/clampMax : bornes physiques à ne pas dépasser (ex. humidité 0–100)
 *   - minSpan : amplitude minimale affichée (évite un zoom absurde sur une ligne ~plate)
 * @returns {{ yMin: number, yMax: number, yTicks: number[] }}
 */
export function niceScale(data, { clampMin = -Infinity, clampMax = Infinity, ticks = 4, minSpan = 2 } = {}) {
  const vals = (data || []).filter((v) => typeof v === 'number' && isFinite(v));
  if (vals.length === 0) return { yMin: 0, yMax: 1, yTicks: [0, 1] };

  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < minSpan) { const m = (lo + hi) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2; }

  const pad  = (hi - lo) * 0.15;          // ~15 % de marge haut/bas
  const step = niceNum((hi - lo + 2 * pad) / ticks);
  lo = Math.max(clampMin, Math.floor((lo - pad) / step) * step);
  hi = Math.min(clampMax, Math.ceil((hi + pad) / step) * step);

  const yTicks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    yTicks.push(Math.round(v * 100) / 100);
  }
  return { yMin: lo, yMax: hi, yTicks };
}
