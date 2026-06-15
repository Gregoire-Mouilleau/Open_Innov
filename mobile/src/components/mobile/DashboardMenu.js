import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { t } from '../../i18n';

// Ligne d'action standard du menu (icône + libellé + chevron optionnel)
function MenuItem({ icon, label, onPress, chevron, danger }) {
  return (
    <TouchableOpacity style={st.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={st.itemIcon}>{icon}</Text>
      <Text style={[st.itemLabel, danger && st.itemLabelDanger]}>{label}</Text>
      {chevron && <Text style={st.itemChevron}>{chevron}</Text>}
    </TouchableOpacity>
  );
}

/**
 * Panneau latéral (droite) regroupant : profil, ajout de widget,
 * changement de ferme et déconnexion.
 */
export default function DashboardMenu({
  visible, onClose, user,
  farmsList = [], selectedFarmId, farmName,
  onProfile, onAddWidget, onSelectFarm, onLogout,
}) {
  const [farmsOpen, setFarmsOpen] = useState(false);

  const handle = (fn) => () => { onClose(); fn?.(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Fond cliquable pour fermer */}
      <Pressable style={st.overlay} onPress={onClose}>
        {/* Panneau : stopPropagation pour ne pas fermer au tap interne */}
        <Pressable style={st.panel} onPress={(e) => e.stopPropagation?.()}>
          {/* En-tête utilisateur */}
          <View style={st.header}>
            <View style={st.avatar}>
              <Text style={st.avatarTxt}>{(user?.email?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.userEmail} numberOfLines={1}>{user?.email ?? '—'}</Text>
              {user?.isAdmin != null && (
                <Text style={st.userRole}>{user.isAdmin ? t('menu.admin') : t('menu.member')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Text style={st.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
            <MenuItem icon="👤" label={t('menu.profile')}   onPress={handle(onProfile)}   chevron="›" />
            <MenuItem icon="➕" label={t('menu.addWidget')} onPress={handle(onAddWidget)} chevron="›" />

            {/* Changer de ferme : section dépliable */}
            <TouchableOpacity style={st.item} onPress={() => setFarmsOpen((v) => !v)} activeOpacity={0.7}>
              <Text style={st.itemIcon}>🚜</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.itemLabel}>{t('menu.changeFarm')}</Text>
                <Text style={st.itemSub} numberOfLines={1}>{farmName ?? '—'}</Text>
              </View>
              <Text style={st.itemChevron}>{farmsOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>

            {farmsOpen && (
              <View style={st.farmList}>
                {farmsList.length === 0 && (
                  <Text style={st.farmEmpty}>{t('menu.noFarm')}</Text>
                )}
                {farmsList.map((f) => {
                  const active = f.id === selectedFarmId;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[st.farmItem, active && st.farmItemActive]}
                      onPress={() => { onSelectFarm?.(f.id); setFarmsOpen(false); onClose(); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[st.farmTxt, active && st.farmTxtActive]} numberOfLines={1}>{f.nom}</Text>
                      {active && <Text style={st.farmCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={st.divider} />

            <MenuItem icon="🚪" label={t('menu.logout')} onPress={handle(onLogout)} danger />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', justifyContent: 'flex-end' },
  panel: {
    width: '78%', maxWidth: 340, height: '100%',
    backgroundColor: COLORS.background,
    borderLeftWidth: 1, borderLeftColor: COLORS.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 56, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: '#0d1520',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userEmail: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  userRole: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  closeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: COLORS.textSecondary, fontSize: 16 },

  body: { padding: 12, gap: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 12, paddingVertical: 14,
    borderRadius: 10,
  },
  itemIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  itemLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  itemLabelDanger: { color: COLORS.selected },
  itemSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  itemChevron: { color: COLORS.textSecondary, fontSize: 18 },

  farmList: { paddingLeft: 40, paddingRight: 8, gap: 2, marginBottom: 4 },
  farmItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8,
  },
  farmItemActive: { backgroundColor: COLORS.accent + '22' },
  farmTxt: { color: COLORS.textSecondary, fontSize: 14, flex: 1 },
  farmTxtActive: { color: COLORS.accent, fontWeight: '700' },
  farmCheck: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  farmEmpty: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 8 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8, marginHorizontal: 12 },
});
