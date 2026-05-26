import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { auth } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RegisterScreen({ navigation }) {
  const [loading,   setLoading]   = useState(false);
  const { show } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) { show('Prénom et nom requis', 'warning'); return; }
    if (!email.trim())                          { show('Email requis', 'warning'); return; }
    if (password.length < 6)                    { show('Mot de passe : 6 caractères minimum', 'warning'); return; }
    if (password !== confirm)                   { show('Les mots de passe ne correspondent pas', 'warning'); return; }

    setLoading(true);
    try {
      await auth.register({
        email:      email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
      });
      navigation.replace('App');
    } catch (err) {
      show(err?.message ?? 'Erreur lors de la création du compte', 'error');
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
        {/* Brand */}
        <View style={st.brand}>
          <View style={st.brandIcon}><Text style={{ fontSize: 28 }}>🌿</Text></View>
          <Text style={st.brandName}>TechFarm</Text>
        </View>

        <View style={st.card}>
          <Text style={st.title}>Créer un compte</Text>

          <View style={st.row}>
            <View style={[st.field, { flex: 1, marginRight: 8 }]}>
              <Text style={st.label}>Prénom</Text>
              <TextInput style={st.input} placeholder="Jean" placeholderTextColor={COLORS.textSecondary}
                value={firstName} onChangeText={setFirstName} editable={!loading} />
            </View>
            <View style={[st.field, { flex: 1 }]}>
              <Text style={st.label}>Nom</Text>
              <TextInput style={st.input} placeholder="Dupont" placeholderTextColor={COLORS.textSecondary}
                value={lastName} onChangeText={setLastName} editable={!loading} />
            </View>
          </View>

          <View style={st.field}>
            <Text style={st.label}>Email</Text>
            <TextInput style={st.input} placeholder="jean@ferme.fr" placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none" keyboardType="email-address"
              value={email} onChangeText={setEmail} editable={!loading} />
          </View>

          <View style={st.field}>
            <Text style={st.label}>Mot de passe</Text>
            <TextInput style={st.input} placeholder="••••••••" placeholderTextColor={COLORS.textSecondary}
              secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />
          </View>

          <View style={st.field}>
            <Text style={st.label}>Confirmer le mot de passe</Text>
            <TextInput style={st.input} placeholder="••••••••" placeholderTextColor={COLORS.textSecondary}
              secureTextEntry value={confirm} onChangeText={setConfirm} editable={!loading} />
          </View>

          <TouchableOpacity
            style={[st.btn, loading && st.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={st.btnTxt}>Créer mon compte</Text>
            }
          </TouchableOpacity>

          <View style={st.divider}>
            <View style={st.divLine} /><Text style={st.divTxt}>ou</Text><View style={st.divLine} />
          </View>

          <TouchableOpacity style={st.btnSecondary} onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={st.btnSecondaryTxt}>J'ai déjà un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  brand:     { alignItems: 'center', marginBottom: 28 },
  brandIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1a3a1a', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandName: { color: COLORS.text, fontSize: 24, fontWeight: '700' },

  card:  { width: '100%', maxWidth: 460, backgroundColor: COLORS.surface, borderRadius: 14, padding: 28, borderWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 24 },

  row:   { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
  },

  btn:         { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnTxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divTxt:  { color: COLORS.textSecondary, marginHorizontal: 12, fontSize: 12 },

  btnSecondary:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryTxt: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
