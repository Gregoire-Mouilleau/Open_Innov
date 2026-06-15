/**
 * DEV ONLY — panneau de test des toasts & erreurs API
 * Supprimer ce fichier et son import avant la démo/prod
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useToast } from '../../context/ToastContext';
import { ApiError, ErrorType } from '../../services/api';

export default function DevToastTester() {
  const { show, showApiError } = useToast();

  const tests = [
    {
      label: '✓ Succès',
      color: '#1e8449',
      fn: () => show('Parcelle sauvegardée avec succès', 'success'),
    },
    {
      label: 'ℹ Info',
      color: '#2471a3',
      fn: () => show('12 nouvelles mesures disponibles', 'info'),
    },
    {
      label: '⚠ Warning',
      color: '#d35400',
      fn: () => show('Session expirée — reconnectez-vous', 'warning'),
    },
    {
      label: '✕ Erreur',
      color: '#c0392b',
      fn: () => show('Impossible de charger les parcelles', 'error'),
    },
    {
      label: '🌐 Réseau',
      color: '#7d3c98',
      fn: () => showApiError(new ApiError(ErrorType.NETWORK, '', null)),
    },
    {
      label: '⏱ Timeout',
      color: '#784212',
      fn: () => showApiError(new ApiError(ErrorType.TIMEOUT, '', null)),
    },
    {
      label: '🔒 401',
      color: '#922b21',
      fn: () => showApiError(new ApiError(ErrorType.UNAUTHORIZED, '', 401)),
    },
    {
      label: '🔥 500',
      color: '#641e16',
      fn: () => showApiError(new ApiError(ErrorType.SERVER, '', 500)),
    },
  ];

  return (
    <View style={st.panel}>
      <Text style={st.title}>DEV — Test Toasts</Text>
      <View style={st.grid}>
        {tests.map((t) => (
          <TouchableOpacity key={t.label} style={[st.btn, { backgroundColor: t.color }]} onPress={t.fn}>
            <Text style={st.btnTxt}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
    zIndex: 1000,
  },
  title: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 340,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  btnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
