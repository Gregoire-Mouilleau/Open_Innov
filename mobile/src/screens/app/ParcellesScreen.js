import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { farms, parcelles } from '../../services/api';

const CULTURE_ICONS = {
  ble:      '🌾',
  mais:     '🌽',
  vigne:    '🍇',
  colza:    '🌼',
  tournesol:'🌻',
  soja:     '🌿',
  default:  '🌱',
};

function ParcelleCard({ item, onPress }) {
  const icon = CULTURE_ICONS[item.culture_type?.toLowerCase()] ?? CULTURE_ICONS.default;
  return (
    <TouchableOpacity style={st.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={st.cardLeft}>
        <Text style={st.icon}>{icon}</Text>
      </View>
      <View style={st.cardBody}>
        <Text style={st.cardTitle}>{item.nom}</Text>
        <Text style={st.cardSub}>{item.farm_nom ?? '—'}</Text>
        <View style={st.cardMeta}>
          {item.culture_type && (
            <View style={st.badge}><Text style={st.badgeTxt}>{item.culture_type}</Text></View>
          )}
          {item.superficie_ha != null && (
            <Text style={st.metaTxt}>{item.superficie_ha} ha</Text>
          )}
        </View>
      </View>
      <Text style={st.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ParcellesScreen({ navigation }) {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Charge toutes les farms puis toutes les parcelles
      const farmsData = await farms.list();
      const allFarms  = farmsData?.farms ?? farmsData ?? [];

      if (allFarms.length === 0) { setItems([]); return; }

      // Charge parcelles pour chaque farm
      const results = await Promise.allSettled(
        allFarms.map(f => parcelles.list(f.id).then(r => (r?.parcelles ?? r ?? [])))
      );

      const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setItems(all);
    } catch {
      // toast géré globalement
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerTitle}>Parcelles</Text>
        <Text style={st.headerSub}>{items.length} parcelle{items.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ParcelleCard item={item} onPress={p => navigation.navigate('ParcelleDetail', { parcelle: p })} />
          )}
          contentContainerStyle={items.length === 0 ? st.emptyContainer : st.list}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyIcon}>🌱</Text>
              <Text style={st.emptyTxt}>Aucune parcelle trouvée</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={COLORS.accent}
            />
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },

  header: { padding: 20, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  headerSub:   { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12,
  },
  cardLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a3a1a', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  icon:     { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle:{ color: COLORS.text, fontSize: 16, fontWeight: '600' },
  cardSub:  { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },

  badge:    { backgroundColor: '#1a3a1a', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  metaTxt:  { color: COLORS.textSecondary, fontSize: 12 },
  chevron:  { color: COLORS.textSecondary, fontSize: 22, marginLeft: 8 },

  emptyContainer: { flex: 1 },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:{ fontSize: 48, marginBottom: 12 },
  emptyTxt: { color: COLORS.textSecondary, fontSize: 15 },
});
