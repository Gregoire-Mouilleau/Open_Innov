import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { COLORS } from '../../../constants/theme';
import CamEmbed from '../../../components/cameras/CamEmbed';
import CamPulse from '../../../components/cameras/CamPulse';
import { st } from '../styles';

export default function CamerasPage({ cameras = [], selectedCam, setSelectedCam }) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [extra, setExtra]     = React.useState([]); // caméras ajoutées (session, sans backend)
  const [form, setForm]       = React.useState({ nom: '', emplacement: '', url: '' });

  const allCams = [...cameras, ...extra];

  const submit = () => {
    if (!form.nom.trim()) return;
    setExtra(e => [...e, {
      id:       'local-' + Date.now(),
      name:     form.nom.trim(),
      location: form.emplacement.trim() || '—',
      src:      form.url.trim(),
      thumb:    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
      icon:     '🎥',
      status:   'live',
    }]);
    setForm({ nom: '', emplacement: '', url: '' });
    setShowAdd(false);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#080f18' }}>
      {/* Header */}
      <View style={[st.pagePad, { flex: 0, paddingBottom: 0 }]}>
        <View style={st.pageHdr}>
          <Text style={st.pageTitle}>Caméras</Text>
          <Text style={st.pageSub}>{allCams.length} source{allCams.length !== 1 ? 's' : ''} disponible{allCams.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

        {selectedCam ? null : (
        <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {allCams.map(cam => (
              <TouchableOpacity
                key={cam.id}
                style={st.camCard}
                onPress={() => setSelectedCam(cam)}
                activeOpacity={0.85}
              >
                {/* Thumbnail image statique */}
                <View style={st.camThumbWrap}>
                  <Image
                    source={{ uri: cam.thumb }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    resizeMode="cover"
                  />
                  {/* Overlay sombre */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} />
                  <View style={st.camLivePill}>
                    <CamPulse />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>LIVE</Text>
                  </View>
                  <View style={st.camPlayBtn}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                      <Text style={{ color: '#fff', fontSize: 20, marginLeft: 4 }}>▶</Text>
                    </View>
                  </View>
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{cam.icon} {cam.name}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 3 }}>📍 {cam.location}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Carte Ajouter */}
            <TouchableOpacity
              style={[st.camCard, { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', minHeight: 220, backgroundColor: 'transparent' }]}
              onPress={() => setShowAdd(true)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📷</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>Ajouter une caméra</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center', maxWidth: 160 }}>Connectez un flux IoT ou une URL RTSP/HLS</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        )}

      {/* Modal : ajouter une caméra */}
      {showAdd && (
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>📷</Text>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '800', flex: 1 }}>Ajouter une caméra</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={{ color: COLORS.textSecondary, fontSize: 20 }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 16 }}>
              Renseignez le flux. L'intégration IoT temps réel n'est pas encore active.
            </Text>

            <Text style={st.modalLabel}>Nom *</Text>
            <TextInput
              style={st.modalInput}
              placeholder="Ex : Champ Nord — Vue drone"
              placeholderTextColor="#5b6b7d"
              value={form.nom}
              onChangeText={(v) => setForm(f => ({ ...f, nom: v }))}
            />

            <Text style={st.modalLabel}>Emplacement</Text>
            <TextInput
              style={st.modalInput}
              placeholder="Ex : Parcelle Nord"
              placeholderTextColor="#5b6b7d"
              value={form.emplacement}
              onChangeText={(v) => setForm(f => ({ ...f, emplacement: v }))}
            />

            <Text style={st.modalLabel}>URL du flux (RTSP / HLS / embed)</Text>
            <TextInput
              style={st.modalInput}
              placeholder="rtsp://… ou https://…"
              placeholderTextColor="#5b6b7d"
              value={form.url}
              onChangeText={(v) => setForm(f => ({ ...f, url: v }))}
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[st.modalBtn, st.modalBtnCancel]} onPress={() => setShowAdd(false)}>
                <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalBtn, st.modalBtnOk, !form.nom.trim() && { opacity: 0.5 }]} onPress={submit} disabled={!form.nom.trim()}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
