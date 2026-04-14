import { getLocales } from 'expo-localization';
import fr from './fr.json';
import en from './en.json';

const translations = { fr, en };

const locale = getLocales()[0]?.languageCode ?? 'fr';
const messages = translations[locale] ?? translations['fr'];

// t('widgets.camera_live')  →  cherche messages.widgets.camera_live
export function t(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], messages) ?? key;
}
