import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/theme';
import SvgLineChart from '../../../components/charts/SvgLineChart';
import { sampleTicks } from '../../../utils/format';
import { st } from '../styles';

export default function RapportsPge({ systems, tempCurve = [], humidCurve = [], soilCurve = [], chartLabels = [], alertesList = [] }) {
  const soil = systems?.find(s => s.id === 'soil');
  const soilTxt = soil && soil.value !== '—' ? Math.round(parseFloat(soil.value)) + '%' : '—';

  // Moyennes calculées sur les courbes 24h réelles.
  const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const tempMoy = avg(tempCurve);
  const humMoy  = avg(humidCurve);
  const xTicks  = sampleTicks(chartLabels);

  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Rapports</Text>
        <Text style={st.pageSub}>Données des dernières 24h</Text>
      </View>
      <View style={[st.kpiRow, { marginBottom: 16 }]}>
        {[
          { label: 'Temp. moy.', value: tempMoy != null ? tempMoy.toFixed(1) + '°C' : '—', icon: '🌡', bg: '#2a1500', iconC: '#e67e22' },
          { label: 'Hum. moy.',  value: humMoy  != null ? humMoy.toFixed(1) + '%'  : '—', icon: '💧', bg: '#001529', iconC: '#3498db' },
          { label: 'Hum. sol',   value: soilTxt, icon: '🌱', bg: '#0a2010', iconC: '#27ae60' },
          { label: 'Alertes 24h', value: String(alertesList?.length ?? 0), icon: '◇', bg: '#2a1000', iconC: '#e74c3c' },
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
        <SvgLineChart data={tempCurve} color="#e67e22" yMin={0} yMax={35} yTicks={[0,10,20,30]} xTicks={xTicks} unit="°C" dataLabels={chartLabels} />
      </View>
      <View style={[st.tableCard, { padding: 16, marginBottom: 14 }]}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Humidité Air (24h)</Text>
        <SvgLineChart data={humidCurve} color="#3498db" yMin={0} yMax={100} yTicks={[0,25,50,75,100]} xTicks={xTicks} unit="%" dataLabels={chartLabels} />
      </View>
      <View style={[st.tableCard, { padding: 16, marginBottom: 14 }]}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Humidité Sol (24h)</Text>
        <SvgLineChart data={soilCurve} color="#27ae60" yMin={0} yMax={100} yTicks={[0,25,50,75,100]} xTicks={xTicks} unit="%" dataLabels={chartLabels} />
      </View>
    </ScrollView>
  );
}
