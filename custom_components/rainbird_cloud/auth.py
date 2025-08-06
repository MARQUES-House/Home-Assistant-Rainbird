# ====================================================================================
# FILE: custom_components/rainbird_cloud/auth.py
# ====================================================================================
"""Rain Bird Cloud authentication using OAuth2 PKCE flow."""

import asyncio
import base64
import hashlib
import logging
import re
import secrets
import urllib.parse
from typing import Dict, Optional, Tuple

import aiohttp
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    API_BASE_URL,
    AUTH_ENDPOINT,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SCOPE,
    TOKEN_ENDPOINT,
    USER_AGENT,
    WEB_USER_AGENT,
)

_LOGGER = logging.getLogger(__name__)


class RainBirdAuthError(Exception):
    """Rain Bird authentication error."""


class RainBirdAuth:
    """Rain Bird OAuth2 authentication with PKCE."""

    def __init__(self, hass):
        """Initialize the auth handler."""
        self.hass = hass
        self.session = async_get_clientsession(hass)

    def _generate_pkce_pair(self) -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge."""
        # Code verifier: random 43-128 character string
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Code challenge: SHA256 hash of verifier, base64url encoded
        challenge_bytes = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
        
        return code_verifier, code_challenge

    def _generate_state_and_nonce(self) -> Tuple[str, str]:
        """Generate state and nonce for OAuth2."""
        state = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        nonce = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        return state, nonce

    async def authenticate(self, email: str, password: str) -> Dict[str, str]:
        """Authenticate with Rain Bird using email/password."""
        _LOGGER.debug("Starting Rain Bird authentication flow")

        try:
            # Étape 1: Initier le flow OAuth2
            auth_url, code_verifier, state = await self._initiate_oauth_flow()
            
            # Étape 2: Simuler la connexion web
            login_cookies = await self._perform_web_login(auth_url, email, password)
            
            # Étape 3: Obtenir le code d'autorisation
            auth_code = await self._get_authorization_code(login_cookies, state)
            
            # Étape 4: Échanger le code contre des tokens
            tokens = await self._exchange_code_for_tokens(auth_code, code_verifier)
            
            _LOGGER.info("Rain Bird authentication successful")
            return tokens

        except Exception as err:
            _LOGGER.error("Authentication failed: %s", err)
            raise RainBirdAuthError(f"Authentication failed: {err}")

    async def _initiate_oauth_flow(self) -> Tuple[str, str, str]:
        """Initiate OAuth2 flow and return auth URL, code verifier, and state."""
        code_verifier, code_challenge = self._generate_pkce_pair()
        state, nonce = self._generate_state_and_nonce()

        # Construire l'URL d'autorisation
        auth_params = {
            'client_id': CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': REDIRECT_URI,
            'scope': SCOPE,
            'state': state,
            'nonce': nonce,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
            'prompt': 'login',
        }

        auth_url = f"{API_BASE_URL}{AUTH_ENDPOINT}?" + urllib.parse.urlencode(auth_params)
        _LOGGER.debug("Generated OAuth2 authorization URL")
        
        return auth_url, code_verifier, state

    async def _perform_web_login(self, auth_url: str, email: str, password: str) -> Dict[str, str]:
        """Simulate web login to get session cookies."""
        headers = {
            'User-Agent': WEB_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9',
        }

        # Première requête pour obtenir la page de login
        async with self.session.get(auth_url, headers=headers) as response:
            if response.status != 200:
                raise RainBirdAuthError(f"Failed to get login page: {response.status}")
            
            html_content = await response.text()
            cookies = {}
            for cookie in response.cookies:
                cookies[cookie.key] = cookie.value

        # Extraire les champs cachés du formulaire (CSRF tokens, etc.)
        form_data = self._extract_form_data(html_content)
        form_data.update({
            'Username': email,
            'Password': password,
            'RememberLogin': 'false',
        })

        # Extraire l'URL de soumission du formulaire
        form_action = self._extract_form_action(html_content)
        if not form_action:
            raise RainBirdAuthError("Could not find login form action")

        # Soumission du formulaire de login
        login_url = f"{API_BASE_URL}{form_action}" if form_action.startswith('/') else form_action
        
        headers.update({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': auth_url,
        })

        async with self.session.post(
            login_url,
            headers=headers,
            data=form_data,
            cookies=cookies,
            allow_redirects=False,
        ) as response:
            # Update cookies avec ceux de la réponse
            for cookie in response.cookies:
                cookies[cookie.key] = cookie.value

            if response.status not in [200, 302]:
                raise RainBirdAuthError(f"Login failed: {response.status}")

            # Vérifier si le login a réussi (chercher une redirection ou absence d'erreur)
            if response.status == 200:
                content = await response.text()
                if 'invalid' in content.lower() or 'error' in content.lower():
                    raise RainBirdAuthError("Invalid email or password")

        _LOGGER.debug("Web login successful")
        return cookies

    async def _get_authorization_code(self, cookies: Dict[str, str], state: str) -> str:
        """Get authorization code using session cookies."""
        # Construire l'URL de callback pour obtenir le code
        callback_params = {
            'prompt': 'login',
            'nonce': secrets.token_urlsafe(32),
            'response_type': 'code',
            'code_challenge_method': 'S256',
            'scope': SCOPE,
            'code_challenge': secrets.token_urlsafe(32),  # Pas important pour le callback
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'state': state,
            'suppressed_prompt': 'login',
        }

        callback_url = f"{API_BASE_URL}{AUTH_ENDPOINT}/callback?" + urllib.parse.urlencode(callback_params)

        headers = {
            'User-Agent': WEB_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': f"{API_BASE_URL}/",
        }

        async with self.session.get(callback_url, headers=headers, cookies=cookies) as response:
            if response.status != 200:
                raise RainBirdAuthError(f"Failed to get authorization code: {response.status}")

            # Le code devrait être dans l'URL de redirection ou dans le contenu de la page
            content = await response.text()
            
            # Chercher le code dans différents endroits possibles
            code_match = re.search(r'code=([^&\s]+)', str(response.url) + content)
            if not code_match:
                # Alternative: chercher dans les meta refresh ou javascript redirects
                code_match = re.search(r'["\']code["\']:\s*["\']([^"\']+)["\']', content)
            
            if not code_match:
                raise RainBirdAuthError("Authorization code not found")

            auth_code = code_match.group(1)
            _LOGGER.debug("Successfully obtained authorization code")
            return auth_code

    async def _exchange_code_for_tokens(self, auth_code: str, code_verifier: str) -> Dict[str, str]:
        """Exchange authorization code for access and refresh tokens."""
        # Encoder les credentials client
        credentials = f"{CLIENT_ID}:{CLIENT_SECRET}"
        auth_header = base64.b64encode(credentials.encode()).decode()

        headers = {
            'Authorization': f'Basic {auth_header}',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': USER_AGENT,
        }

        token_data = {
            'grant_type': 'authorization_code',
            'code': auth_code,
            'code_verifier': code_verifier,
            'redirect_uri': REDIRECT_URI,
        }

        async with self.session.post(
            f"{API_BASE_URL}{TOKEN_ENDPOINT}",
            headers=headers,
            data=token_data,
        ) as response:
            if response.status != 200:
                error_content = await response.text()
                raise RainBirdAuthError(f"Token exchange failed: {response.status} - {error_content}")

            tokens = await response.json()
            
            if 'access_token' not in tokens or 'refresh_token' not in tokens:
                raise RainBirdAuthError("Invalid token response")

            _LOGGER.debug("Successfully obtained access and refresh tokens")
            return tokens

    def _extract_form_data(self, html: str) -> Dict[str, str]:
        """Extract hidden form fields from HTML."""
        form_data = {}
        
        # Chercher tous les input hidden
        hidden_inputs = re.findall(r'<input[^>]*type=["\']hidden["\'][^>]*>', html, re.IGNORECASE)
        
        for input_tag in hidden_inputs:
            name_match = re.search(r'name=["\']([^"\']+)["\']', input_tag)
            value_match = re.search(r'value=["\']([^"\']*)["\']', input_tag)
            
            if name_match:
                name = name_match.group(1)
                value = value_match.group(1) if value_match else ''
                form_data[name] = value

        return form_data

    def _extract_form_action(self, html: str) -> Optional[str]:
        """Extract form action URL from HTML."""
        form_match = re.search(r'<form[^>]*action=["\']([^"\']+)["\']', html, re.IGNORECASE)
        return form_match.group(1) if form_match else None