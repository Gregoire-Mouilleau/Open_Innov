import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { t } from '../../../i18n';
import KpiCards from './KpiCards';
import ChartsRow from './ChartsRow';
import ParcelleMapView from './ParcelleMapView';
import { st } from '../styles';

export default function CenterCol({ farmName, farmsList, selectedFarmId, selectFarm, parcellesList, systems, sensors, parcelleStatus, alertes, nbCapteurs, cropHealth, tempCurve, humidCurve, chartLabels }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View style={st.center}>
      <KpiCards farmsList={farmsList} alertesList={alertes} nbCapteurs={nbCapteurs} cropHealth={cropHealth} />
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
      </View>
      <View style={st.mapCard}>
        <ParcelleMapView
          parcellesList={parcellesList}
          systems={systems}
          sensors={sensors}
          parcelleStatus={parcelleStatus}
          selectedFarmId={selectedFarmId}
        />
      </View>
      <ChartsRow systems={systems} tempCurve={tempCurve} humidCurve={humidCurve} chartLabels={chartLabels} />
    </View>
  );
}
