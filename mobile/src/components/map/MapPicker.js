/**
 * MapPicker — composant carte interactive (web uniquement)
 * - OpenStreetMap tiles (gratuit, sans clé API)
 * - Géocodage Nominatim (gratuit, sans clé API)
 * - Dessin de polygones via leaflet-draw
 * - Chaque polygone = une zone / future parcelle
 *
 * Props:
 *   onZonesChange(zones: Array<{ latlngs, name }>) — appelé à chaque modification
 *   initialCenter  [lat, lng]  (défaut : France métropolitaine)
 *   initialZoom    number      (défaut : 6)
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

// ─── On charge Leaflet uniquement côté navigateur ─────────────

let L = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  require('leaflet-draw');

  // Inject Leaflet + leaflet-draw CSS dynamiquement (CDN)
  const addCSS = (href) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  };
  addCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  addCSS('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css');

  // Fix icônes Leaflet cassées avec webpack/Metro
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// ─── Géocodage Nominatim (OSM, gratuit) ──────────────────────

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&countrycodes=fr,be,ch&addressdetails=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'TechFarm/1.0' } });
  if (!res.ok) throw new Error('Nominatim error');
  return res.json();
}

// ─── Composant ───────────────────────────────────────────────

const COLORS = {
  bg:          '#0d1520',
  border:      '#1e3050',
  text:        '#e8edf5',
  textSec:     '#7a8fa6',
  accent:      '#2ecc71',
  inputBg:     '#1a2535',
};

export default function MapPicker({ onZonesChange, initialCenter = [46.8, 2.3], initialZoom = 6, initialZones = [] }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const drawnItemsRef   = useRef(null);
  const zonesRef        = useRef([]);         // [{ id, latlngs, name }]
  const searchMarkerRef = useRef(null);       // marqueur adresse recherchée
  const editHandlerRef  = useRef(null);       // handler leaflet-draw edit actif

  const [searchQuery,   setSearchQuery]   = useState('');
  const [suggestions,   setSuggestions]   = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [showSuggest,   setShowSuggest]   = useState(false);
  const debounceRef     = useRef(null);
  const [zones,         setZones]         = useState([]);
  const [zoneNames,     setZoneNames]     = useState({});  // { id: name }
  const [editMode,      setEditMode]      = useState(false);

  // ── Initialiser la carte Leaflet une seule fois ─────────────
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center:        initialCenter,
      zoom:          initialZoom,
      zoomControl:   true,
    });

    // Tuiles OSM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom:     19,
    }).addTo(map);

    // Couche des dessins
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Contrôles de dessin
    const drawControl = new L.Control.Draw({
      edit:  { featureGroup: drawnItems },
      draw:  {
        polygon:   {
          allowIntersection: false,
          showArea:          true,
          shapeOptions:      { color: '#2ecc71', fillOpacity: 0.25 },
        },
        rectangle: {
          shapeOptions: { color: '#3498db', fillOpacity: 0.25 },
        },
        // désactiver ce dont on n'a pas besoin
        polyline:  false,
        circle:    false,
        circlemarker: false,
        marker:    false,
      },
    });
    map.addControl(drawControl);

    // ── Événements draw ───────────────────────────────────────
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      const id    = Date.now().toString();
      layer._zoneId = id;
      drawnItems.addLayer(layer);

      const latlngs = layer.getLatLngs()[0].map(p => ({ lat: p.lat, lng: p.lng }));
      const newZone = { id, latlngs, name: '' };

      zonesRef.current = [...zonesRef.current, newZone];
      setZones([...zonesRef.current]);
      setZoneNames(prev => ({ ...prev, [id]: '' }));
      onZonesChange?.(zonesRef.current);
    });

    map.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer((layer) => {
        const id = layer._zoneId;
        if (!id) return;
        const latlngs = layer.getLatLngs()[0].map(p => ({ lat: p.lat, lng: p.lng }));
        zonesRef.current = zonesRef.current.map(z =>
          z.id === id ? { ...z, latlngs } : z
        );
      });
      setZones([...zonesRef.current]);
      onZonesChange?.(zonesRef.current);
    });

    map.on(L.Draw.Event.DELETED, (e) => {
      const deletedIds = new Set();
      e.layers.eachLayer(layer => { if (layer._zoneId) deletedIds.add(layer._zoneId); });
      zonesRef.current = zonesRef.current.filter(z => !deletedIds.has(z.id));
      setZones([...zonesRef.current]);
      setZoneNames(prev => {
        const next = { ...prev };
        deletedIds.forEach(id => delete next[id]);
        return next;
      });
      onZonesChange?.(zonesRef.current);
    });

    // ── Pré-dessiner les zones initiales (ex: parcelle existante) ──
    if (initialZones && initialZones.length > 0) {
      const loaded = [];
      for (const z of initialZones) {
        const id = z.id ?? (Date.now().toString() + Math.random());
        const layer = L.polygon(
          z.latlngs.map(pt => [pt.lat, pt.lng]),
          { color: '#2ecc71', fillOpacity: 0.25 }
        );
        layer._zoneId = id;
        drawnItems.addLayer(layer);
        loaded.push({ id, latlngs: z.latlngs, name: z.name ?? '' });
      }
      zonesRef.current = loaded;
      setZones(loaded);
      setZoneNames(Object.fromEntries(loaded.map(z => [z.id, z.name ?? ''])));
      onZonesChange?.(loaded);
    }

    mapRef.current = map;

    return () => {
      if (editHandlerRef.current) {
        try { editHandlerRef.current.disable(); } catch (_) {}
        editHandlerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mettre à jour le nom d'une zone ─────────────────────────
  const updateZoneName = (id, name) => {
    setZoneNames(prev => ({ ...prev, [id]: name }));
    zonesRef.current = zonesRef.current.map(z => z.id === id ? { ...z, name } : z);
    onZonesChange?.(zonesRef.current);
  };

  // ── Autocomplete avec debounce 350ms ────────────────────────
  const handleQueryChange = (text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) { setSuggestions([]); setShowSuggest(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocode(text);
        setSuggestions(results.slice(0, 6));
        setShowSuggest(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggest(false);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const goTo = (result) => {
    if (!mapRef.current) return;
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    mapRef.current.setView([lat, lon], 16);

    // Supprimer l'ancien marqueur s'il existe
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    // Placer un marqueur rouge sur l'adresse exacte
    searchMarkerRef.current = L.marker([lat, lon], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#e74c3c;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(231,76,60,0.8)"></div>`,
        iconSize:   [14, 14],
        iconAnchor: [7, 7],
      }),
    })
      .addTo(mapRef.current)
      .bindPopup(result.display_name.split(',').slice(0, 2).join(',').trim())
      .openPopup();

    setSuggestions([]);
    setShowSuggest(false);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  // Entrée ou bouton → zoom direct sur le 1er résultat
  const handleSubmitSearch = async () => {
    if (!searchQuery.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    try {
      const results = await geocode(searchQuery);
      if (results.length > 0) {
        goTo(results[0]);
      } else {
        setSuggestions([]);
        setShowSuggest(false);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  // ── Supprimer une zone ────────────────────────────────────────
  const removeZone = (id) => {    // Sortir du mode édition avant de supprimer
    if (editHandlerRef.current) {
      try { editHandlerRef.current.disable(); } catch (_) {}
      editHandlerRef.current = null;
      setEditMode(false);
    }    // Supprimer le layer Leaflet correspondant
    drawnItemsRef.current?.eachLayer(layer => {
      if (layer._zoneId === id) drawnItemsRef.current.removeLayer(layer);
    });
    zonesRef.current = zonesRef.current.filter(z => z.id !== id);
    setZones([...zonesRef.current]);
    setZoneNames(prev => { const next = { ...prev }; delete next[id]; return next; });
    onZonesChange?.(zonesRef.current);
  };

  // ── Activer / désactiver le mode édition des sommets ────────────────
  const startEdit = () => {
    if (!L || !mapRef.current || !drawnItemsRef.current || editHandlerRef.current) return;
    try {
      const handler = new L.EditToolbar.Edit(mapRef.current, { featureGroup: drawnItemsRef.current });
      handler.enable();
      editHandlerRef.current = handler;
      setEditMode(true);
    } catch (_) {}
  };

  const saveEdit = () => {
    if (!editHandlerRef.current) return;
    editHandlerRef.current.save();   // déclenche L.Draw.Event.EDITED → met à jour zonesRef
    editHandlerRef.current.disable();
    editHandlerRef.current = null;
    setEditMode(false);
  };

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <View style={st.container}>

      {/* Barre de recherche avec autocomplete */}
      <View style={st.searchWrapper}>
        <View style={st.searchBar}>
          <View style={st.searchIcon}>
            {searching
              ? <ActivityIndicator size="small" color={COLORS.accent} />
              : <Text style={{ fontSize: 15 }}>🔍</Text>
            }
          </View>
          <TextInput
            style={st.searchInput}
            placeholder="Rechercher une adresse, ville, lieu…"
            placeholderTextColor={COLORS.textSec}
            value={searchQuery}
            onChangeText={handleQueryChange}
            onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 300)}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={st.searchSubmitBtn} onPress={handleSubmitSearch}>
            <Text style={st.searchSubmitTxt}>→</Text>
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <TouchableOpacity style={st.clearBtn} onPress={() => { setSearchQuery(''); setSuggestions([]); setShowSuggest(false); }}>
              <Text style={st.clearBtnTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown suggestions */}
        {showSuggest && suggestions.length > 0 && (
          <View style={st.suggestions}>
            {suggestions.map((s, i) => {
              const parts = s.display_name.split(',');
              const main  = parts[0].trim();
              const sub   = parts.slice(1, 3).join(',').trim();
              return (
                <TouchableOpacity
                  key={i}
                  style={[st.suggestionItem, i < suggestions.length - 1 && st.suggestionItemBorder]}
                  onPress={() => goTo(s)}
                >
                  <Text style={st.suggestionIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.suggestionMain} numberOfLines={1}>{main}</Text>
                    {sub ? <Text style={st.suggestionSub} numberOfLines={1}>{sub}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Conteneur carte Leaflet */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: 420, borderRadius: 10, overflow: 'hidden', border: '1px solid #1e3050', zIndex: 0 }}
      />

      {/* Bouton modifier / valider les sommets de la zone */}
      {zones.length > 0 && (
        <TouchableOpacity
          style={[st.editZoneBtn, editMode && st.editZoneBtnActive]}
          onPress={editMode ? saveEdit : startEdit}
        >
          <Text style={[st.editZoneBtnTxt, editMode && { color: '#fff' }]}>
            {editMode ? '✓ Valider les modifications de la zone' : '✏️ Modifier la zone (déplacer les sommets)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Légende outil */}
      <View style={st.legend}>
        <Text style={st.legendTxt}>
          🖊 Utilise les outils en haut à droite de la carte pour dessiner des zones (polygone ou rectangle)
        </Text>
      </View>

      {/* Liste des zones dessinées */}
      {zones.length > 0 && (
        <View style={st.zonesList}>
          <Text style={st.zonesTitle}>Zones sélectionnées ({zones.length})</Text>
          {zones.map((zone, i) => (
            <View key={zone.id} style={st.zoneRow}>
              <Text style={st.zoneIndex}>Zone {i + 1}</Text>
              <TextInput
                style={st.zoneNameInput}
                placeholder={`Nom parcelle ${i + 1} (optionnel)`}
                placeholderTextColor={COLORS.textSec}
                value={zoneNames[zone.id] ?? ''}
                onChangeText={v => updateZoneName(zone.id, v)}
              />
              <TouchableOpacity style={st.zoneRemoveBtn} onPress={() => removeZone(zone.id)}>
                <Text style={st.zoneRemoveTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const st = StyleSheet.create({
  container:      { gap: 10 },

  // Barre de recherche
  searchWrapper:  { position: 'relative', zIndex: 1000 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchIcon:     { width: 22, alignItems: 'center' },
  searchInput:    { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 11 },
  clearBtn:       { padding: 4 },
  clearBtnTxt:    { color: COLORS.textSec, fontSize: 13 },
  searchSubmitBtn: { backgroundColor: COLORS.accent, borderRadius: 7, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  searchSubmitTxt: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // Suggestions dropdown
  suggestions:    { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#111e2e', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  suggestionItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionIcon: { fontSize: 14 },
  suggestionMain: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  suggestionSub:  { color: COLORS.textSec, fontSize: 11, marginTop: 1 },
  legend:         { backgroundColor: '#111e2e', borderRadius: 8, padding: 10 },
  legendTxt:      { color: COLORS.textSec, fontSize: 12, lineHeight: 18 },
  editZoneBtn:     { backgroundColor: '#1a2535', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  editZoneBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  editZoneBtnTxt:  { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  zonesList:      { backgroundColor: '#111e2e', borderRadius: 10, padding: 12, gap: 8 },
  zonesTitle:     { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  zoneRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneIndex:      { color: COLORS.textSec, fontSize: 12, width: 44 },
  zoneNameInput:  { flex: 1, backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12 },
  zoneRemoveBtn:  { padding: 6, backgroundColor: '#1a0a0a', borderRadius: 6, borderWidth: 1, borderColor: '#3d1515' },
  zoneRemoveTxt:  { color: '#ff6b6b', fontSize: 12, fontWeight: '700' },
});
