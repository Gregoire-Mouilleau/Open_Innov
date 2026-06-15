import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';
import { t, setLanguage, getCurrentLanguage } from '../../i18n';
import { users } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// ─── Composants réutilisables ─────────────────────────────────

function SectionCard({ icon, title, sub, children }) {
  return (
    <View style={st.card}>
      <View style={st.cardHeader}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <View>
          <Text style={st.cardTitle}>{title}</Text>
          <Text style={st.cardSub}>{sub}</Text>
        </View>
      </View>
      <View style={st.cardBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, secureTextEntry, placeholder, keyboardType }) {
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={st.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder ?? ''}
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

// ─── Section Profil ───────────────────────────────────────────

function ProfileSection({ user, onSaved }) {
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '');
  const [email,     setEmail]     = useState(user?.email      ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { user: updated } = await users.updateMe({ first_name: firstName, last_name: lastName, email });
      onSaved?.(updated);
      showToast(t('settings.save') + ' ✓', 'success');
    } catch (e) {
      showToast(e.message ?? 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon="👤" title={t('settings.profile')} sub={t('settings.profileSub')}>
      <View style={st.row2}>
        <Field label={t('settings.firstName')} value={firstName} onChangeText={setFirstName} />
        <Field label={t('settings.lastName')}  value={lastName}  onChangeText={setLastName}  />
      </View>
      <Field label={t('settings.email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={st.btnTxt}>{t('settings.save')}</Text>
        }
      </TouchableOpacity>
    </SectionCard>
  );
}

// ─── Section Sécurité ─────────────────────────────────────────

function SecuritySection() {
  const { showToast } = useToast();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPwd !== confirmPwd) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    if (newPwd.length < 8) {
      showToast('Minimum 8 caractères', 'error');
      return;
    }
    setSaving(true);
    try {
      await users.changePassword({ current_password: currentPwd, new_password: newPwd });
      showToast(t('settings.changePwd') + ' ✓', 'success');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      showToast(e.message ?? 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon="🔐" title={t('settings.security')} sub={t('settings.securitySub')}>
      <Field label={t('settings.currentPwd')} value={currentPwd} onChangeText={setCurrentPwd} secureTextEntry />
      <View style={st.row2}>
        <Field label={t('settings.newPwd')}     value={newPwd}     onChangeText={setNewPwd}     secureTextEntry />
        <Field label={t('settings.confirmPwd')} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry />
      </View>
      <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleChange} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={st.btnTxt}>{t('settings.changePwd')}</Text>
        }
      </TouchableOpacity>
    </SectionCard>
  );
}

// ─── Section Langue ───────────────────────────────────────────

function LanguageSection({ navigation }) {
  const [lang, setLang] = useState(getCurrentLanguage());

  const handleSelect = async (newLang) => {
    setLanguage(newLang);
    setLang(newLang);
    await AsyncStorage.setItem('techfarm_language', newLang);
    // Force le re-rendu complet de l'app via navigation reset
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  };

  const LANGS = [
    { code: 'fr', flag: '🇫🇷', label: t('settings.langFr') },
    { code: 'en', flag: '🇬🇧', label: t('settings.langEn') },
  ];

  return (
    <SectionCard icon="🌐" title={t('settings.language')} sub={t('settings.languageSub')}>
      <View style={st.langRow}>
        {LANGS.map(l => (
          <TouchableOpacity
            key={l.code}
            style={[st.langBtn, lang === l.code && st.langBtnActive]}
            onPress={() => handleSelect(l.code)}
          >
            <Text style={{ fontSize: 22 }}>{l.flag}</Text>
            <Text style={[st.langBtnTxt, lang === l.code && st.langBtnTxtActive]}>{l.label}</Text>
            {lang === l.code && <View style={st.langCheck}><Text style={{ fontSize: 12, color: COLORS.accent }}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </SectionCard>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function AccountSettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    users.me()
      .then(d => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.back} onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={st.title}>{t('settings.title')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      ) : (
        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent}>
          <ProfileSection user={user} onSaved={setUser} />
          <SecuritySection />
          <LanguageSection navigation={navigation} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  header:      { height: 64, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#0d1520', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 24 },
  back:        { paddingVertical: 6, paddingRight: 12 },
  backTxt:     { color: COLORS.accent, fontSize: 16 },
  title:       { color: COLORS.text, fontSize: 17, fontWeight: '700' },

  scroll:       { flex: 1 },
  scrollContent: { padding: 24, gap: 20, maxWidth: 700, alignSelf: 'center', width: '100%' },

  card:        { backgroundColor: '#0d1520', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardTitle:   { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  cardSub:     { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  cardBody:    { padding: 20, gap: 14 },

  row2:        { flexDirection: 'row', gap: 14 },
  field:       { flex: 1, gap: 6 },
  fieldLabel:  { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { backgroundColor: '#1a2535', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },

  btn:         { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnTxt:      { color: '#fff', fontSize: 14, fontWeight: '700' },

  langRow:       { flexDirection: 'row', gap: 12 },
  langBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a2535', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  langBtnActive: { borderColor: COLORS.accent, backgroundColor: '#1a3520' },
  langBtnTxt:    { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500', flex: 1 },
  langBtnTxtActive: { color: COLORS.text },
  langCheck:     { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' },
});

