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
