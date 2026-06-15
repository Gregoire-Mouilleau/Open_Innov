import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { STATUS_COLOR, verdictLabel } from '../../../utils/culture';
import { st } from '../styles';

export default function ParcellesPage({ parcelleStatus = [] }) {
  const METRICS = [
    { key: 'soil',   icon: '💧',  label: 'Humidité sol', unit: '%'  },
    { key: 'temp',   icon: '🌡️', label: 'Température',   unit: '°C' },
    { key: 'humAir', icon: '💨',  label: 'Humidité air', unit: '%'  },
  ];
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Parcelles</Text>
        <Text style={st.pageSub}>{parcelleStatus.length} parcelle{parcelleStatus.length !== 1 ? 's' : ''} · statut adapté à chaque culture</Text>
      </View>
      {parcelleStatus.length === 0 ? (
        <View style={st.emptyState}><Text style={st.emptyTxt}>Aucune parcelle</Text></View>
      ) : (
        <View style={st.farmGrid}>
          {parcelleStatus.map(p => (
            <View key={p.id} style={[st.farmGridCard, { borderLeftWidth: 3, borderLeftColor: p.overall === 'warn' ? '#f39c12' : p.overall === 'ok' ? '#2ecc71' : COLORS.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 26 }}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>{p.nom}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>{p.culture}</Text>
                </View>
                {p.score != null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: p.score >= 75 ? '#2ecc71' : p.score >= 50 ? '#f39c12' : '#e74c3c', fontSize: 18, fontWeight: '800' }}>{p.score}%</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 9 }}>santé</Text>
                  </View>
                )}
              </View>
              {METRICS.map(m => {
                const mm = p.metrics[m.key];
                const col = STATUS_COLOR[mm.status];
                return (
                  <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                    <Text style={{ fontSize: 13, width: 22 }}>{m.icon}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, flex: 1 }}>{m.label}</Text>
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', width: 56, textAlign: 'right' }}>{mm.value != null ? mm.value + m.unit : '—'}</Text>
                    {mm.min != null && <Text style={{ color: COLORS.textSecondary, fontSize: 10, width: 74, textAlign: 'right' }}>cible {mm.min}-{mm.max}</Text>}
                    <View style={{ width: 100, alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: col + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
                        <Text style={{ color: col, fontSize: 10, fontWeight: '700' }}>{verdictLabel(m.key, mm.status)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              {(p.besoinEau || p.besoinSoleil) && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  {p.besoinEau    && <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>💧 Eau : <Text style={{ color: COLORS.text }}>{p.besoinEau}</Text></Text>}
                  {p.besoinSoleil && <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>☀️ Soleil : <Text style={{ color: COLORS.text }}>{p.besoinSoleil}</Text></Text>}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
