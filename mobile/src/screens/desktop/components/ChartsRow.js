import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../../constants/theme';
import SvgLineChart from '../../../components/charts/SvgLineChart';
import SvgDonut from '../../../components/charts/SvgDonut';
import { sampleTicks, niceScale } from '../../../utils/format';
import { st } from '../styles';

export default function ChartsRow({ systems, tempCurve = [], humidCurve = [], chartLabels = [] }) {
  const rawSoil = systems?.find(s => s.id === 'soil')?.value;
  const soilVal = rawSoil && rawSoil !== '—' ? Math.round(parseFloat(rawSoil)) : 0;
  const xTicks  = sampleTicks(chartLabels);
  // Échelles adaptatives : on zoome sur la plage réelle pour voir les fluctuations.
  const tempScale  = niceScale(tempCurve,  { clampMin: -30, clampMax: 60,  minSpan: 4 });
  const humidScale = niceScale(humidCurve, { clampMin: 0,   clampMax: 100, minSpan: 6 });
  return (
    <View style={st.chartsRow}>
      {/* Température 24h */}
      <View style={[st.chartCard, { flex: 1 }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>Température (24h)</Text>
          <Text style={st.chartUnit}>°C</Text>
        </View>
        <SvgLineChart data={tempCurve} color="#e67e22" yMin={tempScale.yMin} yMax={tempScale.yMax} yTicks={tempScale.yTicks} xTicks={xTicks} unit="°C" dataLabels={chartLabels} />
      </View>

      {/* Humidité 24h */}
      <View style={[st.chartCard, { flex: 1, borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
        <View style={st.chartHdr}>
          <Text style={st.chartTitle}>Humidité (24h)</Text>
          <Text style={st.chartUnit}>%</Text>
        </View>
        <SvgLineChart data={humidCurve} color="#3498db" yMin={humidScale.yMin} yMax={humidScale.yMax} yTicks={humidScale.yTicks} xTicks={xTicks} unit="%" dataLabels={chartLabels} />
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
