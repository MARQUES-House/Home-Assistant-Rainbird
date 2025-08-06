# ====================================================================================
# FILE: custom_components/rainbird_cloud/const.py
# ====================================================================================
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
STATIONS_ENDPOINT = "/coreapi/api/Station/GetStationsForSatelliteId"

# OAuth2 Configuration - Récupération automatique depuis l'app mobile
# Ces valeurs sont extraites dynamiquement pour éviter les changements
CLIENT_ID = None  # Sera récupéré automatiquement
CLIENT_SECRET = None  # Sera récupéré automatiquement

# Fallback si l'extraction échoue (valeurs découvertes via reverse engineering)
FALLBACK_CLIENT_ID = "5B0FA4CD-8248-4BEB-B89A-F0AF8A254DB5"
FALLBACK_CLIENT_SECRET = "537C58B6-DCCF-4718-BFE6-CCD0D3FCDC07"
REDIRECT_URI = "com.rainbird.mobile://auth"
SCOPE = "coreAPI.read coreAPI.write openid profile offline_access"

# Default values
DEFAULT_DURATION = 300  # 5 minutes en secondes
SCAN_INTERVAL = 60  # 1 minute
DEFAULT_CONTROLLER_ID = 241760

# User Agent (important pour l'API)
USER_AGENT = "Rain Bird 2.0/3 CFNetwork/3826.500.131 Darwin/24.5.0"
WEB_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"