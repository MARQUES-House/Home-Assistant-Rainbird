# ====================================================================================
# FILE: custom_components/rainbird_cloud/config_flow.py
# ====================================================================================
"""Config flow for Rain Bird Cloud integration."""

import logging
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult

from .api import RainBirdCloudAPI
from .auth import RainBirdAuth, RainBirdAuthError
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema({
    vol.Required("email"): str,
    vol.Required("password"): str,
})


class RainBirdCloudConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Rain Bird Cloud."""

    VERSION = 1

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            try:
                # Authentification automatique avec email/password
                auth = RainBirdAuth(self.hass)
                tokens = await auth.authenticate(
                    user_input["email"], 
                    user_input["password"]
                )
                
                # Test de l'API avec les tokens
                api = RainBirdCloudAPI(
                    self.hass,
                    tokens["access_token"],
                    tokens["refresh_token"],
                    tokens.get("expires_in", 7200)
                )
                
                if await api.test_connection():
                    # Stocker les tokens (pas le mot de passe)
                    config_data = {
                        "email": user_input["email"],
                        "access_token": tokens["access_token"],
                        "refresh_token": tokens["refresh_token"],
                        "expires_in": tokens.get("expires_in", 7200),
                    }
                    
                    return self.async_create_entry(
                        title=f"Rain Bird Cloud ({user_input['email']})",
                        data=config_data,
                    )
                else:
                    errors["base"] = "cannot_connect"
                    
            except RainBirdAuthError as err:
                _LOGGER.error("Authentication failed: %s", err)
                if "invalid" in str(err).lower() or "password" in str(err).lower():
                    errors["base"] = "invalid_auth"
                else:
                    errors["base"] = "cannot_connect"
            except Exception as err:
                _LOGGER.exception("Unexpected exception")
                errors["base"] = "unknown"

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
            description_placeholders={
                "auth_info": "Utilisez votre email et mot de passe Rain Bird (même que l'app mobile)"
            }
        )
