import React from 'react';
import { View } from 'react-native';

export default function SvgDonut({ value }) {
  const ce = React.createElement;
  const R = 40, CX = 57, CY = 57, SW = 12;
  const circ = 2 * Math.PI * R;
  const pct  = Math.min(Math.max(value / 100, 0), 1);
  // 3 paliers alignés sur la légende : Faible (0-30) · Moyen (30-70) · Élevé (70-100)
  const color = value <= 30 ? '#e74c3c' : value <= 70 ? '#f1c40f' : '#2ecc71';
  const lbl   = value <= 30 ? 'Faible'  : value <= 70 ? 'Moyen'   : 'Élevé';
  return (
    <View>
      {ce('svg', { width: 114, height: 114, viewBox: '0 0 114 114', xmlns: 'http://www.w3.org/2000/svg' },
        ce('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: '#1e2d3d', strokeWidth: SW }),
        ce('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: color, strokeWidth: SW, strokeDasharray: `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`, strokeLinecap: 'round', transform: `rotate(-90 ${CX} ${CY})` }),
        ce('text', { x: CX, y: CY - 3, textAnchor: 'middle', fontSize: 18, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'sans-serif' }, `${value}%`),
        ce('text', { x: CX, y: CY + 16, textAnchor: 'middle', fontSize: 11, fill: color, fontFamily: 'sans-serif' }, lbl),
      )}
    </View>
  );
}
