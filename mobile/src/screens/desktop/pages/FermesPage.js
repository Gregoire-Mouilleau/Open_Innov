import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { kits as kitsApi, parcelles as parcellesApi, alertes as alertesApi } from '../../../services/api';
import { st } from '../styles';

export default function FermesPage({ farmsList }) {
  const [stats, setStats]     = React.useState({});   // { [farmId]: { parcelles, capteurs, alertes } }
  const [loading, setLoading] = React.useState(true);

  // Compteurs réels par ferme : parcelles, capteurs (via kits), alertes (via parcelle_id).
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [allKitsRes, alertesRes, ...parcellesResAll] = await Promise.allSettled([
          kitsApi.list(),
          alertesApi.list({ limit: 100 }),
          ...farmsList.map(f => parcellesApi.list(f.id)),
        ]);

        const allKits    = allKitsRes.status  === 'fulfilled' ? (allKitsRes.value.kits ?? [])     : [];
        const allAlertes = alertesRes.status  === 'fulfilled' ? (alertesRes.value.alertes ?? [])  : [];

        // parcelle_id → farmId (depuis les listes par ferme, dans l'ordre de farmsList)
        const parcelleToFarm = {};
        const parcelleCount  = {};
        farmsList.forEach((farm, i) => {
          const res = parcellesResAll[i];
          const parcelles = res?.status === 'fulfilled' ? (res.value.parcelles ?? []) : [];
          parcelleCount[farm.id] = parcelles.length;
          for (const p of parcelles) parcelleToFarm[p.id] = farm.id;
        });

        const capteursByFarm = {};
        for (const k of allKits) {
          const farmId = parcelleToFarm[k.parcelle_id];
          if (farmId == null) continue;
          capteursByFarm[farmId] = (capteursByFarm[farmId] ?? 0) + (parseInt(k.nb_capteurs, 10) || 0);
        }

        const alertesByFarm = {};
        for (const a of allAlertes) {
          const farmId = parcelleToFarm[a.parcelle_id];
          if (farmId == null) continue;
          alertesByFarm[farmId] = (alertesByFarm[farmId] ?? 0) + 1;
        }

        const next = {};
        for (const farm of farmsList) {
          next[farm.id] = {
            parcelles: parcelleCount[farm.id]   ?? 0,
            capteurs:  capteursByFarm[farm.id]   ?? 0,
            alertes:   alertesByFarm[farm.id]    ?? 0,
          };
        }
        if (alive) setStats(next);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [farmsList]);

  return (
    <ScrollView style={st.pagePad} showsVerticalScrollIndicator={false}>
      <View style={st.pageHdr}>
        <Text style={st.pageTitle}>Fermes</Text>
        <Text style={st.pageSub}>{farmsList.length} ferme{farmsList.length !== 1 ? 's' : ''} enregistrée{farmsList.length !== 1 ? 's' : ''}</Text>
      </View>
      {farmsList.length === 0 ? (
        <View style={st.emptyState}>
          <Text style={st.emptyIco}>⌂</Text>
          <Text style={st.emptyTxt}>Aucune ferme disponible</Text>
        </View>
      ) : (
        <View style={st.farmGrid}>
          {farmsList.map(farm => {
            const s = stats[farm.id];
            const fmt = (v) => loading ? '…' : String(v ?? 0);
            // « Actif » = la ferme possède des capteurs (équipement IoT en place).
            const actif = (s?.capteurs ?? 0) > 0;
            return (
              <View key={farm.id} style={st.farmGridCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>⌂</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>{farm.nom}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 1 }}>{farm.adresse ?? '—'}</Text>
                  </View>
                  <View style={{ backgroundColor: actif ? '#1a3a1a' : '#3a1a1a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                    <Text style={{ color: actif ? COLORS.accent : '#e74c3c', fontSize: 10, fontWeight: '700' }}>
                      {loading ? '…' : actif ? 'ACTIF' : 'INACTIF'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { val: fmt(s?.parcelles), lbl: 'Parcelles' },
                    { val: fmt(s?.capteurs),  lbl: 'Capteurs' },
                    { val: fmt(s?.alertes),   lbl: 'Alertes' },
                  ].map(stat => (
                    <View key={stat.lbl} style={st.farmStatChip}>
                      <Text style={st.farmStatVal}>{stat.val}</Text>
                      <Text style={st.farmStatLbl}>{stat.lbl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
