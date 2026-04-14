export const COLORS = {
  background: '#0f1923',
  surface: '#1a2535',
  surfaceLight: '#243047',
  accent: '#2ecc71',
  accentDark: '#27ae60',
  selected: '#e74c3c',
  text: '#ffffff',
  textSecondary: '#8fa3b1',
  border: '#2c3e50',
};

export const WIDGET_IDS = {
  CAMERA_LIVE: 'camera_live',
  CAMERA_IA: 'camera_ia',
  MAP: 'map',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  LUMINOSITY: 'luminosity',
  DISEASES: 'diseases',
};

export const ALL_WIDGETS = [
  { id: WIDGET_IDS.CAMERA_LIVE, title: 'Camera en Direct' },
  { id: WIDGET_IDS.CAMERA_IA, title: 'Camera IA Santé' },
  { id: WIDGET_IDS.MAP, title: 'Carte Interactive' },
  { id: WIDGET_IDS.TEMPERATURE, title: 'Température' },
  { id: WIDGET_IDS.HUMIDITY, title: 'Humidité' },
  { id: WIDGET_IDS.LUMINOSITY, title: 'Luminosité' },
  { id: WIDGET_IDS.DISEASES, title: 'Détection Maladies' },
];
