# ====================================================================================
# FILE: custom_components/rainbird_cloud/switch.py
# ====================================================================================
"""Rain Bird Cloud switch platform."""

import logging
from typing import Any, Optional

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .api import RainBirdCloudAPI
from .const import DEFAULT_DURATION, DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Rain Bird Cloud switches."""
    api: RainBirdCloudAPI = hass.data[DOMAIN][config_entry.entry_id]

    # Récupérer dynamiquement les zones depuis l'API
    try:
        stations = await api.get_stations()
        _LOGGER.info("Found %d stations from API", len(stations))
    except Exception as err:
        _LOGGER.warning("Failed to get stations from API, using defaults: %s", err)
        # Fallback vers vos zones connues
        stations = [
            {"id": 10782087, "name": "Zone 1"},
            {"id": 10782088, "name": "Zone 2"},
            {"id": 10782089, "name": "Zone 3"},
            {"id": 10782090, "name": "Zone 4"},
        ]

    entities = []
    
    # Créer un switch pour chaque zone
    for station in stations:
        entities.append(RainBirdZoneSwitch(
            api, 
            station.get("name", f"Zone {station['id']}"), 
            station["id"]
        ))

    # Ajouter un switch pour arrêter toute irrigation
    entities.append(RainBirdStopAllSwitch(api))

    async_add_entities(entities)


class RainBirdZoneSwitch(SwitchEntity):
    """Rain Bird zone switch."""

    def __init__(self, api: RainBirdCloudAPI, name: str, station_id: int):
        """Initialize the switch."""
        self._api = api
        self._name = name
        self._station_id = station_id
        self._is_on = False
        self._attr_unique_id = f"rainbird_cloud_zone_{station_id}"

    @property
    def name(self) -> str:
        """Return the name of the switch."""
        return f"Rain Bird {self._name}"

    @property
    def is_on(self) -> bool:
        """Return true if the switch is on."""
        return self._is_on

    @property
    def icon(self) -> str:
        """Return the icon for the switch."""
        return "mdi:sprinkler" if self._is_on else "mdi:sprinkler-off"

    @property
    def device_info(self):
        """Return device info."""
        return {
            "identifiers": {(DOMAIN, "rainbird_cloud")},
            "name": "Rain Bird Cloud",
            "manufacturer": "Rain Bird",
            "model": "IQ4 Cloud",
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on the switch."""
        duration = kwargs.get("duration", DEFAULT_DURATION)
        if await self._api.start_station(self._station_id, duration):
            self._is_on = True
            self.async_write_ha_state()
            
            # Auto turn off après la durée (simulation)
            self.hass.loop.call_later(duration, self._auto_turn_off)

    def _auto_turn_off(self):
        """Auto turn off after duration."""
        self._is_on = False
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the switch."""
        # Pour l'instant, on arrête toute l'irrigation
        # Dans une version future, on pourrait implémenter l'arrêt individuel
        if await self._api.stop_all_irrigation():
            self._is_on = False
            self.async_write_ha_state()


class RainBirdStopAllSwitch(SwitchEntity):
    """Rain Bird stop all irrigation switch."""

    def __init__(self, api: RainBirdCloudAPI):
        """Initialize the switch."""
        self._api = api
        self._attr_unique_id = "rainbird_cloud_stop_all"

    @property
    def name(self) -> str:
        """Return the name of the switch."""
        return "Rain Bird Stop All"

    @property
    def is_on(self) -> bool:
        """Return false as this is a momentary switch."""
        return False

    @property
    def icon(self) -> str:
        """Return the icon for the switch."""
        return "mdi:stop"

    @property
    def device_info(self):
        """Return device info."""
        return {
            "identifiers": {(DOMAIN, "rainbird_cloud")},
            "name": "Rain Bird Cloud",
            "manufacturer": "Rain Bird",
            "model": "IQ4 Cloud",
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Stop all irrigation."""
        await self._api.stop_all_irrigation()
        # Immédiatement remettre à False car c'est un bouton momentané
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """This switch cannot be turned off."""
        pass
