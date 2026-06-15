import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function SvgLineChart({ data, color, yMin, yMax, yTicks, xTicks, unit, dataLabels }) {
  const [dims, setDims]      = React.useState({ w: 320, h: 130 });
  const [hoverIdx, setHover] = React.useState(null);
  const roRef = React.useRef(null);
  const ce = React.createElement;

  // Mesure fiable de la taille RÉELLE rendue (web) via ResizeObserver, pour
  // dessiner le SVG en pixels exacts (aucune déformation horizontale du tracé/typo).
  const setWrap = React.useCallback((el) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.clientWidth || el.offsetWidth;
      const h = el.clientHeight || el.offsetHeight;
      if (w > 10 && h > 10) setDims({ w: Math.floor(w), h: Math.floor(h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // Pas de mesures sur la période → on n'invente rien, on affiche un état vide.
  if (!data || data.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 110 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Aucune donnée</Text>
      </View>
    );
  }

  const W = dims.w, H = dims.h;
  const pL = 34, pR = 12, pT = 10, pB = 22;
  const iW = W - pL - pR, iH = H - pT - pB;
  const n  = data.length;
  const toX = (i) => pL + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
  const toY = (v) => pT + (1 - (v - yMin) / ((yMax - yMin) || 1)) * iH;

  const pts        = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const base       = (pT + iH).toFixed(1);
  const areaPoints = `${pL.toFixed(1)},${base} ${pts} ${toX(n - 1).toFixed(1)},${base}`;
  const step       = Math.max(1, Math.floor(n / 8));

  const hx = hoverIdx !== null ? toX(hoverIdx) : null;
  const hy = hoverIdx !== null ? toY(data[hoverIdx]) : null;
  const hv = hoverIdx !== null ? data[hoverIdx] : null;
  const ht = hoverIdx !== null && dataLabels ? dataLabels[hoverIdx] : null;
  const ttW = 58, ttH = ht ? 36 : 22;
  const ttX = hx !== null ? Math.min(Math.max(hx - ttW / 2, pL), W - pR - ttW) : 0;
  const ttY = hy !== null ? Math.max(hy - ttH - 6, pT) : 0;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Le SVG est rendu à W px (1:1) → conversion directe.
    const mx   = e.clientX - rect.left;
    const rawI = (mx - pL) / iW * (n - 1);
    setHover(Math.max(0, Math.min(n - 1, Math.round(rawI))));
  };

  return (
    <View
      ref={setWrap}
      style={{ flex: 1, width: '100%', alignSelf: 'stretch' }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 10 && height > 10) setDims({ w: Math.floor(width), h: Math.floor(height) });
      }}
    >
      {ce('svg', {
        width: W, height: H,
        style: { display: 'block', cursor: 'crosshair' },
        onMouseMove: handleMouseMove,
        onMouseLeave: () => setHover(null),
        xmlns: 'http://www.w3.org/2000/svg',
      },
        // Grille horizontale
        ...yTicks.map((y, k) => ce('line', { key: `g${k}`, x1: pL, y1: toY(y), x2: W - pR, y2: toY(y), stroke: '#ffffff12', strokeWidth: 1 })),
        // Zone remplie
        ce('polygon', { points: areaPoints, fill: color + '26', stroke: 'none' }),
        // Ligne principale
        ce('polyline', { points: pts, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        // Points visibles
        ...data.map((v, i) => (i % step === 0 || i === n - 1)
          ? ce('circle', { key: `d${i}`, cx: toX(i), cy: toY(v), r: 3.5, fill: color, stroke: '#0d1520', strokeWidth: 1.5 })
          : null
        ).filter(Boolean),
        // Labels Y
        ...yTicks.map((y, k) => ce('text', { key: `yl${k}`, x: pL - 5, y: toY(y) + 4, textAnchor: 'end', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, String(y))),
        // Labels X
        ...xTicks.map((lbl, k) => ce('text', { key: `xl${k}`, x: (pL + (k / (xTicks.length - 1)) * iW).toFixed(1), y: H - 4, textAnchor: 'middle', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, lbl)),
        // Hover : ligne verticale + point mis en valeur + tooltip
        ...(hoverIdx !== null ? [
          ce('line',   { key: 'hl', x1: hx, y1: pT, x2: hx, y2: pT + iH, stroke: '#ffffff40', strokeWidth: 1, strokeDasharray: '4 3' }),
          ce('circle', { key: 'hc', cx: hx, cy: hy, r: 5.5, fill: color, stroke: '#fff', strokeWidth: 2 }),
          ce('rect',   { key: 'tr', x: ttX, y: ttY, width: ttW, height: ttH, rx: 4, fill: '#1a2535', stroke: color, strokeWidth: 1 }),
          ce('text',   { key: 'tv', x: ttX + ttW / 2, y: ttY + (ht ? 14 : 15), textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#fff', fontFamily: 'sans-serif' }, `${hv}${unit || ''}`),
          ...(ht ? [ce('text', { key: 'tt', x: ttX + ttW / 2, y: ttY + 28, textAnchor: 'middle', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, ht)] : []),
        ] : []),
      )}
    </View>
  );
}
