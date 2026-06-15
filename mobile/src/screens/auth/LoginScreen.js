import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { auth } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const { show } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      show('Email et mot de passe requis', 'warning');
      return;
    }
    setLoading(true);
    try {
      await auth.login(email.trim().toLowerCase(), password);
      navigation.replace('App');
    } catch (err) {
      show(err?.message ?? 'Identifiants invalides', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={st.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand */}
        <View style={st.brand}>
          <View style={st.brandIcon}><Text style={{ fontSize: 32 }}>🌿</Text></View>
          <Text style={st.brandName}>TechFarm</Text>
          <Text style={st.brandSub}>Plateforme de monitoring agricole</Text>
        </View>

        {/* Card */}
        <View style={st.card}>
          <Text style={st.title}>Connexion</Text>

          <View style={st.field}>
            <Text style={st.label}>Email</Text>
            <TextInput
              style={st.input}
              placeholder="vous@exemple.com"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <View style={st.field}>
            <Text style={st.label}>Mot de passe</Text>
            <View style={st.inputWrap}>
              <TextInput
                style={[st.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={st.eyeBtn}>
                <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[st.btn, loading && st.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={st.btnTxt}>Se connecter</Text>
            }
          </TouchableOpacity>

          <View style={st.divider}>
            <View style={st.divLine} />
            <Text style={st.divTxt}>ou</Text>
            <View style={st.divLine} />
          </View>

          <TouchableOpacity
            style={st.btnSecondary}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={st.btnSecondaryTxt}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  brand:     { alignItems: 'center', marginBottom: 36 },
  brandIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1a3a1a', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brandName: { color: COLORS.text, fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  brandSub:  { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },

  card:  { width: '100%', maxWidth: 420, backgroundColor: COLORS.surface, borderRadius: 14, padding: 28, borderWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 24 },

  field: { marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center',
  },

  btn:         { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnTxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divTxt:  { color: COLORS.textSecondary, marginHorizontal: 12, fontSize: 12 },

  btnSecondary:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryTxt: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
