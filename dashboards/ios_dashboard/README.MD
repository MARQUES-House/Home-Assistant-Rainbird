# 📁 Structure et Installation - Dashboard iOS Premium

## 🏗️ Structure des Fichiers

Votre configuration Home Assistant aura cette structure modulaire :

```
config/
├── dashboards/
│   ├── dashboard.yaml              # Configuration principale
│   └── views/
│       ├── home.yaml              # Page Accueil
│       ├── equipment.yaml         # Page Matériel
│       ├── rooms.yaml             # Page Pièces
│       ├── outdoor.yaml           # Page Extérieur
│       ├── system.yaml            # Page Système
│       └── automations.yaml       # Page Automatisations
├── input_select.yaml              # Sélecteurs intelligents
├── sensors.yaml                   # Capteurs template climat
├── groups.yaml                    # Groupes d'entités
└── configuration.yaml             # Configuration principale
```

## 📦 Dépendances HACS Requises

### Cartes Essentielles
```bash
# Via HACS → Frontend
1. Mushroom Cards (priorité maximale)
2. Button Card
3. Mini Media Player
4. Swipe Card
5. Fold Entity Row
6. Card Mod
7. Mini Graph Card
8. Browser Mod (pour popups)
```

### Intégrations Optionnelles
```bash
# Via HACS → Intégrations
1. Watchman (surveillance entités)
2. HACS (Home Assistant Community Store)
3. Scheduler Component
4. Average Sensor
```

## ⚙️ Configuration Principale

### Dans `configuration.yaml`, ajoutez :

```yaml
# Inclusion des fichiers modulaires
input_select: !include input_select.yaml
group: !include groups.yaml
template: !include sensors.yaml

# Configuration du dashboard principal
lovelace:
  mode: yaml
  resources:
    - url: /hacsfiles/lovelace-mushroom/mushroom.js
      type: module
    - url: /hacsfiles/button-card/button-card.js
      type: module
    - url: /hacsfiles/mini-media-player/mini-media-player-bundle.js
      type: module
    - url: /hacsfiles/swipe-card/swipe-card.js
      type: module
    - url: /hacsfiles/lovelace-fold-entity-row/fold-entity-row.js
      type: module
    - url: /hacsfiles/lovelace-card-mod/card-mod.js
      type: module
    - url: /hacsfiles/mini-graph-card/mini-graph-card-bundle.js
      type: module
    - url: /hacsfiles/browser_mod/browser_mod.js
      type: module
  dashboards:
    lovelace-ios:
      mode: yaml
      title: iOS Dashboard Premium
      icon: mdi:tablet
      show_in_sidebar: true
      filename: dashboards/dashboard.yaml
```

## 🎨 Thème iOS Requis

### Installation du thème via HACS :
1. **HACS** → **Frontend** → **Explore & Download Repositories**
2. Cherchez **"iOS Dark Mode and Light Mode"**
3. Installez le thème
4. Redémarrez Home Assistant
5. Activez dans **Configuration** → **General** → **Themes**

## 🧩 Entités Nécessaires

### Input Boolean pour le thème :
```yaml
# Dans configuration.yaml
input_boolean:
  theme_sombre:
    name: "Thème Sombre"
    icon: mdi:theme-light-dark
```

### Capteurs Système (optionnels mais recommandés) :
```yaml
# Via Configuration → Intégrations → System Monitor
- Processor Use
- Memory Use Percent  
- Disk Use Percent
- Network Throughput
- CPU Temperature
```

## 🚀 Installation Étape par Étape

### 1. Préparation
```bash
# Créez la structure de dossiers
mkdir -p config/dashboards/views
```

### 2. Installation HACS et Cartes
1. Installez toutes les cartes listées ci-dessus
2. Redémarrez Home Assistant après chaque installation

### 3. Configuration des Fichiers
1. Copiez chaque fichier YAML dans son emplacement
2. Adaptez les noms d'entités à votre configuration
3. Testez progressivement chaque page

### 4. Validation
```bash
# Vérifiez la configuration
Configuration → Server Controls → Check Configuration
```

## 🔧 Personnalisation

### Adaptation des Entités
Remplacez ces entités par les vôtres :
- `climate.adele` → `climate.votre_zone`
- `cover.fenetre_salon_*` → `cover.vos_volets`
- `light.module_on_off` → `light.vos_lumières`
- `media_player.samsung_*` → `media_player.votre_tv`

### Couleurs et Style
Modifiez dans chaque fichier `views/*.yaml` :
```yaml
# Changez les couleurs dans les styles button-card
background: rgba(68, 115, 158, 0.1)  # Bleu par défaut
border: 1px solid rgba(68, 115, 158, 0.3)
```

### Icônes et Emojis
Personnalisez selon vos préférences :
- 🧸 Adèle → 👧 Votre fille
- 🎮 Alex → 👦 Votre fils  
- 💼 Bureau → 🏢 Votre espace

## ⚡ Optimisations Performance

### 1. Cache et Resources
```yaml
# Dans configuration.yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
```

### 2. Base de Données
```yaml
# Optimisation recorder
recorder:
  purge_keep_days: 7
  auto_purge: true
  exclude:
    entity_globs:
      - sensor.*_battery
    domains:
      - automation
```

### 3. Frontend Cache
```yaml
frontend:
  themes: !include_dir_merge_named themes
  extra_module_url:
    - /hacsfiles/lovelace-card-mod/card-mod.js
```

## 🐛 Résolution de Problèmes

### Erreurs Communes

**"Entité non trouvée"** :
- Vérifiez que l'entité existe dans **États**
- Adaptez le nom à votre configuration

**"Carte non trouvée"** :
- Installez la carte manquante via HACS
- Redémarrez Home Assistant
- Videz le cache navigateur (Ctrl+F5)

**"Configuration invalide"** :
- Vérifiez l'indentation YAML
- Utilisez **Check Configuration** avant redémarrage

### Diagnostic
```yaml
# Ajoutez pour déboguer
logger:
  default: warning
  logs:
    custom_components.hacs: debug
    homeassistant.components.lovelace: debug
```

## 🎯 Résultat Final

Vous obtiendrez un dashboard avec :
- ✅ **6 pages** complètes et fonctionnelles
- ✅ **Navigation fluide** entre les sections
- ✅ **Design iOS** glassmorphism moderne
- ✅ **Contrôles intelligents** avec popups
- ✅ **Monitoring avancé** système et réseau
- ✅ **Automatisations** complètes et statistiques

**Temps d'installation estimé :** 2-3 heures  
**Niveau de difficulté :** Intermédiaire  
**Maintenance :** Minimale une fois configuré