# 📦 Architecture Base de Données — TechFarm

## Hiérarchie des données

```
Company
  └── Farm (exploitation agricole)
        └── Parcelle (zone cultivée)
              ├── Kit (ensemble de capteurs)
              │     └── Capteur (individuel)
              │           └── Mesure (timeseries → TimescaleDB)
              ├── Recolte
              └── Photo (→ MinIO)
```

---

## Schéma Relationnel Complet

> 📌 Copie le bloc ci-dessous sur [dbdiagram.io](https://dbdiagram.io/d)

```dbml
Table users {
  id            int           [pk, increment]
  email         varchar(255)  [unique, not null]
  password_hash varchar(255)  [not null]
  role          varchar(20)   [default: 'farmer', note: 'admin | farmer | viewer']
  company_id    int
  created_at    timestamp
  updated_at    timestamp
}

Table sessions {
  id            varchar(128)  [pk]
  user_id       int           [not null]
  expires_at    timestamp     [not null]
  ip_address    varchar(45)
  created_at    timestamp
}

Table company {
  id            int           [pk, increment]
  nom           varchar(255)  [not null]
  telephone     varchar(20)
  code_postal   varchar(10)
  country       varchar(100)
  created_at    timestamp
}

Table farm {
  id            int           [pk, increment]
  nom           varchar(255)  [not null]
  company_id    int           [not null]
  adresse       varchar(255)
  code_postal   varchar(10)
  country       varchar(100)
  created_at    timestamp
}

Table parcelle {
  id            int           [pk, increment]
  farm_id       int           [not null]
  nom           varchar(255)  [not null]
  superficie_ha decimal(10,2) [note: 'hectares']
  culture_type  varchar(100)  [note: 'blé, maïs, vigne...']
  position_lat  decimal(10,7) [note: 'GPS latitude']
  position_lng  decimal(10,7) [note: 'GPS longitude']
  created_at    timestamp
}

Table kit {
  id                int           [pk, increment]
  parcelle_id       int           [not null]
  nom               varchar(255)  [note: 'ex: Kit Nord-Est']
  modele            varchar(100)  [note: 'ex: TechFarm v1']
  date_installation timestamp
  actif             boolean       [default: true]
  created_at        timestamp
}

Table capteur {
  id            int           [pk, increment]
  kit_id        int           [not null]
  type          varchar(50)   [note: 'temperature | humidite_air | humidite_sol | luminosite | ph | qualite_air | debit_eau']
  unite         varchar(20)   [note: '°C, %, lux, pH...']
  actif         boolean       [default: true]
  created_at    timestamp
}

Table mesure {
  time          timestamp     [not null, note: 'hypertable TimescaleDB']
  capteur_id    int           [not null]
  valeur        decimal(10,4) [not null]
  qualite       smallint      [default: 1, note: '1:ok | 0:suspect | -1:erreur']
}

Table recolte {
  id            int           [pk, increment]
  parcelle_id   int           [not null]
  date_recolte  date          [not null]
  culture_type  varchar(100)
  quantite_kg   decimal(10,2)
  qualite_note  smallint      [note: '1 à 5']
  commentaire   text
  created_at    timestamp
}

Table photo {
  id            int           [pk, increment]
  url_path      varchar(500)  [not null, note: 'URL MinIO']
  entity_type   varchar(50)   [note: 'parcelle | kit | recolte | farm']
  entity_id     int           [not null]
  uploaded_by   int
  uploaded_at   timestamp
}

Ref: users.company_id    > company.id
Ref: sessions.user_id    > users.id
Ref: farm.company_id     > company.id
Ref: parcelle.farm_id    > farm.id
Ref: kit.parcelle_id     > parcelle.id
Ref: capteur.kit_id      > kit.id
Ref: mesure.capteur_id   > capteur.id
Ref: recolte.parcelle_id > parcelle.id
Ref: photo.uploaded_by   > users.id
```

---

## Détail des Tables

### 🔐 Auth

| Table | Rôle |
|-------|------|
| `users` | Comptes utilisateurs avec rôle (`admin`, `farmer`, `viewer`) |
| `sessions` | Tokens de session actifs avec expiration |

---

### 🏢 Company & Farm

| Table | Rôle |
|-------|------|
| `company` | Entreprise ou exploitation mère |
| `farm` | Exploitation agricole rattachée à une company |
| `parcelle` | Zone cultivée au sein d'une farm |

---

### 📡 IoT

| Table | Rôle |
|-------|------|
| `kit` | Ensemble de capteurs installés sur une parcelle |
| `capteur` | Capteur individuel (DHT22, BH1750, etc.) |
| `mesure` | Données timeseries → **TimescaleDB** |

---

### 🌾 Métier

| Table | Rôle |
|-------|------|
| `recolte` | Historique des récoltes par parcelle |
| `photo` | Médias stockés sur **MinIO** (S3-compatible) |

---

## Collections MongoDB (Alertes & IA)

> ⚠️ Ces données ne passent **pas** par PostgreSQL — schéma NoSQL

```js
// Collection : alertes
{
  _id:                  ObjectId,
  parcelle_id:          12,           // FK vers PostgreSQL
  capteur_id:           5,
  type:                 "seuil_depasse",  // seuil_depasse | anomalie | maladie
  severite:             "warning",        // info | warning | critical
  valeur_declenchante:  87.3,
  message:              "Humidité sol critique",
  lu:                   false,
  created_at:           ISODate()
}

// Collection : predictions_ia
{
  _id:             ObjectId,
  parcelle_id:     12,
  modele:          "maladie_detection_v2",
  prediction:      "risque_mildiou",
  score:           0.82,
  horizon_heures:  48,
  recommandation:  "Appliquer traitement fongicide",
  created_at:      ISODate()
}
```

---

## Stack de Stockage

| Technologie | Usage |
|-------------|-------|
| **PostgreSQL + TimescaleDB** | Données relationnelles + timeseries IoT |
| **MongoDB** | Alertes temps réel + prédictions IA |
| **MinIO** | Stockage fichiers/photos (S3-compatible) |