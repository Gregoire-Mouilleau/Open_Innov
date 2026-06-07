import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { COLORS } from '../../constants/theme';
import { t } from '../../i18n';
import useDashboardData from '../../hooks/useDashboardData';
import { tokenStorage } from '../../services/api';
import TechFarmMap from '../../components/map/TechFarmMap';

// Décode le payload JWT sans vérification de signature (lecture seule)
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function useAuth(navigation) {
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const token = await tokenStorage.get();
    if (!token) { setUser(null); return; }
    const payload = decodeJWT(token);
    if (!payload) { setUser(null); return; }
    // Vérifie l'expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      await tokenStorage.clear();
      setUser(null);
      return;
    }
    setUser({ email: payload.email, isAdmin: payload.isAdmin });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    navigation?.replace('Auth');
  }, [navigation]);

  return { user, logout };
}

// ─── Data ─────────────────────────────────────────────────────
// Les données statiques ci-dessous sont des fallbacks — remplacées par useDashboardData au runtime

// ─── Caméras publiques de démonstration ─────────────────────
const CAMERAS_DATA = [
  {
    id: 1,
    name: 'Champ Blé — Vue Aérienne',
    location: 'Ferme Nord',
    src: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&controls=0&rel=0&modestbranding=1&disablekb=1',
    thumb: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    icon: '🌾',
    status: 'live',
  },
  {
    id: 2,
    name: 'Parcelle Maraichère',
    location: 'Parcelle Centre',
    src: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&controls=0&rel=0&modestbranding=1&disablekb=1',
    thumb: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    icon: '🥦',
    status: 'live',
  },
];

const SYSTEMS_FALLBACK = [
  { id: 'temp',     icon: '🌡️', value: '—', unit: '°C',   arrow: '—', aC: '#e67e22', bg: '#2a1500', bc: '#e67e22' },
  { id: 'humidity', icon: '💧',  value: '—', unit: '% HR', arrow: '—', aC: '#3498db', bg: '#001529', bc: '#3498db' },
  { id: 'soil',     icon: '🌱',  value: '—', unit: '% HR', arrow: '—', aC: '#27ae60', bg: '#0a2010', bc: '#27ae60' },
];

// ─── Demo chart data ─────────────────────────────────────────
const TEMP_DEMO    = [14,13,13,12,12,13,15,17,19,21,24,26,28,28,27,26,25,24,22,20,19,18,17,16];
const HUMID_DEMO   = [85,84,83,85,86,82,78,74,70,66,62,58,55,56,58,60,62,64,68,72,76,80,83,85];
const CHART_XTICKS = ['00:00','06:00','12:00','18:00'];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const ALERTES_DEMO = [
  { id:'d1', typeLabel:'Température élevée',   ferme:'Ferme Nord',   capteur:'Capteur T° #3',  message:'Température au-delà du seuil (26°C)', severite:'Élevée',  sColor:'#e74c3c', heure:'21:02' },
  { id:'d2', typeLabel:'Humidité du sol basse', ferme:'Ferme Centre', capteur:'Capteur Sol #1', message:'Humidité en dessous du seuil (20%)',   severite:'Moyenne', sColor:'#f39c12', heure:'20:45' },
];

// ─── Navbar ───────────────────────────────────────────────────

function Navbar({ tab, setTab, user, onLogin, onLogout, onSettings, onCompany }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const tabs = [
    { key: 'dashboard', label: t('nav.dashboard') },
    { key: 'reports',   label: t('nav.reports') },
    { key: 'history',   label: t('nav.history') },
  ];
  return (
    <>
      <View style={st.navbar}>
        <View style={st.brand}>
          <View style={st.brandIcon}><Text style={{ fontSize: 15 }}>🌿</Text></View>
          <Text style={st.brandTxt}>{t('nav.brand')}</Text>
        </View>
        <View style={st.navTabs}>
          {tabs.map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <Text style={st.navSep}>|</Text>}
              <TouchableOpacity onPress={() => setTab(item.label)} style={st.navTabWrap}>
                <Text style={[st.navTab, tab === item.label && st.navTabOn]}>{item.label}</Text>
                {tab === item.label && <View style={st.navUnderline} />}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
        <View style={st.navRight}>
          {/* Cloche notifications */}
          <TouchableOpacity
            style={[st.bellBtn, showNotifs && st.bellBtnActive]}
            onPress={() => { setShowNotifs(v => !v); setShowMenu(false); }}
            activeOpacity={0.8}
          >
            <Text style={st.bellIcon}>🔔</Text>
          </TouchableOpacity>
          {user ? (
            <TouchableOpacity
              style={[st.userBtn, showMenu && st.userBtnActive]}
              onPress={() => { setShowMenu(v => !v); setShowNotifs(false); }}
              activeOpacity={0.8}
            >
              <View style={[st.avatarGuest, { borderColor: showMenu ? COLORS.accent : '#334' }]}>
                <Text style={{ color: COLORS.accent, fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={st.navUserEmail} numberOfLines={1}>{user.email}</Text>
                {user.isAdmin && <Text style={st.navUserRole}>{t('nav.admin')}</Text>}
              </View>
              <Text style={st.chevron}>{showMenu ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={st.avatarGuest}>
                <Text style={{ color: '#aaa', fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={st.navGuestLabel}>{t('nav.notConnected')}</Text>
              </View>
              <TouchableOpacity style={st.loginBtn} onPress={onLogin}>
                <Text style={st.loginBtnTxt}>{t('nav.login')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Overlay transparent pour fermer les menus */}
      {(showMenu || showNotifs) && (
        <TouchableOpacity
          style={st.menuOverlay}
          activeOpacity={1}
          onPress={() => { setShowMenu(false); setShowNotifs(false); }}
        />
      )}

      {/* Popup notifications */}
      {showNotifs && (
        <View style={st.notifsDropdown}>
          <View style={st.notifsHeader}>
            <Text style={st.notifsTitle}>🔔 Notifications</Text>
          </View>
          <View style={st.dropdownDiv} />
          <View style={st.notifsEmpty}>
            <Text style={st.notifsEmptyIcon}>🌿</Text>
            <Text style={st.notifsEmptyTxt}>Aucune notification</Text>
            <Text style={st.notifsEmptySub}>Vous êtes à jour !</Text>
          </View>
        </View>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <View style={st.dropdown}>
          {/* En-tête avec avatar et infos */}
          <View style={st.dropdownHeader}>
            <View style={st.dropdownAvatar}>
              <Text style={{ fontSize: 22 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownEmail} numberOfLines={1}>{user?.email}</Text>
              <Text style={st.dropdownRole}>{user?.isAdmin ? t('userMenu.roleAdmin') : t('userMenu.roleUser')}</Text>
            </View>
          </View>
          <View style={st.dropdownDiv} />
          {/* Paramètres du compte */}
          <TouchableOpacity style={st.dropdownItem} onPress={() => { setShowMenu(false); onSettings?.(); }}>
            <Text style={{ fontSize: 17 }}>⚙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.settings')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.settingsSub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.dropdownItem} onPress={() => { setShowMenu(false); onCompany?.(); }}>
            <Text style={{ fontSize: 17 }}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.company')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.companySub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.dropdownItem} onPress={() => setShowMenu(false)}>
            <Text style={{ fontSize: 17 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.dropdownItemTxt}>{t('userMenu.notifications')}</Text>
              <Text style={st.dropdownItemSub}>{t('userMenu.notificationsSub')}</Text>
            </View>
            <Text style={st.dropdownArrow}>›</Text>
          </TouchableOpacity>
          <View style={st.dropdownDiv} />
          {/* Déconnexion */}
          <TouchableOpacity style={[st.dropdownItem, st.dropdownLogoutItem]} onPress={() => { setShowMenu(false); onLogout(); }}>
            <Text style={{ fontSize: 17 }}>🚪</Text>
            <Text style={st.dropdownLogoutTxt}>{t('userMenu.logout')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// ─── Camera pulse dot ────────────────────────────────────────
function CamPulse() {
  const [big, setBig] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setBig(v => !v), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{
      width: big ? 7 : 5, height: big ? 7 : 5, borderRadius: 4,
      backgroundColor: '#e74c3c', opacity: big ? 1 : 0.55,
    }} />
  );
}

// ─── Left panel ───────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'overview',  icon: '⊞', label: "Vue d'ensemble" },
  { key: 'farms',     icon: '⌂', label: 'Fermes'         },
  { key: 'sensors',   icon: '◎', label: 'Capteurs'       },
  { key: 'alertes',   icon: '◇', label: 'Alertes'        },
  { key: 'reports',   icon: '☰', label: 'Rapports'       },
  { key: 'history',   icon: '⊙', label: 'Historique'     },
];

function LeftPanel({ systems, loading, activeKey, setActiveKey }) {
  const temp = systems?.find(s => s.id === 'temp');
  const hum  = systems?.find(s => s.id === 'humidity');
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
            source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&q=75' }}
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
            <Text style={{ color: COLORS.text, fontSize: 11, fontWeight: '700' }}>{CAMERAS_DATA[0].name}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 9, marginTop: 1 }}>
              {CAMERAS_DATA.length} caméra{CAMERAS_DATA.length > 1 ? 's' : ''} disponible{CAMERAS_DATA.length > 1 ? 's' : ''}
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
            <Text style={st.sideCondVal}>{temp && temp.value !== '—' ? temp.value + '°C' : '17°C'}</Text>
            <Text style={st.sideCondSub}>Température</Text>
          </View>
        </View>
        <View style={st.sideCondRow}>
          <Text style={st.sideCondIco}>💧</Text>
          <View>
            <Text style={st.sideCondVal}>{hum && hum.value !== '—' ? hum.value + '%' : '78%'}</Text>
            <Text style={st.sideCondSub}>Humidité</Text>
          </View>
        </View>
        <View style={st.sideCondRow}>
          <Text style={st.sideCondIco}>💨</Text>
          <View>
            <Text style={st.sideCondVal}>12 km/h</Text>
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

// ─── Right panel ──────────────────────────────────────────────

function RightPanel({ alertesList, activities }) {
  return (
    <ScrollView style={st.right} showsVerticalScrollIndicator={false}>
      <Text style={st.secLabel}>{t('alerts.title')}</Text>
      {alertesList.length === 0
        ? <Text style={[st.alertSub, { marginLeft: 8 }]}>Aucune alerte récente</Text>
        : alertesList.map(a => (
          <View key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]}>
            <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 32, height: 32, borderRadius: 16 }]}>
              <Text style={{ color: a.color, fontSize: 15 }}>{a.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.alertTitle}>{a.title}</Text>
              <Text style={st.alertSub}>{a.sub}</Text>
            </View>
          </View>
        ))
      }
      <View style={st.div} />
      <Text style={st.secLabel}>{t('alerts.activities')}</Text>
      {activities.map(a => (
        <View key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]}>
          <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 30, height: 30, borderRadius: 15 }]}>
            <Text style={{ fontSize: 14 }}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.actTitle}>{a.title}</Text>
            <Text style={st.alertSub}>{a.sub}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Parcelle map ──────────────────────────────────────────────

// Génère un polygone rectangulaire approximatif à partir du centre GPS et de la superficie (ha)
// Utilisé en fallback quand la géométrie réelle n'est pas renseignée en BDD
function approxPolygon(lat, lng, superficieHa) {
  const ha = superficieHa && superficieHa > 0 ? superficieHa : 5;
  // Côté en mètres d'un carré équivalent
  const sideM = Math.sqrt(ha * 10000);
  // Conversion en degrés
  const dlat = (sideM / 111000) / 2;
  const dlng = (sideM / (111000 * Math.cos((lat * Math.PI) / 180))) / 2;
  // Légère rotation pour moins de carrés parfaits (aspect plus naturel)
  const skew = dlng * 0.18;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - dlng,        lat - dlat       ],
      [lng + dlng + skew, lat - dlat       ],
      [lng + dlng,        lat + dlat       ],
      [lng - dlng - skew, lat + dlat       ],
      [lng - dlng,        lat - dlat       ], // ferme le polygone
    ]],
  };
}

function ParcelleMapView({ parcellesList = [], systems, viewMode = 'satellite', selectedFarmId }) {
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  // Réinitialise la parcelle focalisée quand la ferme change
  React.useEffect(() => { setFocusedIdx(0); }, [selectedFarmId]);

  const markers = parcellesList
    .filter(p => p.position_lat && p.position_lng)
    .map(p => ({
      id:    String(p.id),
      lat:   parseFloat(p.position_lat),
      lng:   parseFloat(p.position_lng),
      label: p.nom,
    }));

  // Délimitations GeoJSON des parcelles
  // Priorité : geometry réelle en BDD → fallback polygone approximatif calculé depuis lat/lng + superficie
  const polygons = parcellesList
    .filter(p => p.position_lat && p.position_lng)
    .map(p => {
      let geom = p.geometry;
      if (typeof geom === 'string') { try { geom = JSON.parse(geom); } catch { geom = null; } }

      // Conversion format Leaflet [{lat,lng}] → GeoJSON Polygon
      if (Array.isArray(geom) && geom.length >= 3 && geom[0]?.lat != null) {
        const ring = [...geom, geom[0]].map(pt => [pt.lng, pt.lat]);
        geom = { type: 'Polygon', coordinates: [ring] };
      }

      if (!geom || !geom.type || !geom.coordinates) {
        geom = approxPolygon(
          parseFloat(p.position_lat),
          parseFloat(p.position_lng),
          parseFloat(p.superficie_ha) || 5
        );
      }
      return { id: String(p.id), geometry: geom, label: p.nom };
    });

  const hasMultiple = markers.length > 1;
  const clampedIdx  = markers.length > 0 ? Math.min(focusedIdx, markers.length - 1) : 0;
  const tempValue   = systems?.find(s => s.id === 'temp')?.value;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <TechFarmMap
        markers={markers}
        polygons={polygons}
        viewMode={viewMode}
        focusedIndex={markers.length > 0 ? clampedIdx : null}
      />

      {/* Aucune coordonnée GPS */}
      {markers.length === 0 && (
        <View style={st.mapNoGps}>
          <Text style={st.mapNoGpsTxt}>📍 {t('map.noGps')}</Text>
        </View>
      )}

      {/* Badge température */}
      {tempValue && tempValue !== '—' && (
        <View style={st.tempBadge}>
          <Text style={st.tempTxt}>{tempValue} °C</Text>
        </View>
      )}

      {/* Navigation parcelles (si plusieurs) */}
      {hasMultiple && (
        <View style={st.parcelleNav}>
          <TouchableOpacity
            style={st.parcelleNavBtn}
            onPress={() => setFocusedIdx(i => (i - 1 + markers.length) % markers.length)}
          >
            <Text style={st.parcelleNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={st.parcelleNavLabel} numberOfLines={1}>
            {markers[clampedIdx]?.label ?? '—'}  ·  {clampedIdx + 1} / {markers.length}
          </Text>
          <TouchableOpacity
            style={st.parcelleNavBtn}
            onPress={() => setFocusedIdx(i => (i + 1) % markers.length)}
          >
            <Text style={st.parcelleNavArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Graphiques SVG ───────────────────────────────────────────

function SvgLineChart({ data, color, yMin, yMax, yTicks, xTicks, unit, dataLabels }) {
  const [dims, setDims]     = React.useState({ w: 320, h: 130 });
  const [hoverIdx, setHover] = React.useState(null);
  const ce = React.createElement;

  const W = dims.w, H = dims.h;
  const pL = 34, pR = 12, pT = 10, pB = 22;
  const iW = W - pL - pR, iH = H - pT - pB;
  const n  = data.length;
  const toX = (i) => pL + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
  const toY = (v) => pT + (1 - (v - yMin) / ((yMax - yMin) || 1)) * iH;

  const pts        = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const base       = (pT + iH).toFixed(1);
  const areaPoints = `${pL.toFixed(1)},${base} ${pts} ${toX(n - 1).toFixed(1)},${base}`;
  const step       = Math.max(1, Math.floor(n / 8));

  const hx = hoverIdx !== null ? toX(hoverIdx) : null;
  const hy = hoverIdx !== null ? toY(data[hoverIdx]) : null;
  const hv = hoverIdx !== null ? data[hoverIdx] : null;
  const ht = hoverIdx !== null && dataLabels ? dataLabels[hoverIdx] : null;
  const ttW = 58, ttH = ht ? 36 : 22;
  const ttX = hx !== null ? Math.min(Math.max(hx - ttW / 2, pL), W - pR - ttW) : 0;
  const ttY = hy !== null ? Math.max(hy - ttH - 6, pT) : 0;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const rawI = (mx - pL) / iW * (n - 1);
    setHover(Math.max(0, Math.min(n - 1, Math.round(rawI))));
  };

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 10 && height > 10) setDims({ w: Math.floor(width), h: Math.floor(height) });
      }}
    >
      {ce('svg', {
        width: W, height: H,
        style: { display: 'block', cursor: 'crosshair' },
        onMouseMove: handleMouseMove,
        onMouseLeave: () => setHover(null),
        xmlns: 'http://www.w3.org/2000/svg',
      },
        // Grille horizontale
        ...yTicks.map((y, k) => ce('line', { key: `g${k}`, x1: pL, y1: toY(y), x2: W - pR, y2: toY(y), stroke: '#ffffff12', strokeWidth: 1 })),
        // Zone remplie
        ce('polygon', { points: areaPoints, fill: color + '26', stroke: 'none' }),
        // Ligne principale
        ce('polyline', { points: pts, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        // Points visibles
        ...data.map((v, i) => (i % step === 0 || i === n - 1)
          ? ce('circle', { key: `d${i}`, cx: toX(i), cy: toY(v), r: 3.5, fill: color, stroke: '#0d1520', strokeWidth: 1.5 })
          : null
        ).filter(Boolean),
        // Labels Y
        ...yTicks.map((y, k) => ce('text', { key: `yl${k}`, x: pL - 5, y: toY(y) + 4, textAnchor: 'end', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, String(y))),
        // Labels X
        ...xTicks.map((lbl, k) => ce('text', { key: `xl${k}`, x: (pL + (k / (xTicks.length - 1)) * iW).toFixed(1), y: H - 4, textAnchor: 'middle', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, lbl)),
        // Hover : ligne verticale + point mis en valeur + tooltip
        ...(hoverIdx !== null ? [
          ce('line',   { key: 'hl', x1: hx, y1: pT, x2: hx, y2: pT + iH, stroke: '#ffffff40', strokeWidth: 1, strokeDasharray: '4 3' }),
          ce('circle', { key: 'hc', cx: hx, cy: hy, r: 5.5, fill: color, stroke: '#fff', strokeWidth: 2 }),
          ce('rect',   { key: 'tr', x: ttX, y: ttY, width: ttW, height: ttH, rx: 4, fill: '#1a2535', stroke: color, strokeWidth: 1 }),
          ce('text',   { key: 'tv', x: ttX + ttW / 2, y: ttY + (ht ? 14 : 15), textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#fff', fontFamily: 'sans-serif' }, `${hv}${unit || ''}`),
          ...(ht ? [ce('text', { key: 'tt', x: ttX + ttW / 2, y: ttY + 28, textAnchor: 'middle', fontSize: 9, fill: '#6e8ea8', fontFamily: 'sans-serif' }, ht)] : []),
        ] : []),
      )}
    </View>
  );
}

function SvgDonut({ value }) {
  const ce = React.createElement;
  const R = 40, CX = 57, CY = 57, SW = 12;
  const circ = 2 * Math.PI * R;
  const pct  = Math.min(Math.max(value / 100, 0), 1);
  const color = value <= 30 ? '#e74c3c' : '#2ecc71';
  const lbl   = value <= 30 ? 'Faible' : value <= 70 ? 'Optimal' : 'Élevé';
  return (
    <View>
      {ce('svg', { width: 114, height: 114, viewBox: '0 0 114 114', xmlns: 'http://www.w3.org/2000/svg' },
        ce('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: '#1e2d3d', strokeWidth: SW }),
        ce('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: color, strokeWidth: SW, strokeDasharray: `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`, strokeLinecap: 'round', transform: `rotate(-90 ${CX} ${CY})` }),
        ce('text', { x: CX, y: CY - 3, textAnchor: 'middle', fontSize: 18, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'sans-serif' }, `${value}%`),
        ce('text', { x: CX, y: CY + 16, textAnchor: 'middle', fontSize: 11, fill: color, fontFamily: 'sans-serif' }, lbl),
      )}
    </View>
  );
}

// ─── Charts row ───────────────────────────────────────────────

function ChartsRow({ systems }) {
  const rawSoil = systems?.find(s => s.id === 'soil')?.value;
  const soilVal = rawSoil && rawSoil !== '—' ? Math.round(parseFloat(rawSoil)) : 68;
  return (
    <View style={st.chartsRow}>
      {/* Température 24h */}
      <View style={[st.chartCard, { flex: 1 }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>Température (24h)</Text>
          <Text style={st.chartUnit}>°C</Text>
        </View>
        <SvgLineChart data={TEMP_DEMO} color="#e67e22" yMin={0} yMax={35} yTicks={[0,10,20,30]} xTicks={CHART_XTICKS} unit="°C" dataLabels={HOURS_24} />
      </View>

      {/* Humidité 24h */}
      <View style={[st.chartCard, { flex: 1, borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>Humidité (24h)</Text>
          <Text style={st.chartUnit}>%</Text>
        </View>
        <SvgLineChart data={HUMID_DEMO} color="#3498db" yMin={0} yMax={100} yTicks={[0,25,50,75,100]} xTicks={CHART_XTICKS} unit="%" dataLabels={HOURS_24} />
      </View>

      {/* Humidité du sol — jauge circulaire */}
      <View style={[st.chartCard, st.chartCardSoil]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>Humidité du sol (moyenne)</Text>
        </View>
        <View style={st.soilGaugeRow}>
          <SvgDonut value={soilVal} />
          <View style={st.soilLegend}>
            <View style={st.soilLegItem}>
              <View style={[st.soilLegDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={st.soilLegTxt}>Faible (0-30%)</Text>
            </View>
            <View style={st.soilLegItem}>
              <View style={[st.soilLegDot, { backgroundColor: '#f1c40f' }]} />
              <Text style={st.soilLegTxt}>Moyen (30-70%)</Text>
            </View>
            <View style={st.soilLegItem}>
              <View style={[st.soilLegDot, { backgroundColor: '#2ecc71' }]} />
              <Text style={st.soilLegTxt}>Élevé (70-100%)</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Alertes table ────────────────────────────────────────────

function KpiCards({ farmsList, alertesList }) {
  const nbFermes   = farmsList?.length   ?? 3;
  const nbAlertes  = alertesList?.length ?? 2;
  const CARDS = [
    {
      key:     'farms',
      icon:    '\u2302',
      iconBg:  '#1a3a1a',
      iconC:   COLORS.accent,
      value:   String(nbFermes),
      label:   'Fermes actives',
      sub:     '+1 ce mois',
      subC:    COLORS.accent,
    },
    {
      key:     'sensors',
      icon:    '🌿',
      iconBg:  '#1a2a3a',
      iconC:   '#3498db',
      value:   '12',
      label:   'Capteurs en ligne',
      sub:     '100% opérationnels',
      subC:    COLORS.accent,
    },
    {
      key:     'alertes',
      icon:    '⚠',
      iconBg:  '#3a2200',
      iconC:   '#f39c12',
      value:   String(nbAlertes),
      label:   'Alertes actives',
      sub:     'Voir détails',
      subC:    '#f39c12',
    },
    {
      key:     'health',
      icon:    '🌱',
      iconBg:  '#1a3a1a',
      iconC:   COLORS.accent,
      value:   '100%',
      label:   'Santé des cultures',
      sub:     'Bonne',
      subC:    COLORS.accent,
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
            <Text style={[st.kpiSub, { color: c.subC }]}>{c.sub}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Center column ────────────────────────────────────────────

function CenterCol({ farmName, farmsList, selectedFarmId, selectFarm, parcellesList, systems, alertes }) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewMode, setViewMode]     = useState('satellite');
  return (
    <View style={st.center}>
      <KpiCards farmsList={farmsList} alertesList={alertes} />
      {/* farmHdr sorti du mapCard pour éviter le clipping overflow:hidden */}
      <View style={st.farmHdr}>
        <View style={st.farmNameRow}>
          <View style={[st.farmDot, { backgroundColor: '#2ecc71' }]} />
          {farmsList.length > 1 ? (
            <View style={{ position: 'relative', zIndex: 200 }}>
              <TouchableOpacity
                style={st.farmPickerBtn}
                onPress={() => setShowPicker((v) => !v)}
              >
                <Text style={st.farmName}>{farmName || t('map.farmName')}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginLeft: 6 }}>{showPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showPicker && (
                <View style={st.farmDropdown}>
                  {farmsList.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[st.farmDropdownItem, f.id === selectedFarmId && st.farmDropdownItemActive]}
                      onPress={() => { selectFarm(f.id); setShowPicker(false); }}
                    >
                      <Text style={[st.farmDropdownText, f.id === selectedFarmId && st.farmDropdownTextActive]}>{f.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={st.farmName}>{farmName || t('map.farmName')}</Text>
          )}
        </View>
        <TouchableOpacity style={st.satBtn} onPress={() => setViewMode(v => v === 'satellite' ? 'street' : 'satellite')}>
          <Text style={st.satTxt}>{viewMode === 'satellite' ? `🛰  ${t('map.satellite')}` : `🗺  ${t('map.viewStreet')}`}</Text>
        </TouchableOpacity>
      </View>
      <View style={st.mapCard}>
        <ParcelleMapView
          parcellesList={parcellesList}
          systems={systems}
          viewMode={viewMode}
          selectedFarmId={selectedFarmId}
        />
      </View>
      <ChartsRow systems={systems} />
    </View>
  );
}

// ─── Composant iframe web-only ──────────────────────────────
function CamEmbed({ src }) {
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a1422' }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Vidéo non supportée sur mobile</Text>
      </View>
    );
  }
  return React.createElement('iframe', {
    src,
    style: { width: '100%', height: '100%', border: 'none', borderRadius: 8 },
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture',
    allowFullScreen: true,
    loading: 'lazy',
  });
}

// ── Page Caméras ─────────────────────────────────────────────
function CamerasPage({ selectedCam, setSelectedCam }) {

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#080f18' }}>
      {/* Header */}
      <View style={[st.pagePad, { flex: 0, paddingBottom: 0 }]}>
        <View style={st.pageHdr}>
          <Text style={st.pageTitle}>Caméras</Text>
          <Text style={st.pageSub}>{CAMERAS_DATA.length} sources disponibles · Flux publics de démonstration</Text>
        </View>
      </View>

        {selectedCam ? null : (
        <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {CAMERAS_DATA.map(cam => (
              <TouchableOpacity
                key={cam.id}
                style={st.camCard}
                onPress={() => setSelectedCam(cam)}
                activeOpacity={0.85}
              >
                {/* Thumbnail image statique */}
                <View style={st.camThumbWrap}>
                  <Image
                    source={{ uri: cam.thumb }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    resizeMode="cover"
                  />
                  {/* Overlay sombre */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} />
                  <View style={st.camLivePill}>
                    <CamPulse />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>LIVE</Text>
                  </View>
                  <View style={st.camPlayBtn}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                      <Text style={{ color: '#fff', fontSize: 20, marginLeft: 4 }}>▶</Text>
                    </View>
                  </View>
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{cam.icon} {cam.name}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 3 }}>📍 {cam.location}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Carte Ajouter */}
            <View style={[st.camCard, { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', minHeight: 220, backgroundColor: 'transparent' }]}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📷</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>Ajouter une caméra</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center', maxWidth: 160 }}>Connectez un flux IoT ou une URL RTSP/HLS</Text>
            </View>
          </View>
        </ScrollView>
        )}
    </View>
  );
}

// ─── Pages additionnelles ─────────────────────────────────────

// ── Fermes ──────────────────────────────────────────
function FermesPage({ farmsList, parcellesList }) {
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Fermes</Text>
        <Text style={st.pageSub}>{farmsList.length} ferme{farmsList.length !== 1 ? 's' : ''} enregistrée{farmsList.length !== 1 ? 's' : ''}</Text>
      </View>
      {farmsList.length === 0 ? (
        <View style={st.emptyState}>
          <Text style={st.emptyIco}>⌂</Text>
          <Text style={st.emptyTxt}>Aucune ferme disponible</Text>
        </View>
      ) : (
        <View style={st.farmGrid}>
          {farmsList.map(farm => {
            const farmParcelles = parcellesList.filter(p => p.farm_id === farm.id);
            return (
              <View key={farm.id} style={st.farmGridCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>⌂</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>{farm.nom}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 1 }}>{farm.localisation ?? '—'}</Text>
                  </View>
                  <View style={{ backgroundColor: '#1a3a1a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '700' }}>ACTIF</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { val: farmParcelles.length || 0, lbl: 'Parcelles' },
                    { val: '—', lbl: 'Capteurs' },
                    { val: '—', lbl: 'Alertes' },
                  ].map(s => (
                    <View key={s.lbl} style={st.farmStatChip}>
                      <Text style={st.farmStatVal}>{s.val}</Text>
                      <Text style={st.farmStatLbl}>{s.lbl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ── Capteurs ─────────────────────────────────────────
const DEMO_CAPTEURS = [
  { id: 1, nom: 'Capteur T° #1',   type: 'Température',  parcelle: 'Parcelle Nord',   valeur: '24.3°C', status: 'online',  maj: 'Il y a 2 min' },
  { id: 2, nom: 'Capteur Hum. #1', type: 'Humidité Air', parcelle: 'Parcelle Nord',   valeur: '65.2%',  status: 'online',  maj: 'Il y a 2 min' },
  { id: 3, nom: 'Capteur Sol #1',  type: 'Humidité Sol', parcelle: 'Parcelle Centre', valeur: '42.8%',  status: 'online',  maj: 'Il y a 5 min' },
  { id: 4, nom: 'Capteur T° #2',   type: 'Température',  parcelle: 'Parcelle Sud',    valeur: '—',      status: 'offline', maj: 'Il y a 2h'    },
];

function CapteursPge() {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? DEMO_CAPTEURS : DEMO_CAPTEURS.filter(c => c.status === filter);
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Capteurs</Text>
        <Text style={st.pageSub}>{DEMO_CAPTEURS.filter(c => c.status === 'online').length} / {DEMO_CAPTEURS.length} en ligne</Text>
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
        {filtered.map((c, i) => (
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

// ── Alertes ──────────────────────────────────────────
function AlertesPge({ alertesList }) {
  const [filter, setFilter] = React.useState('all');
  const allAlertes = [
    ...ALERTES_DEMO,
    ...alertesList.map(a => ({
      id: 'api-' + a.id,
      typeLabel: a.title,
      ferme: '—',
      capteur: '—',
      message: a.title,
      severite: a.color === '#e74c3c' ? 'Élevée' : 'Moyenne',
      sColor: a.color,
      heure: a.sub,
    })),
  ];
  const filtered =
    filter === 'all'      ? allAlertes :
    filter === 'critical' ? allAlertes.filter(a => a.sColor === '#e74c3c') :
                            allAlertes.filter(a => a.sColor === '#f39c12');
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Alertes</Text>
        <Text style={st.pageSub}>{allAlertes.length} alerte{allAlertes.length !== 1 ? 's' : ''} active{allAlertes.length !== 1 ? 's' : ''}</Text>
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
          <Text style={[st.tableHd, { flex: 1.5 }]}>Type</Text>
          <Text style={[st.tableHd, { flex: 1 }]}>Ferme</Text>
          <Text style={[st.tableHd, { flex: 1.5 }]}>Capteur</Text>
          <Text style={[st.tableHd, { flex: 2 }]}>Message</Text>
          <Text style={[st.tableHd, { width: 70 }]}>Heure</Text>
        </View>
        {filtered.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Aucune alerte dans cette catégorie</Text>
          </View>
        ) : filtered.map((a, i) => (
          <View key={a.id} style={[st.tableRow, { borderLeftWidth: 3, borderLeftColor: a.sColor }, i % 2 === 1 && { backgroundColor: '#0a1421' }]}>
            <View style={{ width: 90, justifyContent: 'center' }}>
              <View style={{ backgroundColor: a.sColor + '22', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' }}>
                <Text style={{ color: a.sColor, fontSize: 10, fontWeight: '700' }}>{a.severite.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[st.tableTd, { flex: 1.5, color: COLORS.text, fontWeight: '600' }]}>{a.typeLabel}</Text>
            <Text style={[st.tableTd, { flex: 1 }]}>{a.ferme}</Text>
            <Text style={[st.tableTd, { flex: 1.5 }]}>{a.capteur}</Text>
            <Text style={[st.tableTd, { flex: 2 }]} numberOfLines={2}>{a.message}</Text>
            <Text style={[st.tableTd, { width: 70 }]}>{a.heure}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Rapports ─────────────────────────────────────────
function RapportsPge({ systems }) {
  const soil = systems?.find(s => s.id === 'soil');
  const soilVal = soil && soil.value !== '—' ? parseFloat(soil.value) : 54;
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Rapports</Text>
        <Text style={st.pageSub}>Données des dernières 24h</Text>
      </View>
      <View style={[st.kpiRow, { marginBottom: 16 }]}>
        {[
          { label: 'Temp. moy.', value: '21.4°C', icon: '🌡', bg: '#2a1500', iconC: '#e67e22' },
          { label: 'Hum. moy.',  value: '68.5%',  icon: '💧', bg: '#001529', iconC: '#3498db' },
          { label: 'Hum. sol',   value: soilVal + '%', icon: '🌱', bg: '#0a2010', iconC: '#27ae60' },
          { label: 'Alertes 24h', value: String(ALERTES_DEMO.length), icon: '◇', bg: '#2a1000', iconC: '#e74c3c' },
        ].map(c => (
          <View key={c.label} style={st.kpiCard}>
            <View style={[st.kpiIconWrap, { backgroundColor: c.bg }]}>
              <Text style={[st.kpiIcon, { color: c.iconC }]}>{c.icon}</Text>
            </View>
            <View>
              <Text style={st.kpiValue}>{c.value}</Text>
              <Text style={st.kpiLabel}>{c.label}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={[st.tableCard, { padding: 16, marginBottom: 14 }]}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Température (24h)</Text>
        <SvgLineChart data={TEMP_DEMO} color="#e67e22" yMin={10} yMax={32} yTicks={[10,15,20,25,30]} xTicks={CHART_XTICKS} unit="°C" dataLabels={HOURS_24} />
      </View>
      <View style={[st.tableCard, { padding: 16, marginBottom: 14 }]}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Humidité Air (24h)</Text>
        <SvgLineChart data={HUMID_DEMO} color="#3498db" yMin={50} yMax={100} yTicks={[50,60,70,80,90,100]} xTicks={CHART_XTICKS} unit="%" dataLabels={HOURS_24} />
      </View>
    </ScrollView>
  );
}

// ── Historique ────────────────────────────────────────
const DEMO_HISTORIQUE = [
  { id: 'h1', heure: '21:02', type: 'alerte',  label: 'Température élevée',   detail: '28.4°C · Capteur T° #3',  color: '#e74c3c' },
  { id: 'h2', heure: '20:45', type: 'alerte',  label: 'Humidité sol basse',   detail: '28% · Capteur Sol #1',    color: '#f39c12' },
  { id: 'h3', heure: '20:00', type: 'mesure',  label: 'Mesure périodique',    detail: 'T° 26.1°C · Hum. 68%',   color: '#3498db' },
  { id: 'h4', heure: '19:00', type: 'mesure',  label: 'Mesure périodique',    detail: 'T° 25.2°C · Hum. 70%',   color: '#3498db' },
  { id: 'h5', heure: '18:00', type: 'mesure',  label: 'Mesure périodique',    detail: 'T° 24.0°C · Hum. 72%',   color: '#3498db' },
  { id: 'h6', heure: '17:00', type: 'système', label: 'Capteur reconnecté',   detail: 'Capteur T° #2',           color: '#2ecc71' },
  { id: 'h7', heure: '12:00', type: 'mesure',  label: 'Mesure périodique',    detail: 'T° 19.5°C · Hum. 74%',   color: '#3498db' },
];

function HistoriquePge({ alertesList }) {
  const apiEvents = alertesList.map(a => ({
    id: 'api-' + a.id, heure: a.sub, type: 'alerte', label: a.title, detail: '', color: a.color,
  }));
  const allEvents = [...apiEvents, ...DEMO_HISTORIQUE];
  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Historique</Text>
        <Text style={st.pageSub}>Événements des dernières 24h</Text>
      </View>
      <View style={st.tableCard}>
        {allEvents.map((e, i) => (
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
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────

export default function DashboardDesktopScreen({ navigation }) {
  const [tab, setTab] = useState(t('nav.dashboard'));
  const [activeKey, setActiveKey] = useState('overview');
  const [selectedCam, setSelectedCam] = useState(null);
  const { data, loading, selectedFarmId, selectFarm } = useDashboardData();
  const { user, logout } = useAuth(navigation);

  return (
    <View style={st.root}>
      <Navbar
        tab={tab}
        setTab={setTab}
        user={user}
        onLogin={() => navigation?.navigate('Auth')}
        onLogout={logout}
        onSettings={() => navigation?.navigate('AccountSettings')}
        onCompany={() => navigation?.navigate('Company')}
      />
      <View style={st.body}>
        <LeftPanel systems={data.systems} loading={loading} activeKey={activeKey} setActiveKey={setActiveKey} />
        {activeKey === 'overview' && (
          <>
            <CenterCol
              farmName={data.farmName}
              farmsList={data.farmsList}
              selectedFarmId={selectedFarmId}
              selectFarm={selectFarm}
              parcellesList={data.parcellesList ?? []}
              systems={data.systems}
              alertes={data.alertes}
            />
            <RightPanel alertesList={data.alertes} activities={data.activities} />
          </>
        )}
        {activeKey === 'farms'    && <FermesPage    farmsList={data.farmsList} parcellesList={data.parcellesList ?? []} />}
        {activeKey === 'sensors'  && <CapteursPge   systems={data.systems} />}
        {activeKey === 'alertes'  && <AlertesPge    alertesList={data.alertes} />}
        {activeKey === 'reports'  && <RapportsPge   systems={data.systems} />}
        {activeKey === 'history'  && <HistoriquePge alertesList={data.alertes} />}
        {activeKey === 'cameras'  && <CamerasPage selectedCam={selectedCam} setSelectedCam={setSelectedCam} />}
      </View>

      {/* Plein écran caméra — overlay au niveau racine, couvre tout */}
      {selectedCam && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, flexDirection: 'column' }}>
          <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, backgroundColor: '#0d1520', borderBottomWidth: 1, borderBottomColor: '#1a2a3a' }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, backgroundColor: '#e74c3c' }}
              onPress={() => setSelectedCam(null)}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✕  Fermer</Text>
            </TouchableOpacity>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{selectedCam.icon} {selectedCam.name}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{selectedCam.location}</Text>
            <View style={st.camLivePill}>
              <CamPulse />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>LIVE</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <CamEmbed src={selectedCam.src} />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column', backgroundColor: COLORS.background, position: 'relative' },

  navbar: { height: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1520', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 190 },
  brandIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a3a1a', alignItems: 'center', justifyContent: 'center' },
  brandTxt: { color: COLORS.text, fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  navTabs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  navTabWrap: { alignItems: 'center', paddingHorizontal: 14 },
  navTab: { color: COLORS.textSecondary, fontSize: 14 },
  navTabOn: { color: COLORS.text, fontWeight: '600' },
  navUnderline: { height: 2, backgroundColor: COLORS.accent, borderRadius: 1, marginTop: 4, width: '100%' },
  navSep: { color: COLORS.border, fontSize: 18 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 260, justifyContent: 'flex-end' },
  avatarGuest: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334' },
  navGuestLabel: { color: COLORS.textSecondary, fontSize: 12 },
  loginBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  loginBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  navUserEmail: { color: COLORS.text, fontSize: 12, fontWeight: '600', maxWidth: 150 },
  navUserRole: { color: COLORS.accent, fontSize: 10, marginTop: 1 },
  navDiv: { width: 1, height: 20, backgroundColor: COLORS.border },
  userBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent + '33', backgroundColor: '#1a2535' },
  userBtnActive: { borderColor: COLORS.accent + '88', backgroundColor: '#243047' },
  chevron: { color: COLORS.textSecondary, fontSize: 10, marginLeft: 2 },
  bellBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accent + '33', backgroundColor: '#1a2535' },
  bellBtnActive: { borderColor: COLORS.accent + '88', backgroundColor: '#243047' },
  bellIcon: { fontSize: 17 },
  notifsDropdown: { position: 'absolute', top: 64, right: 220, width: 300, backgroundColor: '#0e1929', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  notifsHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  notifsTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  notifsEmpty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  notifsEmptyIcon: { fontSize: 32 },
  notifsEmptyTxt: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  notifsEmptySub: { color: COLORS.textSecondary, fontSize: 12 },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  dropdown: { position: 'absolute', top: 64, right: 24, width: 270, backgroundColor: '#0e1929', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  dropdownAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accent + '66' },
  dropdownEmail: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  dropdownRole: { color: COLORS.accent, fontSize: 11, marginTop: 2 },
  dropdownDiv: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemTxt: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  dropdownItemSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  dropdownArrow: { color: COLORS.textSecondary, fontSize: 18 },
  dropdownLogoutItem: { marginBottom: 4 },
  dropdownLogoutTxt: { color: '#e74c3c', fontSize: 13, fontWeight: '600', flex: 1 },

  body: { flex: 1, flexDirection: 'row' },

  left: { width: 200, flexShrink: 0, flexGrow: 0, backgroundColor: '#0d1520', borderRightWidth: 1, borderRightColor: COLORS.border, paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'column' },
  sideSecLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4 },
  sideNav: { gap: 2 },
  sideNavItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  sideNavItemActive: { backgroundColor: COLORS.accent },
  sideNavIcon: { fontSize: 16, width: 20, textAlign: 'center', color: COLORS.accent },
  sideNavIconActive: { color: '#fff' },
  sideNavLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  sideNavLabelActive: { color: '#fff', fontWeight: '700' },
  sideCondCard: { backgroundColor: '#0a1422', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  sideCondRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sideCondIco: { fontSize: 18, width: 24, textAlign: 'center', color: COLORS.textSecondary },
  sideCondVal: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  sideCondSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  sideMajCard: { backgroundColor: '#0a1422', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  sideMajLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sideMajDate: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginTop: 3 },

  center: { flex: 1, flexDirection: 'column', backgroundColor: '#080f18', padding: 12, gap: 12 },
  mapCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  farmHdr: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, backgroundColor: '#0d1520', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, zIndex: 50, overflow: 'visible' },
  farmNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  farmDot: { width: 10, height: 10, borderRadius: 5 },
  farmName: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  farmPickerBtn: { flexDirection: 'row', alignItems: 'center' },
  farmDropdown: {
    position: 'absolute',
    top: 30,
    left: 0,
    backgroundColor: '#0e1929',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 200,
    zIndex: 300,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  farmDropdownItem: { paddingHorizontal: 16, paddingVertical: 11 },
  farmDropdownItemActive: { backgroundColor: COLORS.accent + '22' },
  farmDropdownText: { color: COLORS.textSecondary, fontSize: 14 },
  farmDropdownTextActive: { color: COLORS.accent, fontWeight: '700' },
  satBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7 },
  satTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  camOverlay: { position: 'absolute', top: 14, left: 14, width: 165, zIndex: 10 },
  camFeed: { height: 105, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#555' },
  liveBadge: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#e74c3c', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, zIndex: 11 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveTxt: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  camLabelBar: { backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 5, paddingHorizontal: 10, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  camLabelTxt: { color: '#fff', fontSize: 11, textAlign: 'center' },

  alertPin: { position: 'absolute', backgroundColor: '#e74c3c', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5, zIndex: 10 },
  alertPinTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  pin: { position: 'absolute', fontSize: 20, zIndex: 8 },
  blueDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#3498db', zIndex: 8 },
  tempBadge: { position: 'absolute', bottom: 14, left: '40%', backgroundColor: 'rgba(0,0,0,0.82)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e67e22', zIndex: 10 },
  tempTxt: { color: '#e67e22', fontSize: 16, fontWeight: 'bold' },

  chartsRow: { flexDirection: 'row', height: 175 },
  chartCard: { paddingTop: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#0d1520', overflow: 'hidden' },
  chartHdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6, gap: 6 },
  chartTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600', flex: 1 },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lDot: { width: 7, height: 7, borderRadius: 4 },
  lTxt: { color: COLORS.textSecondary, fontSize: 10 },
  chartBtns: { flexDirection: 'row', gap: 2 },
  chartBtn: { width: 18, height: 18, borderRadius: 3, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  chartBtnTxt: { color: COLORS.textSecondary, fontSize: 8 },
  axisLbl: { color: COLORS.textSecondary, fontSize: 9 },
  soilBadge: { position: 'absolute', right: 10, bottom: 12, backgroundColor: '#e74c3c', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  soilBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // ─── New chart styles
  chartUnit: { color: COLORS.textSecondary, fontSize: 10 },
  chartCardSoil: { width: 270, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  soilGaugeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8 },
  soilLegend: { flex: 1, gap: 10, marginLeft: 8 },
  soilLegItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  soilLegDot: { width: 10, height: 10, borderRadius: 5 },
  soilLegTxt: { color: COLORS.textSecondary, fontSize: 11 },

  // ─── KPI cards
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0d1520', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  kpiIconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiIcon: { fontSize: 22 },
  kpiValue: { color: COLORS.text, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  kpiLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  kpiSub: { fontSize: 11, fontWeight: '600', marginTop: 3 },

  right: { width: 220, flexShrink: 0, flexGrow: 0, backgroundColor: '#0d1520', borderLeftWidth: 1, borderLeftColor: COLORS.border, padding: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8, backgroundColor: '#131e2e', borderRadius: 9, borderLeftWidth: 3, padding: 9 },
  alertIco: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  alertSub: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  div: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  actTitle: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  actTime: { color: COLORS.textSecondary, fontSize: 9 },

  // ─── Extra page styles ────────────────────────────────────────
  pagePad:  { flex: 1, padding: 24, backgroundColor: '#080f18' },
  pageHdr:  { marginBottom: 20 },
  pageTitle:{ color: COLORS.text, fontSize: 22, fontWeight: '800' },
  pageSub:  { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },

  farmGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  farmGridCard: { width: 280, backgroundColor: '#0d1520', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  farmStatChip: { flex: 1, backgroundColor: '#080f18', borderRadius: 8, padding: 10, alignItems: 'center' },
  farmStatVal:  { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  farmStatLbl:  { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },

  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#0d1520' },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipTxt:    { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterChipTxtActive: { color: '#fff' },

  tableCard:   { backgroundColor: '#0d1520', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0a1422', paddingHorizontal: 16, paddingVertical: 10 },
  tableHd:     { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  tableTd:     { color: COLORS.textSecondary, fontSize: 12 },

  histRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  histTime: { width: 55, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  histDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyIco:   { fontSize: 48, marginBottom: 12 },
  emptyTxt:   { color: COLORS.textSecondary, fontSize: 16 },

  settingsSectionLbl: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },

  // ─── Camera sidebar widget
  camSideCard: { backgroundColor: '#070e19', borderRadius: 10, borderWidth: 1, borderColor: '#1a2a3a', padding: 10, marginTop: 12 },
  camSideLivePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(231,76,60,0.12)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' },
  camSidePreview: { height: 90, borderRadius: 8, backgroundColor: '#020508', borderWidth: 1, borderColor: '#0e1e2e', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  camSideScanGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.8) 3px, rgba(255,255,255,0.8) 4px)' },
  camSideTimestamp: { position: 'absolute', bottom: 5, left: 7 },
  camBracket: { position: 'absolute', width: 10, height: 10, borderColor: 'rgba(46,204,113,0.6)' },

  // ─── Camera page
  camCard: { width: 300, backgroundColor: '#0d1520', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  camThumbWrap: { height: 170, backgroundColor: '#0a1422', position: 'relative' },
  camThumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
  camLivePill: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 3, borderWidth: 1, borderColor: '#e74c3c55' },
  camPlayBtn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 4 },

  // Parcelle map overlays  mapNoGps: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1520cc' },
  mapNoGpsTxt: { color: COLORS.textSecondary, fontSize: 13 },
  parcelleNav: { position: 'absolute', bottom: 14, alignSelf: 'center', left: '50%', transform: [{ translateX: -110 }], width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(13,21,32,0.9)', borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 5, paddingHorizontal: 8 },
  parcelleNavBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#1e2d3d' },
  parcelleNavArrow: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  parcelleNavLabel: { color: COLORS.text, fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'center' },
});
