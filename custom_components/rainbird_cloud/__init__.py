# ====================================================================================
# FILE: custom_components/rainbird_cloud/__init__.py
# ====================================================================================
"""Rain Bird Cloud integration."""

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .api import RainBirdCloudAPI
from .const import DOMAIN

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

    # Setup platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok
