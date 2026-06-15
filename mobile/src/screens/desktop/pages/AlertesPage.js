import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { CAPTEUR_LABEL } from '../../../constants/dashboard';
import { st } from '../styles';

export default function AlertesPge({ alertesList = [], onSelectAlert }) {
  const [filter, setFilter] = React.useState('all');

  const filtered =
    filter === 'all'      ? alertesList :
    filter === 'critical' ? alertesList.filter(a => a.severite === 'critical') :
                            alertesList.filter(a => a.severite === 'warning');

  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Alertes</Text>
        <Text style={st.pageSub}>
          {alertesList.length} alerte{alertesList.length !== 1 ? 's' : ''} active{alertesList.length !== 1 ? 's' : ''} · cliquez une ligne pour le détail
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[['all','Toutes'], ['critical','Critiques'], ['warning','Moyennes']].map(([k, lbl]) => (
          <TouchableOpacity key={k} style={[st.filterChip, filter === k && st.filterChipActive]} onPress={() => setFilter(k)}>
            <Text style={[st.filterChipTxt, filter === k && st.filterChipTxtActive]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={st.tableCard}>
        <View style={st.tableHeader}>
          <Text style={[st.tableHd, { width: 90 }]}>Sévérité</Text>
          <Text style={[st.tableHd, { flex: 1.4 }]}>Type</Text>
          <Text style={[st.tableHd, { flex: 1.3 }]}>Parcelle</Text>
          <Text style={[st.tableHd, { flex: 1.3 }]}>Capteur</Text>
          <Text style={[st.tableHd, { flex: 2 }]}>Message</Text>
          <Text style={[st.tableHd, { width: 86 }]}>Statut</Text>
          <Text style={[st.tableHd, { width: 112 }]}>Date</Text>
        </View>
        {filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Aucune alerte dans cette catégorie</Text>
          </View>
        ) : filtered.map((a, i) => (
          <TouchableOpacity
            key={a.id}
            style={[st.tableRow, { borderLeftWidth: 3, borderLeftColor: a.color }, i % 2 === 1 && { backgroundColor: '#0a1421' }]}
            onPress={() => onSelectAlert?.(a)}
            activeOpacity={0.7}
          >
            <View style={{ width: 90, justifyContent: 'center' }}>
              <View style={{ backgroundColor: a.color + '22', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' }}>
                <Text style={{ color: a.color, fontSize: 10, fontWeight: '700' }}>{(a.severiteLabel || '').toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[st.tableTd, { flex: 1.4, color: COLORS.text, fontWeight: '600' }]}>{a.icon} {a.typeLabel}</Text>
            <Text style={[st.tableTd, { flex: 1.3 }]}>{a.parcelle}</Text>
            <Text style={[st.tableTd, { flex: 1.3 }]}>{a.capteurType ? (CAPTEUR_LABEL[a.capteurType] ?? a.capteurType) : '—'}</Text>
            <Text style={[st.tableTd, { flex: 2 }]} numberOfLines={1}>{a.message}</Text>
            <View style={{ width: 86, justifyContent: 'center' }}>
              <View style={{ backgroundColor: a.lu ? '#1a2a3a' : '#3a2200', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' }}>
                <Text style={{ color: a.lu ? COLORS.textSecondary : '#f39c12', fontSize: 9, fontWeight: '700' }}>{a.lu ? 'LUE' : 'NON LUE'}</Text>
              </View>
            </View>
            <Text style={[st.tableTd, { width: 112 }]}>{a.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
