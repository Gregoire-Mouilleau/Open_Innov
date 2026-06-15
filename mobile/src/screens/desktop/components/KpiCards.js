import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { st } from '../styles';

export default function KpiCards({ farmsList, alertesList, nbCapteurs = 0, cropHealth = null }) {
  const nbFermes   = farmsList?.length   ?? 0;
  const nbAlertes  = alertesList?.length ?? 0;
  // Toutes les cartes sont alimentées par la BDD (santé = score dérivé des mesures).
  const CARDS = [
    {
      key:     'farms',
      icon:    '⌂',
      iconBg:  '#1a3a1a',
      iconC:   COLORS.accent,
      value:   String(nbFermes),
      label:   'Fermes actives',
    },
    {
      key:     'sensors',
      icon:    '🌿',
      iconBg:  '#1a2a3a',
      iconC:   '#3498db',
      value:   String(nbCapteurs),
      label:   'Capteurs',
    },
    {
      key:     'alertes',
      icon:    '⚠',
      iconBg:  '#3a2200',
      iconC:   '#f39c12',
      value:   String(nbAlertes),
      label:   'Alertes actives',
    },
    {
      key:     'health',
      icon:    '🌱',
      iconBg:  '#1a3a1a',
      iconC:   COLORS.accent,
      value:   cropHealth != null ? `${cropHealth}%` : '—',
      label:   'Santé des cultures',
    },
  ];
  return (
    <View style={st.kpiRow}>
      {CARDS.map(c => (
        <View key={c.key} style={st.kpiCard}>
          <View style={[st.kpiIconWrap, { backgroundColor: c.iconBg }]}>
            <Text style={[st.kpiIcon, { color: c.iconC }]}>{c.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.kpiValue}>{c.value}</Text>
            <Text style={st.kpiLabel}>{c.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
