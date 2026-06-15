// Icône + couleur + libellé par type de capteur (pour la carte et le filtre).
export const SENSOR_META = {
  temperature:  { icon: '🌡️', color: '#e67e22', label: 'Température' },
  humidite_air: { icon: '💧',  color: '#3498db', label: 'Humidité air' },
  humidite_sol: { icon: '🌱',  color: '#27ae60', label: 'Humidité sol' },
  vent:         { icon: '💨',  color: '#9b59b6', label: 'Vent' },
  luminosite:   { icon: '☀️',  color: '#f1c40f', label: 'Luminosité' },
  ph:           { icon: '⚗️',  color: '#e84393', label: 'pH' },
  qualite_air:  { icon: '🌫️', color: '#95a5a6', label: 'Qualité air' },
  debit_eau:    { icon: '🚰',  color: '#00cec9', label: 'Débit eau' },
};

export const sensorMeta = (type) => SENSOR_META[type] ?? { icon: '◎', color: '#3498db', label: type };

export const CAPTEUR_LABEL = {
  temperature:  'Température',
  humidite_air: 'Humidité Air',
  humidite_sol: 'Humidité Sol',
  luminosite:   'Luminosité',
  ph:           'pH',
  qualite_air:  'Qualité Air',
  debit_eau:    'Débit Eau',
};
