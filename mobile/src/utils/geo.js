// Génère un polygone rectangulaire approximatif à partir du centre GPS et de la superficie (ha)
// Utilisé en fallback quand la géométrie réelle n'est pas renseignée en BDD
export function approxPolygon(lat, lng, superficieHa) {
  const ha = superficieHa && superficieHa > 0 ? superficieHa : 5;
  // Côté en mètres d'un carré équivalent
  const sideM = Math.sqrt(ha * 10000);
  // Conversion en degrés
  const dlat = (sideM / 111000) / 2;
  const dlng = (sideM / (111000 * Math.cos((lat * Math.PI) / 180))) / 2;
  // Légère rotation pour moins de carrés parfaits (aspect plus naturel)
  const skew = dlng * 0.18;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - dlng,        lat - dlat       ],
      [lng + dlng + skew, lat - dlat       ],
      [lng + dlng,        lat + dlat       ],
      [lng - dlng - skew, lat + dlat       ],
      [lng - dlng,        lat - dlat       ], // ferme le polygone
    ]],
  };
}
