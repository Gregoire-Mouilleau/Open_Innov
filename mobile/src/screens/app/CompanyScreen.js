import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { t } from '../../i18n';
import { Ionicons } from '@expo/vector-icons';
import { users, companies, farms, roles, parcelles as parcellesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// MapPicker chargé uniquement sur web
const MapPicker = Platform.OS === 'web'
  ? require('../../components/map/MapPicker').default
  : null;

// ─── Helpers ──────────────────────────────────────────────────

function SectionCard({ icon, title, sub, action, children }) {
  return (
    <View style={st.card}>
      <View style={st.cardHeader}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={st.cardTitle}>{title}</Text>
          <Text style={st.cardSub}>{sub}</Text>
        </View>
        {action}
      </View>
      <View style={st.cardBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={st.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

// ─── Carte d'une ferme ────────────────────────────────────────

function FarmCard({ farm, canManage, onChanged, onDeleted }) {
  const { show } = useToast();
  const [expanded,           setExpanded]           = useState(false);
  const [editName,           setEditName]           = useState(farm.nom);
  const [farmParcelles,      setFarmParcelles]      = useState([]);
  const [loadingP,           setLoadingP]           = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [addingParcelle,     setAddingParcelle]     = useState(false);
  const [newParcelleName,    setNewParcelleName]    = useState('');
  const [confirmDel,         setConfirmDel]         = useState(false);
  const [expandedParcelleId, setExpandedParcelleId] = useState(null);
  const [savingParcelleId,   setSavingParcelleId]   = useState(null);

  const hasGps = farm.latitude != null && farm.longitude != null;

  const loadParcelles = useCallback(async () => {
    setLoadingP(true);
    try {
      const res = await parcellesApi.list(farm.id);
      setFarmParcelles((res.parcelles ?? []).map(p => ({
        ...p,
        editNom:        p.nom,
        editSuperficie: p.superficie_ha != null ? String(p.superficie_ha) : '',
        editCulture:    p.culture_type ?? '',
        // Utiliser la géométrie exacte stockée, sinon tableau vide
        editZones:      p.geometry ? [{ id: `existing-${p.id}`, latlngs: p.geometry, name: p.nom }] : [],
      })));
    } catch {}
    finally { setLoadingP(false); }
  }, [farm.id]);

  const handleToggle = () => {
    if (!expanded) loadParcelles();
    setExpanded(v => !v);
    setConfirmDel(false);
    setExpandedParcelleId(null);
  };

  const updateParcelleField = (id, field, value) =>
    setFarmParcelles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const deleteParcelle = async (id) => {
    try {
      await parcellesApi.delete(id);
      setFarmParcelles(prev => prev.filter(p => p.id !== id));
      show('Parcelle supprimée ✓', 'success');
      onChanged?.({ ...farm, parcelles_count: Math.max(0, (farm.parcelles_count ?? 1) - 1) });
    } catch (e) { show(e.message ?? 'Erreur', 'error'); }
  };

  const saveParcelleDetails = async (p) => {
    setSavingParcelleId(p.id);
    try {
      const body = {
        nom:          p.editNom.trim() || p.nom,
        superficie_ha: p.editSuperficie ? parseFloat(p.editSuperficie) : null,
        culture_type:  p.editCulture  || null,
      };
      // Si des zones sont présentes (initiales ou redessinées) → sauvegarder géométrie + centroïde
      if (p.editZones?.length > 0) {
        const firstZone = p.editZones[0];
        const allPts = p.editZones.flatMap(z => z.latlngs);
        body.position_lat = allPts.reduce((s, pt) => s + pt.lat, 0) / allPts.length;
        body.position_lng = allPts.reduce((s, pt) => s + pt.lng, 0) / allPts.length;
        body.geometry     = firstZone.latlngs;
        // Estimation superficie via Shoelace si non saisie manuellement
        if (!p.editSuperficie && firstZone.latlngs?.length >= 3) {
          const pts = firstZone.latlngs;
          let area = 0;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            area += (pts[j].lng + pts[i].lng) * (pts[j].lat - pts[i].lat);
          }
          body.superficie_ha = Math.abs(area) * 0.5 * 111 * 85 * 100;
        }
      }
      await parcellesApi.update(p.id, body);
      show(p.editNom + ' mise à jour ✓', 'success');
      setFarmParcelles(prev => prev.map(pp =>
        pp.id === p.id ? { ...pp, ...body, nom: body.nom, editZones: [] } : pp
      ));
      setExpandedParcelleId(null);
    } catch (e) { show(e.message ?? 'Erreur', 'error'); }
    finally { setSavingParcelleId(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editName.trim() && editName.trim() !== farm.nom)
        await farms.update(farm.id, { nom: editName.trim() });
      for (const p of farmParcelles)
        if (p.editNom.trim() !== p.nom)
          await parcellesApi.update(p.id, { nom: p.editNom.trim() });
      show('Modifications enregistrées ✓', 'success');
      setFarmParcelles(prev => prev.map(p => ({ ...p, nom: p.editNom.trim() })));
      onChanged?.({ ...farm, nom: editName.trim() || farm.nom });
      setExpanded(false);
    } catch (e) { show(e.message ?? 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeleteFarm = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    try {
      await farms.delete(farm.id);
      show(farm.nom + ' supprimée ✓', 'success');
      onDeleted?.(farm.id);
    } catch (e) { show(e.message ?? 'Erreur', 'error'); }
  };

  const handleAddParcelle = async () => {
    const nom = newParcelleName.trim();
    if (!nom) { show('Nom requis', 'warning'); return; }
    try {
      const res = await parcellesApi.create({ farm_id: farm.id, nom });
      const newP = res.parcelle ?? res;
      setFarmParcelles(prev => [...prev, {
        ...newP,
        editNom: newP.nom,
        editSuperficie: '',
        editCulture: '',
        editZones: [],
      }]);
      onChanged?.({ ...farm, parcelles_count: (farm.parcelles_count ?? 0) + 1 });
      setNewParcelleName('');
      setAddingParcelle(false);
      show(nom + ' ajoutée ✓', 'success');
    } catch (e) { show(e.message ?? 'Erreur', 'error'); }
  };

  return (
    <View style={st.farmCard}>
      <TouchableOpacity style={st.farmCardTop} onPress={handleToggle} activeOpacity={0.7}>
        <View style={st.farmIcon}><Text style={{ fontSize: 18 }}>🌾</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.farmName}>{farm.nom}</Text>
          {farm.adresse ? <Text style={st.farmAddr}>{farm.adresse}{farm.code_postal ? `, ${farm.code_postal}` : ''}{farm.country ? ` — ${farm.country}` : ''}</Text> : null}
        </View>
        <View style={st.parcellesBadge}>
          <Text style={st.parcellesBadgeTxt}>{farm.parcelles_count ?? 0} {t('company.parcelles')}</Text>
        </View>
        <Text style={st.farmCardArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {hasGps && !expanded && (
        <View style={st.gpsBadge}>
          <Text style={{ fontSize: 13 }}>📍</Text>
          <Text style={st.gpsCoords}>{Number(farm.latitude).toFixed(5)}, {Number(farm.longitude).toFixed(5)}</Text>
        </View>
      )}

      {expanded && (
        <View style={st.farmEditPanel}>
          {canManage && (
            <View style={st.field}>
              <Text style={st.fieldLabel}>Nom de la ferme</Text>
              <TextInput
                style={st.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nom de la ferme"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}

          <View style={st.farmEditSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[st.farmEditSectionTitle, { flex: 1, marginBottom: 0 }]}>Parcelles ({farmParcelles.length})</Text>
              {canManage && (
                <TouchableOpacity
                  onPress={() => { setAddingParcelle(v => !v); setNewParcelleName(''); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name={addingParcelle ? 'close-circle-outline' : 'add-circle-outline'} size={20} color={COLORS.accent} />
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>
                    {addingParcelle ? 'Annuler' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {addingParcelle && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  value={newParcelleName}
                  onChangeText={setNewParcelleName}
                  placeholder="Nom de la nouvelle parcelle"
                  placeholderTextColor={COLORS.textSecondary}
                  autoFocus
                  onSubmitEditing={handleAddParcelle}
                />
                <TouchableOpacity style={st.btn} onPress={handleAddParcelle}>
                  <Text style={st.btnTxt}>Créer</Text>
                </TouchableOpacity>
              </View>
            )}
            {loadingP
              ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 10 }} />
              : farmParcelles.length === 0
                ? <Text style={st.empty}>Aucune parcelle</Text>
                : farmParcelles.map(p => {
                    const isExpP = expandedParcelleId === p.id;
                    const isSavingP = savingParcelleId === p.id;
                    const center = p.position_lat && p.position_lng
                      ? [parseFloat(p.position_lat), parseFloat(p.position_lng)]
                      : null;
                    return (
                      <View key={p.id} style={st.parcelleBlock}>
                        {/* Ligne nom + boutons */}
                        <View style={st.parcelleEditRow}>
                          <TextInput
                            style={[st.input, { flex: 1 }]}
                            value={p.editNom}
                            onChangeText={n => updateParcelleField(p.id, 'editNom', n)}
                            placeholder="Nom de la parcelle"
                            placeholderTextColor={COLORS.textSecondary}
                            editable={canManage}
                          />
                          {canManage && (
                            <TouchableOpacity
                              style={[st.parcelleIconBtn, isExpP && { backgroundColor: COLORS.accent + '33' }]}
                              onPress={() => setExpandedParcelleId(isExpP ? null : p.id)}
                            >
                              <Ionicons name={isExpP ? 'chevron-up' : 'create-outline'} size={18} color={COLORS.accent} />
                            </TouchableOpacity>
                          )}
                          {canManage && (
                            <TouchableOpacity style={st.parcelleDelBtn} onPress={() => deleteParcelle(p.id)}>
                              <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Panneau détail parcelle */}
                        {isExpP && canManage && (
                          <View style={st.parcelleDetailPanel}>
                            <View style={st.row2}>
                              <View style={st.field}>
                                <Text style={st.fieldLabel}>Superficie (ha)</Text>
                                <TextInput
                                  style={st.input}
                                  value={p.editSuperficie}
                                  onChangeText={n => updateParcelleField(p.id, 'editSuperficie', n)}
                                  placeholder="Ex: 2.5"
                                  placeholderTextColor={COLORS.textSecondary}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              <View style={st.field}>
                                <Text style={st.fieldLabel}>Culture</Text>
                                <TextInput
                                  style={st.input}
                                  value={p.editCulture}
                                  onChangeText={n => updateParcelleField(p.id, 'editCulture', n)}
                                  placeholder="Ex: blé, maïs…"
                                  placeholderTextColor={COLORS.textSecondary}
                                />
                              </View>
                            </View>

                            {/* Carte redessin — web uniquement */}
                            {Platform.OS === 'web' && MapPicker && (
                              <View style={{ gap: 6 }}>
                                <Text style={st.fieldLabel}>Redessiner la zone sur la carte</Text>
                                <Text style={[st.farmAddr, { marginBottom: 4 }]}>
                                  {p.editZones?.length > 0
                                    ? `✓ Nouvelle zone dessinée (${p.editZones.length} polygone${p.editZones.length > 1 ? 's' : ''})`
                                    : center
                                      ? 'Dessine un polygone pour repositionner / redimensionner la parcelle'
                                      : 'Aucune position enregistrée — dessine un polygone pour en définir une'
                                  }
                                </Text>
                                <MapPicker
                                  onZonesChange={zones => updateParcelleField(p.id, 'editZones', zones)}
                                  initialCenter={center ?? [46.8, 2.3]}
                                  initialZoom={center ? 16 : 6}
                                  initialZones={p.editZones}
                                />
                              </View>
                            )}

                            <TouchableOpacity
                              style={[st.btn, { marginTop: 4 }, isSavingP && st.btnDisabled]}
                              onPress={() => saveParcelleDetails(p)}
                              disabled={isSavingP}
                            >
                              {isSavingP
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={st.btnTxt}>Enregistrer les modifications</Text>
                              }
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
            }
          </View>

          {canManage && (
            <View style={st.farmEditActions}>
              <TouchableOpacity
                style={[st.deleteBtn, confirmDel && st.deleteBtnConfirm, { flex: 1 }]}
                onPress={handleDeleteFarm}
              >
                <Text style={[st.deleteBtnTxt, confirmDel && { color: '#ff4444' }]}>
                  {confirmDel ? 'Confirmer ?' : 'Supprimer la ferme'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.btn, { flex: 1, marginTop: 0 }, saving && st.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={st.btnTxt}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Formulaire ajout ferme ───────────────────────────────────

function AddFarmForm({ companyId, onCreated }) {
  const { show }  = useToast();
  const [nom,     setNom]    = useState('');
  const [zones,   setZones]  = useState([]);   // zones dessinées sur la carte
  const [saving,  setSaving] = useState(false);

  // Fallback mobile : champs texte
  const [adresse, setAdresse] = useState('');
  const [zip,     setZip]     = useState('');
  const [country, setCountry] = useState('');
  const [lat,     setLat]     = useState('');
  const [lng,     setLng]     = useState('');

  const handleCreate = async () => {
    if (!nom.trim()) { show('Nom requis', 'warning'); return; }

    // Sur web : au moins une zone requise
    if (Platform.OS === 'web' && zones.length === 0) {
      show('Dessine au moins une zone sur la carte', 'warning');
      return;
    }

    setSaving(true);
    try {
      // Calculer le centre depuis les zones (ou champs manuels sur mobile)
      let latitude  = lat  ? parseFloat(lat)  : null;
      let longitude = lng  ? parseFloat(lng)  : null;

      if (Platform.OS === 'web' && zones.length > 0) {
        // Centre = barycentre de tous les points de toutes les zones
        const allPoints = zones.flatMap(z => z.latlngs);
        latitude  = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
        longitude = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;
      }

      // Construire les parcelles depuis les zones
      const parcelles = zones.map((z, i) => ({
        nom:          z.name?.trim() || `Parcelle ${i + 1}`,
        latlngs:      z.latlngs,
        // centre de la zone
        position_lat: z.latlngs.reduce((s, p) => s + p.lat, 0) / z.latlngs.length,
        position_lng: z.latlngs.reduce((s, p) => s + p.lng, 0) / z.latlngs.length,
      }));

      const { farm } = await farms.create({
        nom:         nom.trim(),
        company_id:  companyId,
        adresse:     adresse || null,
        code_postal: zip || null,
        country:     country || null,
        latitude,
        longitude,
        parcelles,   // backend crée les parcelles en même temps
      });

      show(farm.nom + ' créée ✓', 'success');
      onCreated(farm);
      setNom(''); setZones([]); setAdresse(''); setZip(''); setCountry(''); setLat(''); setLng('');
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.addForm}>
      <Field label={t('company.farmName')} value={nom} onChangeText={setNom} placeholder="Ex: Ferme des Blés" />

      {Platform.OS === 'web' && MapPicker ? (
        /* ── Version web : carte interactive ── */
        <MapPicker onZonesChange={setZones} />
      ) : (
        /* ── Version mobile : champs manuels ── */
        <>
          <View style={st.row2}>
            <Field label={t('company.address')} value={adresse} onChangeText={setAdresse} />
            <Field label={t('company.zip')}     value={zip}     onChangeText={setZip} />
          </View>
          <View style={st.row2}>
            <Field label={t('company.country')}   value={country} onChangeText={setCountry} />
            <Field label={t('company.latitude')}  value={lat}     onChangeText={setLat} keyboardType="decimal-pad" />
            <Field label={t('company.longitude')} value={lng}     onChangeText={setLng} keyboardType="decimal-pad" />
          </View>
        </>
      )}

      {/* Résumé zones sélectionnées */}
      {Platform.OS === 'web' && zones.length > 0 && (
        <View style={st.zonesSummary}>
          <Text style={st.zonesSummaryTxt}>
            ✓ {zones.length} zone{zones.length > 1 ? 's' : ''} sélectionnée{zones.length > 1 ? 's' : ''} → {zones.length} parcelle{zones.length > 1 ? 's' : ''} seront créées
          </Text>
        </View>
      )}

      <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleCreate} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={st.btnTxt}>{t('company.create')}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Carte d'un membre ────────────────────────────────────────

function MemberCard({ member, rolesList, canManage, onRoleChange }) {
  const { show } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [changing,   setChanging]   = useState(false);

  const initials = ((member.first_name?.[0] ?? '') + (member.last_name?.[0] ?? '')).toUpperCase() || member.email[0].toUpperCase();
  const isGerant = member.role === 'gerant';
  const roleName = member.role_nom || member.role;

  const handleRoleChange = async (roleId) => {
    setChanging(true);
    try {
      await users.update(member.id, { company_role_id: roleId });
      show(t('company.changeRole') + ' ✓', 'success');
      onRoleChange();
      setShowPicker(false);
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally { setChanging(false); }
  };

  return (
    <View style={st.memberCardWrap}>
      <View style={st.memberCard}>
        <View style={[st.memberAvatar, isGerant && { borderColor: '#f5a623' }]}>
          <Text style={st.memberInitials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.memberName}>
            {member.first_name || member.last_name
              ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
              : member.email}
          </Text>
          <Text style={st.memberEmail}>{member.email}</Text>
        </View>
        <TouchableOpacity
          style={[st.roleBadge, isGerant && st.roleBadgeGerant]}
          onPress={() => canManage && setShowPicker(v => !v)}
        >
          {changing
            ? <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingHorizontal: 4 }} />
            : <Text style={[st.roleBadgeTxt, isGerant && { color: '#f5a623' }]}>
                {roleName}{canManage ? ' ▾' : ''}
              </Text>
          }
        </TouchableOpacity>
      </View>
      {showPicker && (
        <View style={st.rolePicker}>
          {rolesList.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[st.rolePickerItem, member.company_role_id === r.id && st.rolePickerItemActive]}
              onPress={() => handleRoleChange(r.id)}
            >
              <Text style={[st.rolePickerTxt, member.company_role_id === r.id && { color: COLORS.accent, fontWeight: '700' }]}>
                {r.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Formulaire invitation ────────────────────────────────────

function InviteForm({ companyId, rolesList, onInvited }) {
  const { show } = useToast();
  const [email,        setEmail]        = useState('');
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [password,     setPassword]     = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving,       setSaving]       = useState(false);

  // Sélectionner le 1er rôle non-gérant par défaut
  useEffect(() => {
    if (selectedRole === null && rolesList.length > 0) {
      const def = rolesList.find(r => r.base_role !== 'gerant') ?? rolesList[0];
      setSelectedRole(def.id);
    }
  }, [rolesList, selectedRole]);

  const handleInvite = async () => {
    if (!email.trim()) { show('Email requis', 'warning'); return; }
    setSaving(true);
    try {
      const { linked } = await users.invite({
        email:           email.trim(),
        password:        password || undefined,
        first_name:      firstName || null,
        last_name:       lastName  || null,
        company_id:      companyId,
        company_role_id: selectedRole,
      });
      show(linked ? `${email} rattaché(e) ✓` : `${email} invité(e) ✓`, 'success');
      onInvited();
      setEmail(''); setFirstName(''); setLastName(''); setPassword('');
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  return (
    <View style={st.addForm}>
      <Field label={t('company.inviteEmail')} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <View style={st.row2}>
        <Field label={t('company.inviteFirstName')} value={firstName} onChangeText={setFirstName} />
        <Field label={t('company.inviteLastName')}  value={lastName}  onChangeText={setLastName}  />
      </View>
      <Field label="Mot de passe temporaire (si nouveau compte)" value={password} onChangeText={setPassword} />
      <View style={st.field}>
        <Text style={st.fieldLabel}>{t('company.inviteRole')}</Text>
        <View style={st.roleRow}>
          {rolesList.filter(r => r.base_role !== 'gerant').map(r => (
            <TouchableOpacity
              key={r.id}
              style={[st.roleBtn, selectedRole === r.id && st.roleBtnActive]}
              onPress={() => setSelectedRole(r.id)}
            >
              <Text style={[st.roleBtnTxt, selectedRole === r.id && st.roleBtnTxtActive]}>{r.nom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleInvite} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={st.btnTxt}>{t('company.inviteBtn')}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Création d'organisation (first-run) ─────────────────────

function CreateOrganizationView({ onCreated }) {
  const { show } = useToast();
  const [nom,    setNom]    = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nom.trim()) { show(t('company.orgName') + ' requis', 'warning'); return; }
    setSaving(true);
    try {
      const { company } = await companies.create({ nom: nom.trim() });
      show(company.nom + ' créée ✓', 'success');
      onCreated(company);
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.emptyState}>
      <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>🏢</Text>
      <Text style={st.emptyStateTitle}>{t('company.noOrg')}</Text>
      <Text style={st.emptyStateSub}>{t('company.createOrgSub')}</Text>
      <View style={st.createOrgForm}>
        <Field label={t('company.orgName')} value={nom} onChangeText={setNom}
          placeholder="Ex: Agri SARL, Ferme Dupont…" />
        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleCreate} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={st.btnTxt}>{t('company.createOrgBtn')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Permissions list ───────────────────────────────────

const PERM_LIST = [
  { key: 'manage_farms',     i18n: 'permManageFarms' },
  { key: 'manage_parcelles', i18n: 'permManageParcelles' },
  { key: 'manage_kits',      i18n: 'permManageKits' },
  { key: 'view_reports',     i18n: 'permViewReports' },
  { key: 'manage_members',   i18n: 'permManageMembers' },
  { key: 'manage_roles',     i18n: 'permManageRoles' },
];

// ─── Carte d'un rôle (avec toggles de permissions) ──────────

function RoleCard({ role, onSaved, onDeleted }) {
  const { show } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [nom,     setNom]     = useState(role.nom);
  const [perms,   setPerms]   = useState(new Set(role.permissions));
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  const toggle = (key) => setPerms(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await roles.update(role.id, { nom: nom.trim(), permissions: [...perms] });
      show(nom + ' mis à jour ✓', 'success');
      onSaved();
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    try {
      await roles.delete(role.id);
      show(role.nom + ' supprimé ✓', 'success');
      onDeleted();
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
      setConfirm(false);
    }
  };

  return (
    <View style={st.roleCard}>
      {/* Header cliquable — toujours visible */}
      <TouchableOpacity style={st.roleCardHead} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={st.roleCardName}>{nom}</Text>
          <Text style={st.memberCountTxt}>{role.member_count} {t('company.members')}</Text>
        </View>
        <Text style={st.roleCardArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Corps dépliable */}
      {expanded && (
        <>
          <TextInput
            style={[st.roleNameInput, { marginTop: 10, marginBottom: 4 }]}
            value={nom}
            onChangeText={setNom}
            placeholderTextColor={COLORS.textSecondary}
          />
          {PERM_LIST.map(p => (
            <TouchableOpacity key={p.key} style={st.permRow} onPress={() => toggle(p.key)}>
              <View style={[st.permCheck, perms.has(p.key) && st.permCheckOn]}>
                {perms.has(p.key) && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={st.permLabel}>{t('company.' + p.i18n)}</Text>
            </TouchableOpacity>
          ))}
          <View style={st.roleCardActions}>
            <TouchableOpacity style={[st.btn, { flex: 1 }, saving && st.btnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.btnTxt}>{t('company.saveRole')}</Text>}
            </TouchableOpacity>
            {role.member_count === 0 && (
              <TouchableOpacity
                style={[st.deleteBtn, confirm && st.deleteBtnConfirm]}
                onPress={handleDelete}
              >
                <Text style={[st.deleteBtnTxt, confirm && { color: '#ff4444' }]}>
                  {confirm ? '⚠️ Confirmer' : t('company.deleteRole')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Formulaire création de rôle ───────────────────────────

function CreateRoleForm({ onCreated }) {
  const { show } = useToast();
  const [nom,    setNom]    = useState('');
  const [perms,  setPerms]  = useState(new Set(['view_reports']));
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setPerms(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const handleCreate = async () => {
    if (!nom.trim()) { show('Nom requis', 'warning'); return; }
    setSaving(true);
    try {
      await roles.create({ nom: nom.trim(), base_role: 'farmer', permissions: [...perms] });
      show(nom + ' créé ✓', 'success');
      onCreated();
      setNom(''); setPerms(new Set(['view_reports']));
    } catch (e) {
      show(e.message ?? 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  return (
    <View style={st.addForm}>
      <Field label={t('company.roleName')} value={nom} onChangeText={setNom} placeholder="Ex: Technicien…" />
      {PERM_LIST.map(p => (
        <TouchableOpacity key={p.key} style={st.permRow} onPress={() => toggle(p.key)}>
          <View style={[st.permCheck, perms.has(p.key) && st.permCheckOn]}>
            {perms.has(p.key) && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={st.permLabel}>{t('company.' + p.i18n)}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleCreate} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.btnTxt}>{t('company.newRoleTitle')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function CompanyScreen({ navigation }) {
  const [company,      setCompany]      = useState(null);
  const [farmsList,    setFarmsList]    = useState([]);
  const [members,      setMembers]      = useState([]);
  const [rolesList,    setRolesList]    = useState([]);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showAddFarm,  setShowAddFarm]  = useState(false);
  const [showInvite,   setShowInvite]   = useState(false);
  const [showAddRole,  setShowAddRole]  = useState(false);
  const [companyId,    setCompanyId]    = useState(null);

  const loadRoles = useCallback(async () => {
    try {
      const res = await roles.list();
      setRolesList(res.roles ?? []);
    } catch {}
  }, []);

  const load = useCallback(async (cid) => {
    try {
      const [companyRes] = await Promise.all([
        companies.get(cid),
        loadRoles(),
      ]);
      setCompany(companyRes.company);
      setFarmsList(companyRes.farms ?? []);
      setMembers(companyRes.members ?? []);
    } catch {}
  }, [loadRoles]);

  useEffect(() => {
    users.me().then(({ user }) => {
      setCurrentUser(user);
      setCompanyId(user.company_id);
      if (user.company_id) return load(user.company_id);
    }).finally(() => setLoading(false));
  }, [load]);

  const canManage = currentUser?.role === 'gerant' || currentUser?.role === 'admin';

  const handleOrgCreated = (company) => {
    setCompanyId(company.id);
    setCompany(company);
    setFarmsList([]);
    setMembers([]);
    loadRoles();
  };

  const handleFarmCreated = (farm) => {
    setFarmsList(prev => [farm, ...prev]);
    setShowAddFarm(false);
  };

  const handleFarmChanged = (updatedFarm) => {
    setFarmsList(prev => prev.map(f => f.id === updatedFarm.id ? { ...f, ...updatedFarm } : f));
  };

  const handleFarmDeleted = (farmId) => {
    setFarmsList(prev => prev.filter(f => f.id !== farmId));
  };

  const handleMemberInvited = () => {
    setShowInvite(false);
    load(companyId);
  };

  const handleMemberRoleChange = () => load(companyId);
  const handleRoleSaved        = () => { loadRoles(); load(companyId); };
  const handleRoleDeleted      = () => { loadRoles(); load(companyId); };

  return (
    <View style={st.root}>
      <View style={st.header}>
        <TouchableOpacity style={st.back} onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>{t('company.back')}</Text>
        </TouchableOpacity>
        <Text style={st.title}>{company?.nom ?? t('company.title')}</Text>
        {company && (
          <View style={st.statsBadges}>
            <View style={st.statBadge}><Text style={st.statBadgeTxt}>🌾 {farmsList.length}</Text></View>
            <View style={st.statBadge}><Text style={st.statBadgeTxt}>👥 {members.length}</Text></View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      ) : companyId === null ? (
        <ScrollView style={st.scroll} contentContainerStyle={[st.scrollContent, { justifyContent: 'center', flexGrow: 1 }]}>
          <CreateOrganizationView onCreated={handleOrgCreated} />
        </ScrollView>
      ) : (
        <ScrollView style={st.scroll} contentContainerStyle={[st.scrollContent, { flexGrow: 1, paddingBottom: 40 }]} showsVerticalScrollIndicator>

          {/* Fermes */}
          <SectionCard
            icon="🌾"
            title={t('company.farms')}
            sub={t('company.farmsSub')}
            action={
              <TouchableOpacity style={st.addBtn} onPress={() => setShowAddFarm(v => !v)}>
                <Text style={st.addBtnTxt}>{showAddFarm ? '✕' : t('company.addFarm')}</Text>
              </TouchableOpacity>
            }
          >
            {showAddFarm && companyId && (
              <AddFarmForm companyId={companyId} onCreated={handleFarmCreated} />
            )}
            {farmsList.length === 0 && !showAddFarm
              ? <Text style={st.empty}>{t('company.noFarms')}</Text>
              : farmsList.map(f => <FarmCard key={f.id} farm={f} canManage={canManage} onChanged={handleFarmChanged} onDeleted={handleFarmDeleted} />)
            }
          </SectionCard>

          {/* Membres */}
          <SectionCard
            icon="👥"
            title={t('company.members')}
            sub={t('company.membersSub')}
            action={
              <TouchableOpacity style={st.addBtn} onPress={() => setShowInvite(v => !v)}>
                <Text style={st.addBtnTxt}>{showInvite ? '✕' : t('company.invite')}</Text>
              </TouchableOpacity>
            }
          >
            {showInvite && companyId && (
              <InviteForm companyId={companyId} rolesList={rolesList} onInvited={handleMemberInvited} />
            )}
            {members.length === 0 && !showInvite
              ? <Text style={st.empty}>{t('company.noMembers')}</Text>
              : members.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    rolesList={rolesList}
                    canManage={canManage}
                    onRoleChange={handleMemberRoleChange}
                  />
                ))
            }
          </SectionCard>

          {/* Rôles & Permissions */}
          {canManage && (
            <SectionCard
              icon="🔑"
              title={t('company.roles')}
              sub={t('company.rolesSub')}
              action={
                <TouchableOpacity style={st.addBtn} onPress={() => setShowAddRole(v => !v)}>
                  <Text style={st.addBtnTxt}>{showAddRole ? '✕' : t('company.addRole')}</Text>
                </TouchableOpacity>
              }
            >
              {showAddRole && (
                <CreateRoleForm onCreated={() => { setShowAddRole(false); handleRoleSaved(); }} />
              )}
              {rolesList.map(r => (
                <RoleCard key={r.id} role={r} onSaved={handleRoleSaved} onDeleted={handleRoleDeleted} />
              ))}
            </SectionCard>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const st = StyleSheet.create({
  root:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.background },
  header:      { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0d1520', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 24, paddingVertical: 12 },
  back:        { paddingVertical: 6, paddingRight: 12 },
  backTxt:     { color: COLORS.accent, fontSize: 16 },
  title:       { color: COLORS.text, fontSize: 17, fontWeight: '700', flex: 1 },
  statsBadges: { flexDirection: 'row', gap: 8 },
  statBadge:   { backgroundColor: '#1a2535', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  statBadgeTxt:{ color: COLORS.text, fontSize: 13, fontWeight: '600' },

  scroll:       { flex: 1, overflow: 'hidden' },
  scrollContent: { padding: 24, gap: 20, maxWidth: 800, alignSelf: 'center', width: '100%' },

  card:        { backgroundColor: '#0d1520', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardTitle:   { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  cardSub:     { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  cardBody:    { padding: 16, gap: 12 },

  addBtn:      { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent + '66', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt:   { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  addForm:     { backgroundColor: '#111e2e', borderRadius: 10, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  zonesSummary:    { backgroundColor: COLORS.accent + '22', borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent + '55', padding: 10 },
  zonesSummaryTxt: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  row2:        { flexDirection: 'row', gap: 12 },
  field:       { flex: 1, gap: 6 },
  fieldLabel:  { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { backgroundColor: '#1a2535', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  btn:         { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnTxt:      { color: '#fff', fontSize: 14, fontWeight: '700' },

  farmCard:    { backgroundColor: '#111e2e', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 8 },
  farmCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmCardArrow: { color: COLORS.textSecondary, fontSize: 11, paddingLeft: 4 },
  farmIcon:    { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a3520', alignItems: 'center', justifyContent: 'center' },
  farmName:    { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  farmAddr:    { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  parcellesBadge: { backgroundColor: COLORS.accent + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  parcellesBadgeTxt: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  gpsBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0a1520', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  gpsCoords:   { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'monospace' },
  farmEditPanel:    { gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  farmEditSection:  { gap: 8 },
  farmEditSectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  parcelleEditRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  parcelleBlock:      { gap: 6, marginBottom: 6 },
  parcelleIconBtn:    { width: 38, height: 38, borderRadius: 8, backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent + '44', alignItems: 'center', justifyContent: 'center' },
  parcelleDelBtn:     { width: 38, height: 38, borderRadius: 8, backgroundColor: '#ff444422', borderWidth: 1, borderColor: '#ff444444', alignItems: 'center', justifyContent: 'center' },
  parcelleDetailPanel:{ backgroundColor: COLORS.bg + '88', borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: COLORS.accent + '33', marginTop: 2 },
  row2:               { flexDirection: 'row', gap: 10 },
  farmEditActions:    { flexDirection: 'row', gap: 10, marginTop: 4 },

  memberCardWrap: { gap: 0 },
  memberCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111e2e', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334' },
  memberInitials: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  memberName:  { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  memberEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },
  roleBadge:      { backgroundColor: '#1a2535', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  roleBadgeGerant: { borderColor: '#f5a623' + '88', backgroundColor: '#f5a623' + '11' },
  roleBadgeTxt:   { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  rolePicker:     { backgroundColor: '#0d1520', borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent + '44', overflow: 'hidden', marginTop: 2 },
  rolePickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a2535' },
  rolePickerItemActive: { backgroundColor: COLORS.accent + '11' },
  rolePickerTxt:  { color: COLORS.textSecondary, fontSize: 13 },

  // Invite form role selector
  roleRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: '#1a2535' },
  roleBtnActive:  { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
  roleBtnTxt:     { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  roleBtnTxtActive: { color: COLORS.accent },

  // Role cards
  roleCard:        { backgroundColor: '#111e2e', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 10 },
  roleCardHead:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleCardName:    { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  roleCardArrow:   { color: COLORS.textSecondary, fontSize: 12, paddingLeft: 6 },
  roleNameInput:   { color: COLORS.text, fontSize: 14, fontWeight: '700', backgroundColor: '#1a2535', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 7 },
  memberCountBadge: { backgroundColor: '#1a2535', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border },
  memberCountTxt:  { color: COLORS.textSecondary, fontSize: 11 },
  permRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  permCheck:       { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#1a2535', alignItems: 'center', justifyContent: 'center' },
  permCheckOn:     { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  permLabel:       { color: COLORS.textSecondary, fontSize: 13 },
  roleCardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  deleteBtn:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  deleteBtnConfirm: { borderColor: '#ff4444' },
  deleteBtnTxt:    { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  empty:       { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  emptyState:      { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyStateTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyStateSub:   { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  createOrgForm:   { width: '100%', maxWidth: 420, backgroundColor: '#0d1520', borderRadius: 14, padding: 24, borderWidth: 1, borderColor: COLORS.border, gap: 16 },
});

