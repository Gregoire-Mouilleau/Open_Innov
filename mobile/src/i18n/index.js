import { getLocales } from 'expo-localization';
import fr from './fr.json';
import en from './en.json';

const translations = { fr, en };

let _lang = getLocales()[0]?.languageCode ?? 'fr';
if (!translations[_lang]) _lang = 'fr';

export function setLanguage(lang) {
  if (translations[lang]) _lang = lang;
}

export function getCurrentLanguage() {
  return _lang;
}

// t('widgets.camera_live')  →  cherche translations[_lang].widgets.camera_live
export function t(key) {
  const messages = translations[_lang] ?? translations['fr'];
  return key.split('.').reduce((obj, k) => obj?.[k], messages) ?? key;
}
