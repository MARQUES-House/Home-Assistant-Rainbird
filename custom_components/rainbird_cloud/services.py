"""Rain Bird Cloud services."""

import logging
from typing import Any, Dict

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .api import RainBirdCloudAPI
from .const import DOMAIN, KNOWN_STATIONS

_LOGGER = logging.getLogger(__name__)

# Service schemas
START_ZONE_SCHEMA = vol.Schema({
    vol.Required("station_id"): cv.positive_int,
    vol.Optional("duration", default=300): vol.All(cv.positive_int, vol.Range(min=30, max=3600)),
})

START_MULTIPLE_ZONES_SCHEMA = vol.Schema({
    vol.Required("zones"): vol.All(cv.ensure_list, [cv.positive_int]),
    vol.Required("durations"): vol.All(cv.ensure_list, [vol.All(cv.positive_int, vol.Range(min=30, max=3600))]),
})

TEST_SYSTEM_SCHEMA = vol.Schema({
    vol.Optional("include_stations", default=True): cv.boolean,
    vol.Optional("test_duration", default=30): vol.All(cv.positive_int, vol.Range(min=10, max=120)),
})


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up Rain Bird Cloud services."""
    
    async def start_zone_service(call: ServiceCall) -> None:
        """Handle start zone service call."""
        station_id = call.data["station_id"]
        duration = call.data["duration"]
        
        # Trouver l'API instance
        api = _get_api_instance(hass)
        if not api:
            _LOGGER.error("Rain Bird API not available")
            return
            
        # Vérifier si la station existe et est disponible
        if station_id in KNOWN_STATIONS:
            station_info = KNOWN_STATIONS[station_id]
            if not station_info.get("has_valve", True):
                _LOGGER.error("Station %s has no valve connected", station_id)
                return
            if station_info.get("is_locked", False):
                _LOGGER.warning("Station %s is locked, attempting anyway", station_id)
                
        success = await api.start_station(station_id, duration)
        if success:
            _LOGGER.info("Successfully started station %s for %s seconds", station_id, duration)
        else:
            _LOGGER.error("Failed to start station %s", station_id)

    async def start_multiple_zones_service(call: ServiceCall) -> None:
        """Handle start multiple zones service call."""
        zones = call.data["zones"]
        durations = call.data["durations"]
        
        if len(zones) != len(durations):
            _LOGGER.error("Zones and durations must have the same length")
            return
            
        api = _get_api_instance(hass)
        if not api:
            _LOGGER.error("Rain Bird API not available") 
            return
            
        # Filtrer les zones sans électrovanne
        valid_zones = []
        valid_durations = []
        
        for zone_id, duration in zip(zones, durations):
            if zone_id in KNOWN_STATIONS:
                station_info = KNOWN_STATIONS[zone_id]
                if not station_info.get("has_valve", True):
                    _LOGGER.warning("Skipping station %s (no valve)", zone_id)
                    continue
                if station_info.get("exclude_from_setup", False):
                    _LOGGER.warning("Skipping excluded station %s", zone_id)
                    continue
                    
            valid_zones.append(zone_id)
            valid_durations.append(duration)
            
        if valid_zones:
            success = await api.start_stations(valid_zones, valid_durations)
            if success:
                _LOGGER.info("Successfully started %d zones", len(valid_zones))
            else:
                _LOGGER.error("Failed to start zones")
        else:
            _LOGGER.error("No valid zones to start")

    async def stop_all_service(call: ServiceCall) -> None:
        """Handle stop all service call."""
        api = _get_api_instance(hass)
        if not api:
            _LOGGER.error("Rain Bird API not available")
            return
            
        success = await api.stop_all_irrigation()
        if success:
            _LOGGER.info("Successfully stopped all irrigation")
        else:
            _LOGGER.error("Failed to stop irrigation")

    async def test_system_service(call: ServiceCall) -> None:
        """Handle test system service call."""
        include_stations = call.data["include_stations"]
        test_duration = call.data["test_duration"]
        
        api = _get_api_instance(hass)
        if not api:
            _LOGGER.error("Rain Bird API not available")
            return
            
        _LOGGER.info("Starting system diagnostic test...")
        
        # Test de diagnostic complet
        diagnostics = await api.get_system_diagnostics()
        
        _LOGGER.info("=== RAIN BIRD SYSTEM DIAGNOSTICS ===")
        _LOGGER.info("Controller ID: %s", diagnostics.get("controller_id"))
        _LOGGER.info("Auth Status: %s", diagnostics.get("auth_status"))
        _LOGGER.info("Token Valid: %s", diagnostics.get("token_valid"))
        _LOGGER.info("Stations Found: %s", diagnostics.get("stations_count"))
        _LOGGER.info("Active Stations: %s", diagnostics.get("active_stations"))
        _LOGGER.info("Locked Stations: %s", diagnostics.get("locked_stations"))
        
        if "error" in diagnostics:
            _LOGGER.error("System Error: %s", diagnostics["error"])
            return
            
        # Détail des stations
        if "station_details" in diagnostics:
            _LOGGER.info("=== STATION DETAILS ===")
            for station in diagnostics["station_details"]:
                status = "🔒 LOCKED" if station["locked"] else "✅ AVAILABLE"
                has_valve = "🔧 HAS_VALVE" if station["id"] != 10782090 else "❌ NO_VALVE"
                _LOGGER.info("Station %s (Terminal %s): %s - %s - %s", 
                           station["id"], station["terminal"], station["name"], status, has_valve)
        
        # Test optionnel des stations disponibles
        if include_stations and diagnostics.get("active_stations", 0) > 0:
            _LOGGER.info("=== TESTING AVAILABLE STATIONS ===")
            stations = await api.get_stations()
            
            for station in stations:
                station_id = station["id"]
                if (not station.get("isLocked", True) and 
                    station_id != 10782090 and  # Exclure station 4
                    KNOWN_STATIONS.get(station_id, {}).get("has_valve", True)):
                    
                    _LOGGER.info("Testing station %s for %s seconds...", station_id, test_duration)
                    success = await api.start_station(station_id, test_duration)
                    
                    if success:
                        _LOGGER.info("✅ Station %s test started successfully", station_id)
                        # Attendre un peu puis arrêter
                        import asyncio
                        await asyncio.sleep(5)
                        await api.stop_all_irrigation()
                        _LOGGER.info("✅ Station %s test stopped", station_id)
                    else:
                        _LOGGER.error("❌ Station %s test failed", station_id)
        
        _LOGGER.info("=== DIAGNOSTIC COMPLETE ===")

    # Enregistrer les services
    hass.services.async_register(
        DOMAIN, "start_zone", start_zone_service, schema=START_ZONE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "start_multiple_zones", start_multiple_zones_service, schema=START_MULTIPLE_ZONES_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "stop_all", stop_all_service
    )
    hass.services.async_register(
        DOMAIN, "test_system", test_system_service, schema=TEST_SYSTEM_SCHEMA
    )
    
    _LOGGER.info("Rain Bird Cloud services registered")


def _get_api_instance(hass: HomeAssistant) -> RainBirdCloudAPI:
    """Get the first available API instance."""
    if DOMAIN not in hass.data:
        return None
        
    for entry_id, api in hass.data[DOMAIN].items():
        if isinstance(api, RainBirdCloudAPI):
            return api
            
    return None


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unload Rain Bird Cloud services."""
    services_to_remove = ["start_zone", "start_multiple_zones", "stop_all", "test_system"]
    
    for service in services_to_remove:
        if hass.services.has_service(DOMAIN, service):
            hass.services.async_remove(DOMAIN, service)
            
    _LOGGER.info("Rain Bird Cloud services unloaded")