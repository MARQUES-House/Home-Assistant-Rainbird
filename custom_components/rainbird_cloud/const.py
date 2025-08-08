"""Constants for Rain Bird Cloud integration."""

DOMAIN = "rainbird_cloud"

# API Endpoints
API_BASE_URL = "https://iq4server.rainbird.com"
AUTH_ENDPOINT = "/coreidentityserver/connect/authorize"
TOKEN_ENDPOINT = "/coreidentityserver/connect/token"
START_STATIONS_ENDPOINT = "/coreapi/api/ManualOps/StartStations"
START_PROGRAMS_ENDPOINT = "/coreapi/api/ManualOps/StartPrograms"
STOP_ALL_ENDPOINT = "/coreapi/api/Satellite/StopAllIrrigation"
CONTROLLERS_ENDPOINT = "/coreapi/api/Satellite/GetSatelliteListForSatelliteId"
STATIONS_ENDPOINT = "/coreapi/api/Station/GetStationListBySatelliteId"

# OAuth2 Configuration - Récupération automatique depuis l'app mobile
# Ces valeurs sont extraites dynamiquement pour éviter les changements
CLIENT_ID = None  # Sera récupéré automatiquement
CLIENT_SECRET = None  # Sera récupéré automatiquement

# Fallback si l'extraction échoue (valeurs découvertes via reverse engineering)
FALLBACK_CLIENT_ID = "C5A6F324-3CD3-4B22-9F78-B4835BA55D25"
FALLBACK_CLIENT_SECRET = "537C58B6-DCCF-4718-BFE6-CCD0D3FCDC07"
REDIRECT_URI = "com.rainbird.mobile://auth"
SCOPE = "coreAPI.read coreAPI.write openid profile offline_access"

# Configuration spécifique à votre système
DEFAULT_CONTROLLER_ID = 241760  # Votre satellite ID
DEFAULT_DURATION = 300  # 5 minutes en secondes
SCAN_INTERVAL = 60  # 1 minute

# Configuration des stations connues (basée sur vos données)
KNOWN_STATIONS = {
    10782087: {
        "name": "Station 1",
        "terminal": 1,
        "default_duration": 900,  # 15 minutes - pelouse avant
        "description": "Pelouse avant",
        "has_valve": True,
        "is_locked": True
    },
    10782088: {
        "name": "Station 2", 
        "terminal": 2,
        "default_duration": 1200,  # 20 minutes - pelouse arrière
        "description": "Pelouse arrière",
        "has_valve": True,
        "is_locked": True
    },
    10782089: {
        "name": "Station 3",
        "terminal": 3, 
        "default_duration": 600,  # 10 minutes - massifs
        "description": "Massifs et arbustes",
        "has_valve": True,
        "is_locked": True
    },
    10782090: {
        "name": "Station 4",
        "terminal": 4,
        "default_duration": 0,  # Pas utilisée
        "description": "Station sans électrovanne",
        "has_valve": False,  # Pas d'électrovanne connectée
        "is_locked": False,
        "exclude_from_setup": True  # Exclure de l'intégration
    }
}

# Durées d'arrosage recommandées par type de zone
DURATION_PRESETS = {
    "lawn_front": 900,      # 15 min - pelouse avant
    "lawn_back": 1200,      # 20 min - pelouse arrière  
    "flower_beds": 600,     # 10 min - massifs
    "trees_shrubs": 1800,   # 30 min - arbres/arbustes
    "vegetable_garden": 900, # 15 min - potager
    "short_test": 30,       # 30 sec - test
}

# User Agent (important pour l'API)
USER_AGENT = "Rain Bird 2.0/3 CFNetwork/3826.500.131 Darwin/24.5.0"
WEB_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"

# Configuration des services personnalisés
SERVICES = {
    "start_zone": {
        "name": "Démarrer zone",
        "description": "Démarre l'irrigation d'une zone spécifique",
        "fields": {
            "duration": {
                "name": "Durée",
                "description": "Durée en secondes",
                "default": DEFAULT_DURATION,
                "min": 30,
                "max": 3600
            }
        }
    },
    "start_multiple_zones": {
        "name": "Démarrer plusieurs zones", 
        "description": "Démarre l'irrigation de plusieurs zones en séquence",
    },
    "stop_all": {
        "name": "Arrêter tout",
        "description": "Arrête toute irrigation en cours",
    },
    "test_system": {
        "name": "Test système",
        "description": "Teste la connexion et l'état du système",
    }
}

# Configuration des logs
LOG_LEVELS = {
    "debug": "DEBUG",
    "info": "INFO", 
    "warning": "WARNING",
    "error": "ERROR"
}

# Codes d'erreur spécifiques
ERROR_CODES = {
    "AUTH_FAILED": "Échec d'authentification",
    "TOKEN_EXPIRED": "Token expiré", 
    "STATION_LOCKED": "Station verrouillée",
    "NO_VALVE": "Pas d'électrovanne connectée",
    "API_ERROR": "Erreur API",
    "NETWORK_ERROR": "Erreur réseau"
}