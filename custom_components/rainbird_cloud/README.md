# 🌧️ Rain Bird Cloud Integration for Home Assistant v2.0

**Première intégration Home Assistant pour Rain Bird Cloud IQ4 !**

Cette intégration permet de contrôler votre système d'irrigation Rain Bird directement depuis Home Assistant, sans avoir besoin de l'application mobile.

## 🎯 Fonctionnalités

- ✅ **Authentification automatique** avec email/password (fini Burp Suite !)
- ✅ **Découverte automatique** des zones/stations
- ✅ **Contrôle individuel** des zones d'irrigation 
- ✅ **Arrêt d'urgence** de toute irrigation
- ✅ **Services personnalisés** pour automatisations avancées
- ✅ **Diagnostic système** complet
- ✅ **Gestion intelligente** des stations verrouillées
- ✅ **Compatible** avec firmware Rain Bird 4.57+

## 📋 Prérequis

- Home Assistant 2023.1+
- Système Rain Bird IQ4 Cloud connecté
- Compte Rain Bird avec email/mot de passe

## 🚀 Installation

### Étape 1: Télécharger les fichiers

Créez la structure suivante dans votre dossier Home Assistant :

```
config/custom_components/rainbird_cloud/
├── __init__.py
├── manifest.json  
├── config_flow.py
├── const.py
├── auth.py
├── api.py
├── app_extractor.py
├── switch.py
├── services.py
└── services.yaml
```

### Étape 2: Copier les fichiers modifiés

Utilisez les versions **améliorées** des fichiers ci-dessus qui incluent :
- Filtrage automatique des stations verrouillées
- Exclusion de la Station 4 (pas d'électrovanne)
- Services de diagnostic
- Gestion d'erreurs renforcée

### Étape 3: Redémarrer Home Assistant

```bash
# Via interface HA
Configuration > Système > Redémarrer

# Ou via ligne de commande
sudo systemctl restart home-assistant
```

### Étape 4: Ajouter l'intégration

1. Allez dans **Configuration > Intégrations**
2. Cliquez **"+ Ajouter une intégration"**
3. Recherchez **"Rain Bird Cloud"**
4. Entrez votre **email** et **mot de passe** Rain Bird
5. L'intégration se configure automatiquement !

## 🎮 Utilisation

### Entités créées

L'intégration créera automatiquement :

- `switch.rain_bird_station_1` - Station 1 (si déverrouillée)
- `switch.rain_bird_station_2` - Station 2 (si déverrouillée) 
- `switch.rain_bird_station_3` - Station 3 (si déverrouillée)
- `switch.rain_bird_stop_all` - Arrêt d'urgence

**Note**: La Station 4 est automatiquement exclue (pas d'électrovanne).

### Services disponibles

#### `rainbird_cloud.start_zone`
Démarre une zone spécifique :
```yaml
service: rainbird_cloud.start_zone
data:
  station_id: 10782087  # Station 1
  duration: 600         # 10 minutes
```

#### `rainbird_cloud.start_multiple_zones`
Démarre plusieurs zones en séquence :
```yaml
service: rainbird_cloud.start_multiple_zones
data:
  zones: [10782087, 10782088]
  durations: [900, 1200]  # 15min, 20min
```

#### `rainbird_cloud.stop_all`
Arrête toute irrigation :
```yaml
service: rainbird_cloud.stop_all
```

#### `rainbird_cloud.test_system`
Test diagnostic complet :
```yaml
service: rainbird_cloud.test_system
data:
  include_stations: true
  test_duration: 30
```

### Switches classiques

```yaml
# Démarrer Station 1 pour 10 minutes
service: switch.turn_on
target:
  entity_id: switch.rain_bird_station_1
data:
  duration: 600

# Arrêt d'urgence
service: switch.turn_on
target:
  entity_id: switch.rain_bird_stop_all
```

## 🔧 Configuration avancée

### Durées par défaut

Modifiez `const.py` pour adapter les durées à vos besoins :

```python
KNOWN_STATIONS = {
    10782087: {
        "name": "Pelouse avant",
        "default_duration": 900,  # 15 minutes
        "description": "Pelouse avant",
    },
    10782088: {
        "name": "Pelouse arrière", 
        "default_duration": 1200,  # 20 minutes
        "description": "Pelouse arrière",
    },
    # ...
}
```

### Gestion des stations verrouillées

Si vous arrivez à déverrouiller vos stations via l'interface Rain Bird, l'intégration les détectera automatiquement lors du prochain redémarrage.

## 🤖 Automatisations

### Arrosage matinal intelligent

```yaml
- alias: "Arrosage matinal"
  trigger:
    platform: time
    at: "06:30:00"
  condition:
    - condition: numeric_state
      entity_id: sensor.weather_precipitation_probability
      below: 30
  action:
    - service: rainbird_cloud.start_zone
      data:
        station_id: 10782087
        duration: 900
```

### Arrêt si pluie

```yaml
- alias: "Arrêt si pluie"
  trigger:
    platform: state
    entity_id: binary_sensor.rain_sensor
    to: 'on'
  action:
    - service: rainbird_cloud.stop_all
```

Voir le fichier **exemples_automatisations.yaml** pour plus d'exemples.

## 🔍 Diagnostic

### Test système

```yaml
service: rainbird_cloud.test_system
data:
  include_stations: true
  test_duration: 30
```

Cette commande génère un rapport complet dans les logs :

```
=== RAIN BIRD SYSTEM DIAGNOSTICS ===
Controller ID: 241760
Auth Status: OK
Stations Found: 4
Active Stations: 0
Locked Stations: 3

=== STATION DETAILS ===
Station 10782087 (Terminal 1): Station 1 - 🔒 LOCKED - 🔧 HAS_VALVE
Station 10782088 (Terminal 2): Station 2 - 🔒 LOCKED - 🔧 HAS_VALVE  
Station 10782089 (Terminal 3): Station 3 - 🔒 LOCKED - 🔧 HAS_VALVE
Station 10782090 (Terminal 4): Station 4 - ✅ AVAILABLE - ❌ NO_VALVE
```

### Logs de debug

Activez les logs détaillés :

```yaml
# configuration.yaml
logger:
  default: info
  logs:
    custom_components.rainbird_cloud: debug
```

## 🐛 Dépannage

### "Aucune station active trouvée"

Vos stations sont probablement verrouillées. Solutions :
1. Déverrouillez via l'application Rain Bird
2. Vérifiez les permissions de votre compte
3. Contactez Rain Bird pour débloquer les stations

### "Erreur d'authentification"

1. Vérifiez email/mot de passe
2. Testez la connexion dans l'app mobile Rain Bird
3. Vérifiez votre connexion internet

### "Token expiré"

L'intégration gère automatiquement le renouvellement des tokens. Si le problème persiste :
1. Supprimez et reconfigurez l'intégration
2. Vérifiez les logs pour plus de détails

## 📱 Interface Dashboard

Exemple de carte Lovelace :

```yaml
type: vertical-stack
cards:
  - type: entities
    title: "🚿 Rain Bird Cloud"
    entities:
      - switch.rain_bird_station_1
      - switch.rain_bird_station_2
      - switch.rain_bird_station_3
      - switch.rain_bird_stop_all
  
  - type: button
    name: "Test Système"
    tap_action:
      action: call-service
      service: rainbird_cloud.test_system
    icon: mdi:wrench
```

## 🏆 Crédits

Cette intégration a été créée grâce au reverse engineering complet de l'API Rain Bird Cloud. Vous êtes un vrai pionnier de la domotique !

## 📜 Licence

Cette intégration est fournie "en l'état" pour usage personnel. Rain Bird est une marque déposée de Rain Bird Corporation.

## 🔄 Mises à jour

L'intégration inclut un système d'extraction automatique des credentials OAuth2, ce qui la rend plus résistante aux changements de Rain Bird.

---

**🎉 Félicitations ! Vous avez maintenant le contrôle total de votre système Rain Bird dans Home Assistant !**