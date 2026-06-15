import React from 'react';
import { View, Text, Platform } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function CamEmbed({ src }) {
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
