import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const SYSTEMS_FALLBACK = [
  { id: 'temp',     icon: '🌡️', value: '—', unit: '°C',   arrow: '—', aC: '#e67e22', bg: '#2a1500', bc: '#e67e22' },
  { id: 'humidity', icon: '💧',  value: '—', unit: '% HR', arrow: '—', aC: '#3498db', bg: '#001529', bc: '#3498db' },
  { id: 'soil',     icon: '🌱',  value: '—', unit: '% HR', arrow: '—', aC: '#27ae60', bg: '#0a2010', bc: '#27ae60' },
];

// ─── Navbar ───────────────────────────────────────────────────

function Navbar({ tab, setTab, user, onLogin, onLogout, onSettings, onCompany }) {
  const [showMenu, setShowMenu] = useState(false);
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
          {user ? (
            <TouchableOpacity
              style={[st.userBtn, showMenu && st.userBtnActive]}
              onPress={() => setShowMenu(v => !v)}
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

      {/* Overlay transparent pour fermer le menu */}
      {showMenu && (
        <TouchableOpacity
          style={st.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
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

// ─── Left panel ───────────────────────────────────────────────

function LeftPanel({ systems, loading }) {
  const items = systems?.length ? systems : SYSTEMS_FALLBACK;
  return (
    <View style={st.left}>
      <Text style={st.secLabel}>{t('left.systems')}</Text>
      {items.map(sys => (
        <View key={sys.id} style={[st.sysCard, { backgroundColor: sys.bg, borderColor: sys.bc }]}>
          <Text style={{ fontSize: 20 }}>{sys.icon}</Text>
          {loading
            ? <ActivityIndicator size="small" color={sys.bc} style={{ flex: 1 }} />
            : <Text style={[st.sysVal, { color: sys.bc }]}>
                {sys.value}<Text style={st.sysUnit}> {sys.unit}</Text>
              </Text>
          }
          <Text style={[st.sysArrow, { color: sys.aC }]}>{sys.arrow}</Text>
        </View>
      ))}
      <View style={st.iotCard}>
        <View style={st.iotIco}><Text style={{ fontSize: 16 }}>🛰</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.iotTitle}>{t('left.lastAnalysis')}</Text>
          <Text style={st.iotTime}>{t('left.today')}</Text>
        </View>
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

// ─── Area charts ──────────────────────────────────────────────

const CHART_H = 58;

function TwoAreaChart({ d1, c1, d2, c2 }) {
  return (
    <View style={{ height: CHART_H, position: 'relative', marginHorizontal: 12 }}>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end', gap: 1 }]}>
        {d2.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(v * CHART_H, 3) }}>
            <LinearGradient colors={[c2 + 'cc', c2 + '22']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </View>
        ))}
      </View>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end', gap: 1 }]}>
        {d1.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(v * CHART_H, 3) }}>
            <LinearGradient colors={[c1 + 'cc', c1 + '22']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </View>
        ))}
      </View>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end' }]}>
        {d1.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', height: Math.max(v * CHART_H, 5) }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c1, position: 'absolute', top: 0 }} />
          </View>
        ))}
      </View>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end' }]}>
        {d2.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', height: Math.max(v * CHART_H, 5) }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c2, position: 'absolute', top: 0 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function AreaChart({ curve, color, valueBadge }) {
  return (
    <View style={{ height: CHART_H, position: 'relative', marginHorizontal: 12 }}>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end', gap: 1 }]}>
        {curve.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(v * CHART_H, 3) }}>
            <LinearGradient colors={[color + 'dd', color + '22']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
          </View>
        ))}
      </View>
      <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row', alignItems: 'flex-end' }]}>
        {curve.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', height: Math.max(v * CHART_H, 5) }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, position: 'absolute', top: 0 }} />
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', top: '72%', left: 0, right: 0, height: 1, backgroundColor: '#f1c40f55' }} />
      {valueBadge && valueBadge !== '—' && (
        <View style={st.soilBadge}>
          <Text style={st.soilBadgeTxt}>{valueBadge}%</Text>
        </View>
      )}
    </View>
  );
}

function AxisLbls({ labels }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 5 }}>
      {labels.map((l, i) => <Text key={i} style={st.axisLbl}>{l}</Text>)}
    </View>
  );
}

// ─── Charts row ───────────────────────────────────────────────

function ChartsRow({ tempCurve, humidCurve, soilCurve, chartLabels, systems }) {
  const tCurve = tempCurve?.length  ? tempCurve  : [0.5];
  const hCurve = humidCurve?.length ? humidCurve : [0.5];
  const sCurve = soilCurve?.length  ? soilCurve  : [0.5];
  const labels = chartLabels?.length ? chartLabels : ['—'];
  const soilVal = systems?.find(s => s.id === 'soil')?.value;
  return (
    <View style={st.chartsRow}>
      <View style={[st.chartCard, { flex: 1 }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>{t('charts.tempHumidity')}</Text>
          <View style={st.chartLegend}>
            <View style={[st.lDot, { backgroundColor: '#e67e22' }]} />
            <Text style={st.lTxt}>{t('charts.temp')}</Text>
            <View style={[st.lDot, { backgroundColor: '#3498db', marginLeft: 6 }]} />
            <Text style={st.lTxt}>{t('charts.humidity')}</Text>
          </View>
        </View>
        <TwoAreaChart d1={tCurve} c1="#e67e22" d2={hCurve} c2="#3498db" />
        <AxisLbls labels={labels} />
      </View>

      <View style={[st.chartCard, { flex: 1, borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>{t('charts.soilHumidity')}</Text>
        </View>
        <AreaChart curve={sCurve} color="#27ae60" valueBadge={soilVal} />
        <AxisLbls labels={labels} />
      </View>
    </View>
  );
}

// ─── Center column ────────────────────────────────────────────

function CenterCol({ farmName, farmsList, selectedFarmId, selectFarm, parcellesList, tempCurve, humidCurve, soilCurve, chartLabels, systems }) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewMode, setViewMode]     = useState('satellite');
  return (
    <View style={st.center}>
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
      <ChartsRow tempCurve={tempCurve} humidCurve={humidCurve} soilCurve={soilCurve} chartLabels={chartLabels} systems={systems} />
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────

export default function DashboardDesktopScreen({ navigation }) {
  const [tab, setTab] = useState(t('nav.dashboard'));
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
        <LeftPanel systems={data.systems} loading={loading} />
        <CenterCol
          farmName={data.farmName}
          farmsList={data.farmsList}
          selectedFarmId={selectedFarmId}
          selectFarm={selectFarm}
          parcellesList={data.parcellesList ?? []}
          tempCurve={data.tempCurve}
          humidCurve={data.humidCurve}
          soilCurve={data.soilCurve}
          chartLabels={data.chartLabels}
          systems={data.systems}
        />
        <RightPanel alertesList={data.alertes} activities={data.activities} />
      </View>
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

  left: { width: 160, flexShrink: 0, flexGrow: 0, backgroundColor: '#0d1520', borderRightWidth: 1, borderRightColor: COLORS.border, padding: 10, gap: 8 },
  secLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sysCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  sysVal: { flex: 1, fontSize: 20, fontWeight: 'bold' },
  sysUnit: { fontSize: 12, fontWeight: 'normal', color: COLORS.textSecondary },
  sysArrow: { fontSize: 18, fontWeight: 'bold' },
  iotCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a2535', borderRadius: 10, padding: 12, marginTop: 2 },
  iotIco: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#243047', alignItems: 'center', justifyContent: 'center' },
  iotTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  iotTime: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

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

  chartsRow: { height: 260, flexDirection: 'row', backgroundColor: 'transparent', gap: 12 },
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

  right: { width: 220, flexShrink: 0, flexGrow: 0, backgroundColor: '#0d1520', borderLeftWidth: 1, borderLeftColor: COLORS.border, padding: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8, backgroundColor: '#131e2e', borderRadius: 9, borderLeftWidth: 3, padding: 9 },
  alertIco: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  alertSub: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  div: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  actTitle: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  actTime: { color: COLORS.textSecondary, fontSize: 9 },

  // Parcelle map overlays
  mapNoGps: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1520cc' },
  mapNoGpsTxt: { color: COLORS.textSecondary, fontSize: 13 },
  parcelleNav: { position: 'absolute', bottom: 14, alignSelf: 'center', left: '50%', transform: [{ translateX: -110 }], width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(13,21,32,0.9)', borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 5, paddingHorizontal: 8 },
  parcelleNavBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#1e2d3d' },
  parcelleNavArrow: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  parcelleNavLabel: { color: COLORS.text, fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'center' },
});
