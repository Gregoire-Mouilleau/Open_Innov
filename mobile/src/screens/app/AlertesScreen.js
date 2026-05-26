import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { alertes as alertesApi } from '../../services/api';

const SEV_COLORS = { critical: '#e74c3c', warning: '#e67e22', info: '#3498db' };
const SEV_ICONS  = { critical: '🔴', warning: '🟠', info: '🔵' };

const FILTERS = [
  { key: null,       label: 'Toutes' },
  { key: 'critical', label: '🔴 Critiques' },
  { key: 'warning',  label: '🟠 Avertissements' },
  { key: 'info',     label: '🔵 Info' },
];

function AlerteCard({ item, onToggleLu }) {
  const color = SEV_COLORS[item.severite] ?? COLORS.textSecondary;
  const icon  = SEV_ICONS[item.severite]  ?? '⚪';
  return (
    <TouchableOpacity
      style={[st.card, item.lu && st.cardLu]}
      activeOpacity={0.85}
      onPress={() => onToggleLu(item)}
    >
      <View style={st.cardLeft}>
        <Text style={st.icon}>{icon}</Text>
      </View>
      <View style={st.cardBody}>
        <View style={st.cardHeader}>
          <View style={[st.badge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[st.badgeTxt, { color }]}>{item.severite}</Text>
          </View>
          {item.lu && <Text style={st.luTag}>✓ lu</Text>}
        </View>
        <Text style={[st.message, item.lu && st.messageLu]}>{item.message}</Text>
        {item.parcelle_id && (
          <Text style={st.meta}>Parcelle #{item.parcelle_id}</Text>
        )}
        <Text style={st.time}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AlertesScreen({ navigation }) {
  const [items,       setItems]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [activeFilter,setFilter]     = useState(null); // null | 'critical' | 'warning' | 'info'

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await alertesApi.list({
        limit:   100,
        severite: activeFilter ?? undefined,
      });
      setItems(res?.alertes ?? res ?? []);
    } catch {
      // toast global
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { load(); }, [load]);

  // Marquer lu localement (pas d'API de PATCH pour l'instant)
  const handleToggleLu = (item) => {
    setItems(prev => prev.map(a => a._id === item._id ? { ...a, lu: !a.lu } : a));
  };

  const unreadCount = items.filter(a => !a.lu).length;

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={st.headerRow}>
          <Text style={st.title}>Alertes</Text>
          {unreadCount > 0 && (
            <View style={st.badge2}><Text style={st.badge2Txt}>{unreadCount}</Text></View>
          )}
        </View>
        <Text style={st.sub}>{items.length} alerte{items.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filtres */}
      <View style={st.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={String(f.key)}
            style={[st.filterBtn, activeFilter === f.key && st.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[st.filterTxt, activeFilter === f.key && st.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={st.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item._id ?? i)}
          renderItem={({ item }) => <AlerteCard item={item} onToggleLu={handleToggleLu} />}
          contentContainerStyle={items.length === 0 ? st.emptyContainer : st.list}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyIcon}>✅</Text>
              <Text style={st.emptyTxt}>Aucune alerte</Text>
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

  header:   { padding: 16, paddingTop: 44, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backBtn:  { marginBottom: 8 },
  backTxt:  { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  headerRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:    { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  sub:      { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  badge2:   { backgroundColor: '#e74c3c', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badge2Txt:{ color: '#fff', fontSize: 11, fontWeight: '700' },

  filtersRow:{ flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterBtnActive: { borderColor: COLORS.accent, backgroundColor: '#1a3a1a' },
  filterTxt: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTxtActive: { color: COLORS.accent },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', padding: 14, marginBottom: 10,
  },
  cardLu: { opacity: 0.65 },
  cardLeft: { marginRight: 12, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  icon:  { fontSize: 20 },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge:    { borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  luTag:    { color: COLORS.accent, fontSize: 11 },
  message:  { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  messageLu:{ color: COLORS.textSecondary },
  meta:     { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  time:     { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },

  emptyContainer: { flex: 1 },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:{ fontSize: 48, marginBottom: 12 },
  emptyTxt: { color: COLORS.textSecondary, fontSize: 15 },
});
