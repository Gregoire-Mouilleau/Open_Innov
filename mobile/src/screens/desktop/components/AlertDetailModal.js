import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { CAPTEUR_LABEL } from '../../../constants/dashboard';
import { st } from '../styles';

// Modal de détail d'une alerte (réutilisé par le tableau et le panneau de droite).
export default function AlertDetailModal({ alert, onClose }) {
  if (!alert) return null;
  const rows = [
    { label: 'Sévérité', value: alert.severiteLabel },
    { label: 'Type',     value: alert.typeLabel },
    { label: 'Ferme',    value: alert.ferme },
    { label: 'Parcelle', value: alert.parcelle },
    { label: 'Capteur',  value: alert.capteurType ? (CAPTEUR_LABEL[alert.capteurType] ?? alert.capteurType) : '—' },
    { label: 'Statut',   value: alert.lu ? 'Lue' : 'Non lue' },
    { label: 'Date',     value: alert.dateFull },
  ];
  return (
    <View style={st.modalOverlay}>
      <View style={[st.modalCard, { borderLeftWidth: 4, borderLeftColor: alert.color }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={[st.alertIco, { backgroundColor: alert.color + '33', width: 38, height: 38, borderRadius: 19, marginRight: 10 }]}>
            <Text style={{ fontSize: 18 }}>{alert.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: alert.color + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' }}>
              <Text style={{ color: alert.color, fontSize: 10, fontWeight: '700' }}>{(alert.severiteLabel || '').toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.textSecondary, fontSize: 20 }}>✕</Text></TouchableOpacity>
        </View>

        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>{alert.message}</Text>

        {rows.map(r => (
          <View key={r.label} style={{ flexDirection: 'row', paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, width: 110 }}>{r.label}</Text>
            <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{r.value}</Text>
          </View>
        ))}

        <TouchableOpacity style={[st.modalBtn, st.modalBtnOk, { marginTop: 18 }]} onPress={onClose}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
