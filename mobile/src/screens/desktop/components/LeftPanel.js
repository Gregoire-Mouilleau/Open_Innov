import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../../../constants/theme';
import CamPulse from '../../../components/cameras/CamPulse';
import { st } from '../styles';

const NAV_ITEMS = [
  { key: 'overview',  icon: '⊞', label: "Vue d'ensemble" },
  { key: 'farms',     icon: '⌂', label: 'Fermes'         },
  { key: 'parcelles', icon: '🌱', label: 'Parcelles'      },
  { key: 'sensors',   icon: '◎', label: 'Capteurs'       },
  { key: 'alertes',   icon: '◇', label: 'Alertes'        },
  { key: 'reports',   icon: '☰', label: 'Rapports'       },
  { key: 'history',   icon: '⊙', label: 'Historique'     },
];

export default function LeftPanel({ systems, wind, cameras = [], loading, activeKey, setActiveKey }) {
  const temp = systems?.find(s => s.id === 'temp');
  const hum  = systems?.find(s => s.id === 'humidity');
  // Vent : moyenne des capteurs "vent" de la ferme (déjà formatée par le hook).
  const windTxt = wind ?? '—';
  const now  = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  return (
    <View style={st.left}>
      {/* Navigation */}
      <Text style={st.sideSecLabel}>SYSTÈMES</Text>
      <View style={st.sideNav}>
        {NAV_ITEMS.map(item => {
          const active = activeKey === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[st.sideNavItem, active && st.sideNavItemActive]}
              onPress={() => setActiveKey(item.key)}
              activeOpacity={0.75}
            >
              <Text style={[st.sideNavIcon, active && st.sideNavIconActive]}>{item.icon}</Text>
              <Text style={[st.sideNavLabel, active && st.sideNavLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Caméras widget */}
      <TouchableOpacity
        style={[st.camSideCard, activeKey === 'cameras' && { borderColor: COLORS.accent }]}
        onPress={() => setActiveKey('cameras')}
        activeOpacity={0.88}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={st.sideSecLabel}>CAMÉRAS</Text>
          <View style={st.camSideLivePill}>
            <CamPulse />
            <Text style={{ color: '#e74c3c', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>LIVE</Text>
          </View>
        </View>

        {/* Preview — image terrain */}
        <View style={st.camSidePreview}>
          <Image
            source={{ uri: cameras[0]?.thumb ?? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&q=75' }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 7 }}
            resizeMode="cover"
          />
          {/* Overlay sombre */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 7 }} />
          {/* Corner brackets */}
          <View style={[st.camBracket, { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[st.camBracket, { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 }]} />
          <View style={[st.camBracket, { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[st.camBracket, { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 }]} />
          {/* Timestamp */}
          <View style={st.camSideTimestamp}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8, fontFamily: 'monospace' }}>
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <View>
            <Text style={{ color: COLORS.text, fontSize: 11, fontWeight: '700' }}>{cameras[0]?.name ?? 'Aucune caméra'}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 9, marginTop: 1 }}>
              {cameras.length} caméra{cameras.length > 1 ? 's' : ''} disponible{cameras.length > 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '300' }}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Conditions actuelles */}
      <View style={st.sideCondCard}>
        <Text style={st.sideSecLabel}>CONDITIONS ACTUELLES</Text>
        <View style={st.sideCondRow}>
          <Text style={[st.sideCondIco, { color: '#e74c3c', fontSize: 22 }]}>🌡</Text>
          <View>
            <Text style={st.sideCondVal}>{temp && temp.value !== '—' ? temp.value + '°C' : '—'}</Text>
            <Text style={st.sideCondSub}>Température</Text>
          </View>
        </View>
        <View style={st.sideCondRow}>
          <Text style={st.sideCondIco}>💧</Text>
          <View>
            <Text style={st.sideCondVal}>{hum && hum.value !== '—' ? hum.value + '%' : '—'}</Text>
            <Text style={st.sideCondSub}>Humidité</Text>
          </View>
        </View>
        <View style={st.sideCondRow}>
          <Text style={st.sideCondIco}>💨</Text>
          <View>
            <Text style={st.sideCondVal}>{windTxt}</Text>
            <Text style={st.sideCondSub}>Vent</Text>
          </View>
        </View>
      </View>

      {/* Dernière MAJ */}
      <View style={st.sideMajCard}>
        <Text style={st.sideMajLabel}>Dernière MAJ</Text>
        <Text style={st.sideMajDate}>{now}</Text>
      </View>
    </View>
  );
}
