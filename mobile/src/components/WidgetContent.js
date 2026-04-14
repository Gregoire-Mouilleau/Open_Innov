import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, WIDGET_IDS } from '../constants/theme';

function CameraLiveWidget() {
  return (
    <View style={styles.cameraContainer}>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Text style={styles.noSignal}>📷</Text>
    </View>
  ); 
}

function CameraIAWidget() { t
  return (
    <View style={styles.cameraContainer}>
      <View style={[styles.liveBadge, { backgroundColor: '#8e44ad' }]}>
        <Text style={styles.liveText}>IA</Text>
      </View>
      <Text style={styles.noSignal}>🤖</Text>
      <View style={styles.iaBorder} />
    </View>
  );
}

function MapWidget() {
  return (
    <View style={styles.mapContainer}>
      <Text style={styles.mapIcon}>🗺️</Text>
      <View style={styles.mapPin1}><Text style={styles.pinText}>📍</Text></View>
      <View style={styles.mapPin2}><Text style={styles.pinText}>📍</Text></View>
      <View style={styles.mapPin3}><Text style={styles.pinText}>📍</Text></View>
    </View>
  );
}

function TemperatureWidget() {
  return (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorIcon}>🌡️</Text>
      <Text style={styles.sensorValue}>22° C</Text>
    </View>
  );
}

function HumidityWidget() {
  return (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorIcon}>💧</Text>
      <Text style={styles.sensorValue}>68 % HR</Text>
    </View>
  );
}

function LuminosityWidget() {
  return (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorIcon}>☀️</Text>
      <Text style={styles.sensorValue}>742 Lux</Text>
    </View>
  );
}

function DiseasesWidget() {
  return (
    <View style={[styles.cameraContainer, { backgroundColor: '#1e3a2f' }]}>
      <Text style={styles.noSignal}>🌿➕</Text>
      <View style={styles.alertBadge}>
        <Text style={styles.alertText}>⚠️ Détectée</Text>
      </View>
    </View>
  );
}

export function WidgetContent({ widgetId }) {
  switch (widgetId) {
    case WIDGET_IDS.CAMERA_LIVE: return <CameraLiveWidget />;
    case WIDGET_IDS.CAMERA_IA: return <CameraIAWidget />;
    case WIDGET_IDS.MAP: return <MapWidget />;
    case WIDGET_IDS.TEMPERATURE: return <TemperatureWidget />;
    case WIDGET_IDS.HUMIDITY: return <HumidityWidget />;
    case WIDGET_IDS.LUMINOSITY: return <LuminosityWidget />;
    case WIDGET_IDS.DISEASES: return <DiseasesWidget />;
    default: return null;
  }
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 3,
  },
  liveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  noSignal: {
    fontSize: 36,
    opacity: 0.5,
  },
  iaBorder: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 4,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapIcon: { fontSize: 48, opacity: 0.7 },
  mapPin1: { position: 'absolute', top: '20%', left: '25%' },
  mapPin2: { position: 'absolute', top: '35%', left: '55%' },
  mapPin3: { position: 'absolute', top: '60%', left: '40%' },
  pinText: { fontSize: 18 },
  sensorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sensorIcon: { fontSize: 32 },
  sensorValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertBadge: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: 'rgba(231,76,60,0.85)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
