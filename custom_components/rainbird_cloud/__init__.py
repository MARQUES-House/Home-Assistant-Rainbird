"""Rain Bird Cloud integration."""

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .api import RainBirdCloudAPI
from .const import DOMAIN
from .services import async_setup_services, async_unload_services

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SWITCH]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Rain Bird Cloud from a config entry."""
    # Récupérer les tokens depuis la config
    access_token = entry.data["access_token"]
    refresh_token = entry.data["refresh_token"]
    expires_in = entry.data.get("expires_in", 7200)
    
    # Initialize API client avec les tokens
    api = RainBirdCloudAPI(hass, access_token, refresh_token, expires_in)
    
    # Test connection
    if not await api.test_connection():
        _LOGGER.error("Failed to connect to Rain Bird Cloud API")
        return False

    # Store API client
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = api

    # Setup services (une seule fois pour toutes les entries)
    if len(hass.data[DOMAIN]) == 1:  # Première instance
        await async_setup_services(hass)
        _LOGGER.info("Rain Bird Cloud services setup completed")

    # Setup platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Log de diagnostic au démarrage
    try:
        diagnostics = await api.get_system_diagnostics()
        _LOGGER.info("Rain Bird Cloud setup completed - Controller: %s, Stations: %s, Active: %s", 
                    diagnostics.get("controller_id"),
                    diagnostics.get("stations_count", 0),
                    diagnostics.get("active_stations", 0))
    except Exception as err:
        _LOGGER.warning("Could not get initial diagnostics: %s", err)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)
        
        # Supprimer les services si c'était la dernière instance
        if not hass.data[DOMAIN]:  # Plus d'instances
            await async_unload_services(hass)
            _LOGGER.info("Rain Bird Cloud services unloaded")

    return unload_ok