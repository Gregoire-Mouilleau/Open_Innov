import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { kits as kitsApi, mesures as mesuresApi } from '../../../services/api';
import { CAPTEUR_LABEL } from '../../../constants/dashboard';
import { relativeTime } from '../../../utils/format';
import { st } from '../styles';

export default function CapteursPge() {
  const [filter, setFilter]   = React.useState('all');
  const [rows, setRows]       = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Agrégation réelle : tous les kits de l'entreprise → leurs capteurs + dernière mesure.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { kits: allKits } = await kitsApi.list();
        const now  = new Date();
        const from = new Date(now - 24 * 60 * 60 * 1000).toISOString();

        const perKit = await Promise.all((allKits ?? []).map(async (k) => {
          const [detail, mes] = await Promise.allSettled([
            kitsApi.get(k.id),
            mesuresApi.list(k.id, { mode: 'raw', from, to: now.toISOString() }),
          ]);
          const capteurs = detail.status === 'fulfilled' ? (detail.value.capteurs ?? []) : [];
          const data     = mes.status    === 'fulfilled' ? (mes.value.data ?? [])       : [];

          // Dernière mesure par capteur
          const latest = {};
          for (const m of data) {
            if (!latest[m.capteur_id] || new Date(m.time) > new Date(latest[m.capteur_id].time)) {
              latest[m.capteur_id] = m;
            }
          }

          return capteurs.map((c) => {
            const lm = latest[c.id];
            return {
              id:       c.id,
              nom:      `${CAPTEUR_LABEL[c.type] ?? c.type} #${c.id}`,
              type:     CAPTEUR_LABEL[c.type] ?? c.type,
              parcelle: k.parcelle_nom ?? '—',
              valeur:   lm != null ? `${parseFloat(lm.valeur).toFixed(1)}${c.unite ?? ''}` : '—',
              status:   c.actif ? 'online' : 'offline',
              maj:      lm != null ? relativeTime(lm.time) : '—',
            };
          });
        }));

        if (alive) setRows(perKit.flat());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = filter === 'all' ? rows : rows.filter(c => c.status === filter);
  const nbOnline = rows.filter(c => c.status === 'online').length;

  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Capteurs</Text>
        <Text style={st.pageSub}>{loading ? 'Chargement…' : `${nbOnline} / ${rows.length} en ligne`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[['all','Tous'], ['online','En ligne'], ['offline','Hors ligne']].map(([k, lbl]) => (
          <TouchableOpacity key={k} style={[st.filterChip, filter === k && st.filterChipActive]} onPress={() => setFilter(k)}>
            <Text style={[st.filterChipTxt, filter === k && st.filterChipTxtActive]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={st.tableCard}>
        <View style={st.tableHeader}>
          <Text style={[st.tableHd, { flex: 2 }]}>Capteur</Text>
          <Text style={[st.tableHd, { flex: 1.5 }]}>Type</Text>
          <Text style={[st.tableHd, { flex: 2 }]}>Parcelle</Text>
          <Text style={[st.tableHd, { flex: 1 }]}>Valeur</Text>
          <Text style={[st.tableHd, { flex: 1.2 }]}>Statut</Text>
          <Text style={[st.tableHd, { flex: 1.5 }]}>Dernière MAJ</Text>
        </View>
        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Aucun capteur dans cette catégorie</Text>
          </View>
        ) : filtered.map((c, i) => (
          <View key={c.id} style={[st.tableRow, i % 2 === 1 && { backgroundColor: '#0a1421' }]}>
            <Text style={[st.tableTd, { flex: 2, color: COLORS.text, fontWeight: '600' }]}>{c.nom}</Text>
            <Text style={[st.tableTd, { flex: 1.5 }]}>{c.type}</Text>
            <Text style={[st.tableTd, { flex: 2 }]}>{c.parcelle}</Text>
            <Text style={[st.tableTd, { flex: 1, color: COLORS.accent, fontWeight: '700' }]}>{c.valeur}</Text>
            <View style={{ flex: 1.2, justifyContent: 'center' }}>
              <View style={{ backgroundColor: c.status === 'online' ? '#1a3a1a' : '#3a1a1a', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' }}>
                <Text style={{ color: c.status === 'online' ? COLORS.accent : '#e74c3c', fontSize: 10, fontWeight: '700' }}>
                  {c.status === 'online' ? 'EN LIGNE' : 'HORS LIGNE'}
                </Text>
              </View>
            </View>
            <Text style={[st.tableTd, { flex: 1.5 }]}>{c.maj}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
