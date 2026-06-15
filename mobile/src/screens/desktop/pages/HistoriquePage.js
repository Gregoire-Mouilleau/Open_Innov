import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { st } from '../styles';

const PAGE_SIZE = 12;

export default function HistoriquePge({ alertesList }) {
  const [page, setPage] = React.useState(0);

  // Uniquement les alertes réelles (MongoDB), triées de la plus récente à la plus ancienne.
  const allEvents = alertesList.map(a => ({
    id: 'api-' + a.id, heure: a.sub, type: 'alerte', label: a.title, detail: '', color: a.color,
  }));

  const totalPages = Math.max(1, Math.ceil(allEvents.length / PAGE_SIZE));
  const current    = Math.min(page, totalPages - 1);
  const pageEvents = allEvents.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Historique</Text>
        <Text style={st.pageSub}>{allEvents.length} événement{allEvents.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={st.tableCard}>
        {pageEvents.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Aucun événement</Text>
          </View>
        ) : pageEvents.map((e, i) => (
          <View key={e.id} style={[st.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
            <Text style={[st.histTime, { color: COLORS.textSecondary }]}>{e.heure}</Text>
            <View style={[st.histDot, { backgroundColor: e.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>{e.label}</Text>
              {e.detail ? <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>{e.detail}</Text> : null}
            </View>
            <View style={{ backgroundColor: e.color + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
              <Text style={{ color: e.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{e.type}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16, marginBottom: 8 }}>
          <TouchableOpacity
            style={[st.pageBtn, current === 0 && { opacity: 0.4 }]}
            onPress={() => setPage(p => Math.max(0, p - 1))}
            disabled={current === 0}
          >
            <Text style={st.pageBtnTxt}>‹ Précédent</Text>
          </TouchableOpacity>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>Page {current + 1} / {totalPages}</Text>
          <TouchableOpacity
            style={[st.pageBtn, current >= totalPages - 1 && { opacity: 0.4 }]}
            onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={current >= totalPages - 1}
          >
            <Text style={st.pageBtnTxt}>Suivant ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
