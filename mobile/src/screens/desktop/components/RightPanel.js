import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { t } from '../../../i18n';
import { st } from '../styles';

export default function RightPanel({ alertesList, activities, onSelectAlert }) {
  return (
    <ScrollView style={st.right} showsVerticalScrollIndicator={false}>
      <Text style={st.secLabel}>{t('alerts.title')}</Text>
      {alertesList.length === 0
        ? <Text style={[st.alertSub, { marginLeft: 8 }]}>Aucune alerte récente</Text>
        : alertesList.slice(0, 6).map(a => (
          <TouchableOpacity key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]} onPress={() => onSelectAlert?.(a)} activeOpacity={0.75}>
            <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 32, height: 32, borderRadius: 16 }]}>
              <Text style={{ color: a.color, fontSize: 15 }}>{a.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.alertTitle}>{a.title}</Text>
              <Text style={st.alertSub}>{a.sub}</Text>
            </View>
          </TouchableOpacity>
        ))
      }
      <View style={st.div} />
      <Text style={st.secLabel}>{t('alerts.activities')}</Text>
      {activities.map(a => (
        <TouchableOpacity key={a.id} style={[st.alertCard, { borderLeftColor: a.color }]} onPress={() => onSelectAlert?.(a)} activeOpacity={0.75}>
          <View style={[st.alertIco, { backgroundColor: a.color + '33', width: 30, height: 30, borderRadius: 15 }]}>
            <Text style={{ fontSize: 14 }}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.actTitle}>{a.title}</Text>
            <Text style={st.alertSub}>{a.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
