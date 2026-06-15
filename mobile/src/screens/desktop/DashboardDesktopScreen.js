import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';
import useDashboardData from '../../hooks/useDashboardData';
import useAuth from '../../hooks/useAuth';
import CamEmbed from '../../components/cameras/CamEmbed';
import CamPulse from '../../components/cameras/CamPulse';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import CenterCol from './components/CenterCol';
import RightPanel from './components/RightPanel';
import AlertDetailModal from './components/AlertDetailModal';
import CamerasPage from './pages/CamerasPage';
import FermesPage from './pages/FermesPage';
import ParcellesPage from './pages/ParcellesPage';
import CapteursPge from './pages/CapteursPage';
import AlertesPge from './pages/AlertesPage';
import RapportsPge from './pages/RapportsPage';
import HistoriquePge from './pages/HistoriquePage';
import { st } from './styles';

export default function DashboardDesktopScreen({ navigation }) {
  const [activeKey, setActiveKey] = useState('overview');
  const [selectedCam, setSelectedCam] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { data, loading, selectedFarmId, selectFarm, markAlertRead } = useDashboardData();
  const { user, logout } = useAuth(navigation);

  // Ouvre le détail d'une alerte et la passe en "lue" si elle ne l'était pas.
  const openAlert = (a) => {
    setSelectedAlert(a.lu ? a : { ...a, lu: true });
    if (!a.lu) markAlertRead(a.id);
  };

  return (
    <View style={st.root}>
      <Navbar
        activeKey={activeKey}
        setActiveKey={setActiveKey}
        user={user}
        onLogin={() => navigation?.navigate('Auth')}
        onLogout={logout}
        onSettings={() => navigation?.navigate('AccountSettings')}
        onCompany={() => navigation?.navigate('Company')}
      />
      <View style={st.body}>
        <LeftPanel systems={data.systems} wind={data.wind} cameras={data.cameras} loading={loading} activeKey={activeKey} setActiveKey={setActiveKey} />
        {activeKey === 'overview' && (
          <>
            <CenterCol
              farmName={data.farmName}
              farmsList={data.farmsList}
              selectedFarmId={selectedFarmId}
              selectFarm={selectFarm}
              parcellesList={data.parcellesList ?? []}
              systems={data.systems}
              sensors={data.sensors}
              parcelleStatus={data.parcelleStatus}
              alertes={data.alertes}
              nbCapteurs={data.nbCapteurs}
              cropHealth={data.cropHealth}
              tempCurve={data.tempCurve}
              humidCurve={data.humidCurve}
              chartLabels={data.chartLabels}
            />
            <RightPanel alertesList={data.alertes} activities={data.activities} onSelectAlert={openAlert} />
          </>
        )}
        {activeKey === 'farms'    && <FermesPage    farmsList={data.farmsList} />}
        {activeKey === 'parcelles'&& <ParcellesPage parcelleStatus={data.parcelleStatus} />}
        {activeKey === 'sensors'  && <CapteursPge   systems={data.systems} />}
        {activeKey === 'alertes'  && <AlertesPge    alertesList={data.alertes} onSelectAlert={openAlert} />}
        {activeKey === 'reports'  && <RapportsPge   systems={data.systems} tempCurve={data.tempCurve} humidCurve={data.humidCurve} soilCurve={data.soilCurve} chartLabels={data.chartLabels} alertesList={data.alertes} />}
        {activeKey === 'history'  && <HistoriquePge alertesList={data.alertes} />}
        {activeKey === 'cameras'  && <CamerasPage cameras={data.cameras} selectedCam={selectedCam} setSelectedCam={setSelectedCam} />}
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

      {/* Détail d'une alerte — overlay racine */}
      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </View>
  );
}
