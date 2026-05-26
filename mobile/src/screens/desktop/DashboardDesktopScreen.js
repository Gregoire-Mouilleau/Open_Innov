import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import { t } from '../../i18n';

// ─── Data ─────────────────────────────────────────────────────

const SYSTEMS = [
  { id: 'temp',     icon: '🌡️', value: '23,5', unit: '°C',   arrow: '↓', aC: '#e67e22', bg: '#2a1500', bc: '#e67e22' },
  { id: 'humidity', icon: '💧',  value: '68',   unit: '% HR', arrow: '—', aC: '#3498db', bg: '#001529', bc: '#3498db' },
  { id: 'soil',     icon: '🌱',  value: '27',   unit: '% HR', arrow: '↑', aC: '#27ae60', bg: '#0a2010', bc: '#27ae60' },
];

const ALERTS = [
  { id: 1, color: '#e74c3c', icon: '⚠️', title: 'Humidité du sol basse',    sub: "aujourd'hui à 15:24" },
  { id: 2, color: '#f39c12', icon: '🌤', title: 'Température élevée',       sub: 'Grand champ à 3 déc.' },
  { id: 3, color: '#2ecc71', icon: '✚',  title: 'Maladie détectée',         sub: 'Parcelle en bonne santé' },
];

const ACTIVITIES = [
  { id: 1, color: '#e67e22', icon: '🌡️', title: 'Température a atteint 34°C', loc: 'Parcelle Clos Gervenue',  time: '10:11s' },
  { id: 2, color: '#e74c3c', icon: '💧',  title: 'Humidité du sol basse',       loc: 'Grand Plateau Terature', time: '2 min'  },
  { id: 3, color: '#2ecc71', icon: '🌿',  title: 'Maladie détectée',             loc: 'Planddis du possage',    time: '3 séc'  },
];

const TEMP_CURVE  = [0.26, 0.36, 0.50, 0.62, 0.68, 0.64, 0.58, 0.54, 0.58, 0.56];
const HUMID_CURVE = [0.50, 0.46, 0.42, 0.48, 0.58, 0.54, 0.56, 0.50, 0.46, 0.50];
const SOIL_CURVE  = [1.00, 0.92, 0.82, 0.71, 0.65, 0.55, 0.43, 0.35, 0.27];
const T_LABELS    = ['10:00', '5:36', '12:8', '13:1', '0:00', '6:06'];
const S_LABELS    = ['MO9', 'IO6', 'AO7', 'S:09', '7:99', 'S7'];

// ─── Navbar ───────────────────────────────────────────────────

function Navbar({ tab, setTab }) {
  const tabs = [
    { key: 'dashboard', label: t('nav.dashboard') },
    { key: 'reports',   label: t('nav.reports') },
    { key: 'history',   label: t('nav.history') },
  ];
  return (
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
        <View style={st.avatarGuest}>
          <Text style={{ color: '#aaa', fontSize: 16 }}>👤</Text>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Text style={st.navGuestLabel}>{t('nav.notConnected')}</Text>
        </View>
        <TouchableOpacity style={st.loginBtn}>
          <Text style={st.loginBtnTxt}>{t('nav.login')}</Text>
        </TouchableOpacity>
        <View style={st.navDiv} />
        <Text style={{ fontSize: 17 }}>⚙</Text>
      </View>
    </View>
  );
}

// ─── Left panel ───────────────────────────────────────────────

function LeftPanel() {
  return (
    <View style={st.left}>
      <Text style={st.secLabel}>{t('left.systems')}</Text>
      {SYSTEMS.map(sys => (
        <View key={sys.id} style={[st.sysCard, { backgroundColor: sys.bg, borderColor: sys.bc }]}>
          <Text style={{ fontSize: 20 }}>{sys.icon}</Text>
          <Text style={[st.sysVal, { color: sys.bc }]}>
            {sys.value}<Text style={st.sysUnit}> {sys.unit}</Text>
          </Text>
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

function RightPanel() {
  return (
    <ScrollView style={st.right} showsVerticalScrollIndicator={false}>
      <Text style={st.secLabel}>{t('alerts.title')}</Text>
      {ALERTS.map(a => (
        <View key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]}>
          <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 32, height: 32, borderRadius: 16 }]}>
            <Text style={{ color: a.color, fontSize: 15 }}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.alertTitle}>{a.title}</Text>
            <Text style={st.alertSub}>{a.sub}</Text>
          </View>
        </View>
      ))}
      <View style={st.div} />
      <Text style={st.secLabel}>{t('alerts.activities')}</Text>
      {ACTIVITIES.map(a => (
        <View key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]}>
          <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 30, height: 30, borderRadius: 15 }]}>
            <Text style={{ fontSize: 14 }}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.actTitle}>{a.title}</Text>
            <Text style={st.alertSub}>{a.loc}</Text>
          </View>
          <Text style={st.actTime}>{a.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Farm map ─────────────────────────────────────────────────

function FarmMap() {
  return (
    <ImageBackground
      source={require('../../../assets/fond_farm.png')}
      style={{ flex: 1, width: '100%', position: 'relative' }}
      imageStyle={{ resizeMode: 'cover' }}
    >
      {/* Camera overlay */}
      <View style={st.camOverlay}>
        <ImageBackground
          source={require('../../../assets/fond_camera.png')}
          style={st.camFeed}
          imageStyle={{ resizeMode: 'cover', borderRadius: 10 }}
        >
          <View style={{ flex: 1 }} />
        </ImageBackground>
        <View style={st.liveBadge}>
          <View style={st.liveDot} />
          <Text style={st.liveTxt}>{t('widgetContent.live')}</Text>
        </View>
        <View style={st.camLabelBar}>
          <Text style={st.camLabelTxt}>{t('map.cameraLive')}</Text>
        </View>
      </View>

      {/* Alert pin */}
      <View style={[st.alertPin, { top: '45%', left: '30%' }]}>
        <Text style={st.alertPinTxt}>{t('map.alertHumidity')}</Text>
      </View>

      {/* Map pins */}
      <Text style={[st.pin, { top: '18%', left: '53%' }]}>📍</Text>
      <Text style={[st.pin, { top: '52%', left: '64%' }]}>📍</Text>
      <View style={[st.blueDot, { top: '67%', left: '26%' }]} />

      {/* Temperature badge */}
      <View style={st.tempBadge}>
        <Text style={st.tempTxt}>{t('map.temperature')}</Text>
      </View>
    </ImageBackground>
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

function AreaChart({ curve, color }) {
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
      <View style={st.soilBadge}>
        <Text style={st.soilBadgeTxt}>27%</Text>
      </View>
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

function ChartsRow() {
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
          <View style={st.chartBtns}>
            <TouchableOpacity style={st.chartBtn}><Text style={st.chartBtnTxt}>▲</Text></TouchableOpacity>
            <TouchableOpacity style={st.chartBtn}><Text style={st.chartBtnTxt}>▼</Text></TouchableOpacity>
          </View>
        </View>
        <TwoAreaChart d1={TEMP_CURVE} c1="#e67e22" d2={HUMID_CURVE} c2="#3498db" />
        <AxisLbls labels={T_LABELS} />
      </View>

      <View style={[st.chartCard, { flex: 1, borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>{t('charts.soilHumidity')}</Text>
          <View style={st.chartBtns}>
            <TouchableOpacity style={st.chartBtn}><Text style={st.chartBtnTxt}>▲</Text></TouchableOpacity>
            <TouchableOpacity style={st.chartBtn}><Text style={st.chartBtnTxt}>▼</Text></TouchableOpacity>
          </View>
        </View>
        <AreaChart curve={SOIL_CURVE} color="#27ae60" />
        <AxisLbls labels={S_LABELS} />
      </View>
    </View>
  );
}

// ─── Center column ────────────────────────────────────────────

function CenterCol() {
  return (
    <View style={st.center}>
      <View style={st.mapCard}>
        <View style={st.farmHdr}>
          <View style={st.farmNameRow}>
            <View style={[st.farmDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={st.farmName}>{t('map.farmName')}</Text>
          </View>
          <TouchableOpacity style={st.satBtn}>
            <Text style={st.satTxt}>🛰  {t('map.satellite')}</Text>
          </TouchableOpacity>
        </View>
        <FarmMap />
      </View>
      <ChartsRow />
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────

export default function DashboardDesktopScreen() {
  const [tab, setTab] = useState(t('nav.dashboard'));
  return (
    <View style={st.root}>
      <Navbar tab={tab} setTab={setTab} />
      <View style={st.body}>
        <LeftPanel />
        <CenterCol />
        <RightPanel />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column', backgroundColor: COLORS.background },

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
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 240, justifyContent: 'flex-end' },
  avatarGuest: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334' },
  navGuestLabel: { color: COLORS.textSecondary, fontSize: 12 },
  loginBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  loginBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  navDiv: { width: 1, height: 20, backgroundColor: COLORS.border },

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
  farmHdr: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, backgroundColor: '#0d1520', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  farmNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  farmDot: { width: 10, height: 10, borderRadius: 5 },
  farmName: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
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
});
