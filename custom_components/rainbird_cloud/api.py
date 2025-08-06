# ====================================================================================
# FILE: custom_components/rainbird_cloud/api.py
# ====================================================================================
"""Rain Bird Cloud API Client."""

import asyncio
import base64
import logging
import time
from typing import Dict, List, Optional

import aiohttp
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    API_BASE_URL,
    FALLBACK_CLIENT_ID,
    FALLBACK_CLIENT_SECRET,
    DEFAULT_CONTROLLER_ID,
    START_STATIONS_ENDPOINT,
    STATIONS_ENDPOINT,
    STOP_ALL_ENDPOINT,
    TOKEN_ENDPOINT,
    USER_AGENT,
)

_LOGGER = logging.getLogger(__name__)


class RainBirdCloudAPIError(Exception):
    """Rain Bird Cloud API error."""


class RainBirdCloudAPI:
    """Rain Bird Cloud API client with dynamic credential management."""

    def __init__(self, hass, access_token: str, refresh_token: str, expires_in: int = 7200):
        """Initialize the API client."""
        self.hass = hass
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at = time.time() + expires_in - 300  # 5 min de marge
        self.session = async_get_clientsession(hass)
        self.controller_id = DEFAULT_CONTROLLER_ID
        self._stations_cache = {}
        self.client_id = None
        self.client_secret = None

    async def _get_credentials(self) -> Tuple[str, str]:
        """Get OAuth2 credentials (cached or extract dynamically)."""
        if self.client_id and self.client_secret:
            return self.client_id, self.client_secret

        # Import here to avoid circular dependency
        from .app_extractor import AppCredentialsExtractor
        
        _LOGGER.debug("Extracting OAuth2 credentials for token refresh")
        
        extractor = AppCredentialsExtractor(self.hass)
        client_id, client_secret = await extractor.extract_credentials()
        
        if client_id and client_secret:
            self.client_id = client_id
            self.client_secret = client_secret
        else:
            _LOGGER.warning("Using fallback credentials for token refresh")
            self.client_id = FALLBACK_CLIENT_ID
            self.client_secret = FALLBACK_CLIENT_SECRET

        return self.client_id, self.client_secret

    async def _refresh_access_token(self) -> str:
        """Refresh access token using refresh token with dynamic credentials."""
        if time.time() < self.token_expires_at:
            return self.access_token

        _LOGGER.debug("Refreshing access token")
        
        # Récupérer les credentials dynamiquement
        client_id, client_secret = await self._get_credentials()
        
        # Encode client credentials
        credentials = f"{client_id}:{client_secret}"
        auth_header = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
        }

        data = {
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
        }

        try:
            async with self.session.post(
                f"{API_BASE_URL}{TOKEN_ENDPOINT}",
                headers=headers,
                data=data,
            ) as response:
                if response.status != 200:
                    raise RainBirdCloudAPIError(f"Token refresh failed: {response.status}")
                
                token_data = await response.json()
                self.access_token = token_data["access_token"]
                # Mettre à jour le refresh token s'il est fourni
                if "refresh_token" in token_data:
                    self.refresh_token = token_data["refresh_token"]
                
                self.token_expires_at = time.time() + token_data.get("expires_in", 7200) - 300
                
                _LOGGER.debug("Access token refreshed successfully")
                return self.access_token

        except Exception as err:
            _LOGGER.error("Failed to refresh token: %s", err)
            raise RainBirdCloudAPIError(f"Token refresh failed: {err}")

    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make authenticated API request."""
        access_token = await self._refresh_access_token()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            **kwargs.pop("headers", {}),
        }

        url = f"{API_BASE_URL}{endpoint}"
        
        try:
            async with self.session.request(method, url, headers=headers, **kwargs) as response:
                if response.status == 401:
                    # Token expired, try once more
                    _LOGGER.warning("Access token expired, refreshing...")
                    self.access_token = None
                    access_token = await self._refresh_access_token()
                    headers["Authorization"] = f"Bearer {access_token}"
                    
                    async with self.session.request(method, url, headers=headers, **kwargs) as retry_response:
                        if retry_response.status != 200:
                            raise RainBirdCloudAPIError(f"API request failed: {retry_response.status}")
                        return await retry_response.json() if retry_response.content_type == "application/json" else {}
                
                elif response.status != 200:
                    raise RainBirdCloudAPIError(f"API request failed: {response.status}")
                
                return await response.json() if response.content_type == "application/json" else {}

        except Exception as err:
            _LOGGER.error("API request failed: %s", err)
            raise RainBirdCloudAPIError(f"API request failed: {err}")

    async def get_controllers(self) -> List[Dict]:
        """Get list of controllers."""
        try:
            # Cette API peut ne pas exister, on utilisera des valeurs par défaut
            result = await self._make_request("GET", f"{CONTROLLERS_ENDPOINT}?satelliteId=0")
            return result.get("controllers", [])
        except Exception:
            # Fallback vers votre contrôleur connu
            return [{"id": self.controller_id, "name": "Rain Bird RC2"}]

    async def get_stations(self, controller_id: Optional[int] = None) -> List[Dict]:
        """Get list of stations/zones."""
        if controller_id is None:
            controller_id = self.controller_id

        # Cache des stations
        if controller_id in self._stations_cache:
            return self._stations_cache[controller_id]

        try:
            # Essayer de récupérer via l'API
            result = await self._make_request("GET", f"{STATIONS_ENDPOINT}?satelliteId={controller_id}")
            stations = result.get("stations", [])
        except Exception:
            # Fallback vers vos zones connues
            stations = [
                {"id": 10782087, "name": "Zone 1", "controllerId": controller_id},
                {"id": 10782088, "name": "Zone 2", "controllerId": controller_id},
                {"id": 10782089, "name": "Zone 3", "controllerId": controller_id},
                {"id": 10782090, "name": "Zone 4", "controllerId": controller_id},
            ]

        self._stations_cache[controller_id] = stations
        return stations

    async def start_stations(self, station_ids: List[int], durations: List[int]) -> bool:
        """Start irrigation for specified stations."""
        if len(station_ids) != len(durations):
            raise ValueError("station_ids and durations must have the same length")

        payload = {
            "stationIds": station_ids,
            "seconds": durations,
        }

        try:
            await self._make_request("POST", START_STATIONS_ENDPOINT, json=payload)
            _LOGGER.info("Started irrigation for stations: %s", station_ids)
            return True
        except Exception as err:
            _LOGGER.error("Failed to start stations: %s", err)
            return False

    async def start_station(self, station_id: int, duration: int = 300) -> bool:
        """Start irrigation for a single station."""
        return await self.start_stations([station_id], [duration])

    async def stop_all_irrigation(self, controller_id: Optional[int] = None) -> bool:
        """Stop all irrigation."""
        if controller_id is None:
            controller_id = self.controller_id
            
        try:
            await self._make_request("POST", STOP_ALL_ENDPOINT, json=[controller_id])
            _LOGGER.info("Stopped all irrigation")
            return True
        except Exception as err:
            _LOGGER.error("Failed to stop irrigation: %s", err)
            return False

    async def test_connection(self) -> bool:
        """Test API connection."""
        try:
            await self._refresh_access_token()
            return True
        except Exception:
            return False
