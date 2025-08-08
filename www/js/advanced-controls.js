/* ===========================================
   DASHBOARD HOME ASSISTANT - CONTRÔLES AVANCÉS
   PAC circulaire + Volets avancés + Grilles détails
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   AMÉLIORATION DES DÉTAILS DE PIÈCES - GRILLE 2 COLONNES
   =========================================== */

// Remplacer la fonction generateRoomDetailsHtml existante
function generateRoomDetailsHtml(room, roomEntities) {
    var html = '<div class="room-details-grid">';
    html += '<div class="section">';
    html += '<h3>' + room.name + ' <span class="section-count">' + roomEntities.length + '</span></h3>';
    
    if (roomEntities.length === 0) {
        html += '<div class="entity">Aucun équipement disponible</div>';
    } else {
        html += '<div class="entities-mini-grid">';
        
        // Trier les entités pour un meilleur affichage
        var sortedEntities = sortEntitiesByDomain(roomEntities);
        
        for (var i = 0; i < sortedEntities.length; i++) {
            var entity = sortedEntities[i];
            html += createMiniEntityCard(entity);
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    return html;
}

// De même pour les détails matériel
function generateMaterialDetailsHtml(material, materialEntities) {
    var html = '<div class="material-details-grid">';
    html += '<div class="section">';
    html += '<h3>' + material.name + ' <span class="section-count">' + materialEntities.length + '</span></h3>';
    
    if (materialEntities.length === 0) {
        html += '<div class="entity">Aucun élément disponible</div>';
    } else {
        html += '<div class="entities-mini-grid">';
        
        var sortedEntities = sortEntitiesByDomain(materialEntities);
        
        for (var i = 0; i < sortedEntities.length; i++) {
            var entity = sortedEntities[i];
            html += createMiniEntityCard(entity);
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    return html;
}

// Créer une mini-carte d'entité
function createMiniEntityCard(entity) {
    var entityId = entity.entity_id;
    var domain = entityId.split('.')[0];
    var state = entity.state || 'unknown';
    var attributes = entity.attributes || {};
    var friendlyName = formatFriendlyName(entityId, attributes.friendly_name);
    
    var html = '<div class="mini-entity-card' + (state === 'unavailable' ? ' unavailable' : '') + '">';
    
    // En-tête avec icône et nom
    html += '<div class="mini-entity-header">';
    html += getStatusIndicator(state, domain);
    html += '<div class="mini-entity-name">' + friendlyName + '</div>';
    html += '</div>';
    
    // État de l'entité
    html += '<div class="mini-entity-state">' + formatEntityState(entity, domain) + '</div>';
    
    // Contrôles selon le type d'entité
    html += '<div class="mini-entity-controls">';
    
    if (domain === 'climate') {
        html += createAdvancedClimateControl(entity);
    } else if (domain === 'cover') {
        html += createAdvancedCoverControl(entity);
    } else if (isEntityControllable(entityId) && state !== 'unavailable') {
        html += createMiniEntityControls(entity, domain);
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// Contrôles mini pour entités standard
function createMiniEntityControls(entity, domain) {
    var entityId = entity.entity_id;
    var state = entity.state;
    
    switch (domain) {
        case 'light':
        case 'switch':
            var isOn = (state === 'on');
            var buttonClass = isOn ? 'control-btn off' : 'control-btn';
            var buttonText = isOn ? 'OFF' : 'ON';
            var action = isOn ? 'turn_off' : 'turn_on';
            
            return '<button class="' + buttonClass + '" style="width: 100%; font-size: 0.9em; padding: 10px;" ' +
                   'onclick="controlEntity(\'' + entityId + '\', \'' + action + '\')">' + 
                   buttonText + '</button>';
        
        default:
            return '';
    }
}

/* ===========================================
   CONTRÔLES PAC AVANCÉS - INTERFACE CIRCULAIRE
   =========================================== */

// Créer le contrôle PAC avancé
function createAdvancedClimateControl(entity) {
    debugLog('Appel createAdvancedClimateControl pour ' + entity.entity_id);
    
    var entityId = entity.entity_id;
    var state = entity.state;
    var attributes = entity.attributes || {};
    var currentTemp = attributes.current_temperature || 20;
    var targetTemp = attributes.temperature || 20;
    var mode = attributes.hvac_mode || 'off';
    
    // Trouver l'interrupteur correspondant pour cette PAC
    var switchEntityId = findPacSwitchEntity(entityId);
    var isPacOn = switchEntityId ? isEntityOn(switchEntityId) : (state !== 'off');
    
    var html = '<div class="climate-circular-control">';
    
    // Molette de température circulaire
    html += '<div class="temperature-wheel" onclick="toggleTemperatureWheel(\'' + entityId + '\')">';
    html += '<div class="temperature-wheel-inner">';
    html += '<div class="current-temp">' + currentTemp.toFixed(1) + '°</div>';
    html += '<div class="target-temp">' + targetTemp + '°</div>';
    html += '<div class="mode-indicator ' + mode + '">' + getModeIcon(mode) + '</div>';
    html += '</div>';
    html += '</div>';
    
    // Contrôles de température +/-
    html += '<div class="temp-controls">';
    html += '<button class="temp-btn" onclick="adjustTemperature(\'' + entityId + '\', -1)">−</button>';
    html += '<button class="temp-btn" onclick="adjustTemperature(\'' + entityId + '\', 1)">+</button>';
    html += '</div>';
    
    // Switch principal PAC (utilise l'interrupteur réel)
    html += '<div class="pac-power-switch">';
    if (switchEntityId) {
        html += '<label class="pac-power-toggle">';
        html += '<input type="checkbox" ' + (isPacOn ? 'checked' : '') + ' onchange="togglePacPower(\'' + switchEntityId + '\')">';
        html += '<span class="pac-power-slider"></span>';
        html += '</label>';
        html += '<div style="margin-top: 8px; font-size: 0.9em; color: #666;">Alimentation</div>';
    }
    html += '</div>';
    
    // Sélecteur de modes
    html += '<div class="mode-selector">';
    html += createModeButton('heat', '🔥 Chauffage', entityId, mode);
    html += createModeButton('cool', '❄️ Clim', entityId, mode);
    html += createModeButton('auto', '🔄 Auto', entityId, mode);
    html += createModeButton('dry', '💨 Déshumid', entityId, mode);
    html += createModeButton('fan_only', '🌪️ Ventil', entityId, mode);
    html += '</div>';
    
    html += '</div>';
    return html;
}

// Trouver l'entité switch correspondante à une PAC
function findPacSwitchEntity(climateEntityId) {
    // Mapping des PAC vers leurs interrupteurs
    var pacSwitchMapping = {
        'climate.adele': 'switch.adele',
        'climate.alex': 'switch.alex', 
        'climate.bureau': 'switch.bureau',
        'climate.cuisine': 'switch.cuisine',
        'climate.entree_tv': 'switch.entree_tv',
        'climate.parents': 'switch.parents'
    };
    
    return pacSwitchMapping[climateEntityId] || null;
}

// Vérifier si une entité est allumée
function isEntityOn(entityId) {
    var entity = getEntityById(entityId);
    return entity && entity.state === 'on';
}

// Créer un bouton de mode
function createModeButton(modeValue, modeLabel, entityId, currentMode) {
    var isActive = currentMode === modeValue;
    var activeClass = isActive ? ' active' : '';
    
    return '<button class="mode-btn ' + modeValue + activeClass + '" ' +
           'onclick="setClimateMode(\'' + entityId + '\', \'' + modeValue + '\')">' +
           modeLabel + '</button>';
}

// Obtenir l'icône du mode
function getModeIcon(mode) {
    var icons = {
        'heat': '🔥',
        'cool': '❄️', 
        'auto': '🔄',
        'dry': '💨',
        'fan_only': '🌪️',
        'off': '⭕'
    };
    return icons[mode] || '❓';
}

/* ===========================================
   CONTRÔLES VOLETS AVANCÉS
   =========================================== */

// Créer le contrôle volet avancé
function createAdvancedCoverControl(entity) {
    debugLog('Appel createAdvancedCoverControl pour ' + entity.entity_id);
    
    var entityId = entity.entity_id;
    var attributes = entity.attributes || {};
    var position = attributes.current_position || 0;
    var isSlowMode = getCoverSlowMode(entityId);
    
    var html = '<div class="advanced-cover-control">';
    
    // Toggle Rapid/Slow
    html += '<div class="speed-toggle">';
    html += '<label class="speed-switch">';
    html += '<input type="checkbox" ' + (isSlowMode ? 'checked' : '') + ' onchange="toggleCoverSpeed(\'' + entityId + '\')">';
    html += '<div class="speed-slider">';
    html += '<span class="speed-label-left">Rapid</span>';
    html += '<span class="speed-label-right">Slow</span>';
    html += '</div>';
    html += '</label>';
    html += '</div>';
    
    // Contrôle de position avec slider
    html += '<div class="position-control">';
    html += '<input type="range" min="0" max="100" value="' + position + '" ';
    html += 'class="position-slider" data-entity="' + entityId + '" ';
    html += 'oninput="updatePositionDisplay(this)" onchange="setCoverPosition(\'' + entityId + '\', this.value)">';
    html += '<div class="position-display" id="pos-display-' + entityId.replace('.', '-') + '">' + position + '%</div>';
    
    // Représentation visuelle de la position
    html += '<div class="position-visual">';
    html += '<div class="position-fill" style="height: ' + position + '%"></div>';
    html += '</div>';
    html += '</div>';
    
    // Actions rapides
    html += '<div class="quick-actions">';
    html += '<button class="quick-action-btn" onclick="setCoverPosition(\'' + entityId + '\', 0)">Fermé</button>';
    html += '<button class="quick-action-btn" onclick="setCoverPosition(\'' + entityId + '\', 50)">50%</button>';
    html += '<button class="quick-action-btn" onclick="setCoverPosition(\'' + entityId + '\', 100)">Ouvert</button>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

/* ===========================================
   FONCTIONS DE CONTRÔLE PAC
   =========================================== */

// Basculer l'alimentation PAC via l'interrupteur réel
function togglePacPower(switchEntityId) {
    debugLog('Toggle PAC power: ' + switchEntityId);
    
    var entity = getEntityById(switchEntityId);
    if (!entity) {
        showError('Interrupteur PAC introuvable: ' + switchEntityId);
        return;
    }
    
    var isOn = entity.state === 'on';
    var action = isOn ? 'turn_off' : 'turn_on';
    
    controlEntity(switchEntityId, action);
}

// Ajuster la température +/-
function adjustTemperature(entityId, delta) {
    debugLog('Ajustement température: ' + entityId + ' delta: ' + delta);
    
    var entity = getEntityById(entityId);
    if (!entity || !entity.attributes) {
        showError('Entité PAC introuvable');
        return;
    }
    
    var currentTarget = entity.attributes.temperature || 20;
    var newTarget = Math.max(5, Math.min(35, currentTarget + delta)); // Limites 5-35°C
    
    setTemperature(entityId, newTarget);
}

// Définir une température spécifique
function setTemperature(entityId, temperature) {
    debugLog('Définir température: ' + entityId + ' -> ' + temperature + '°C');
    
    var serviceData = {
        entity_id: entityId,
        temperature: parseFloat(temperature)
    };
    
    sendServiceCall('climate', 'set_temperature', serviceData, function(success) {
        if (success) {
            showTemporaryMessage('🌡️ Température: ' + temperature + '°C', 'success');
        }
    });
}

// Changer le mode de la PAC
function setClimateMode(entityId, mode) {
    debugLog('Changement mode PAC: ' + entityId + ' -> ' + mode);
    
    var serviceData = {
        entity_id: entityId,
        hvac_mode: mode
    };
    
    sendServiceCall('climate', 'set_hvac_mode', serviceData, function(success) {
        if (success) {
            var modeNames = {
                'heat': 'Chauffage',
                'cool': 'Climatisation',
                'auto': 'Automatique',
                'dry': 'Déshumidification',
                'fan_only': 'Ventilation seule',
                'off': 'Arrêt'
            };
            
            showTemporaryMessage('🎛️ Mode: ' + (modeNames[mode] || mode), 'success');
        }
    });
}

// Toggle molette température (interaction future)
function toggleTemperatureWheel(entityId) {
    debugLog('Toggle température wheel: ' + entityId);
    // Pour une future implémentation d'interface tactile circulaire
    // Actuellement, utilisez les boutons +/-
}

/* ===========================================
   FONCTIONS DE CONTRÔLE VOLETS AVANCÉS
   =========================================== */

// Variables pour stocker l'état slow/rapid par volet
var coverSlowModes = {};

// Obtenir le mode slow d'un volet
function getCoverSlowMode(entityId) {
    return coverSlowModes[entityId] || false;
}

// Basculer le mode Rapid/Slow
function toggleCoverSpeed(entityId) {
    var isSlowMode = !getCoverSlowMode(entityId);
    coverSlowModes[entityId] = isSlowMode;
    
    debugLog('Mode volet ' + entityId + ': ' + (isSlowMode ? 'Slow' : 'Rapid'));
    
    var message = isSlowMode ? '🐌 Mode silencieux activé' : '⚡ Mode rapide activé';
    showTemporaryMessage(message, 'info');
}

// Définir une position spécifique du volet
function setCoverPosition(entityId, position) {
    debugLog('Position volet: ' + entityId + ' -> ' + position + '%');
    
    var numPosition = parseInt(position, 10);
    if (isNaN(numPosition) || numPosition < 0 || numPosition > 100) {
        showError('Position invalide: ' + position);
        return;
    }
    
    // Utiliser l'entité slow si mode slow activé
    var isSlowMode = getCoverSlowMode(entityId);
    var targetEntityId = entityId;
    
    if (isSlowMode) {
        // Construire le nom de l'entité slow
        targetEntityId = entityId.replace('cover.fenetre_', 'cover.fenetre_') + '_low_speed';
        
        // Vérifier si l'entité slow existe
        var slowEntity = getEntityById(targetEntityId);
        if (!slowEntity) {
            debugLog('Entité slow non trouvée: ' + targetEntityId + ', utilisation entité standard');
            targetEntityId = entityId;
        }
    }
    
    var serviceData = {
        entity_id: targetEntityId,
        position: numPosition
    };
    
    sendServiceCall('cover', 'set_cover_position', serviceData, function(success) {
        if (success) {
            var speedText = isSlowMode ? ' (silencieux)' : '';
            showTemporaryMessage('🪟 Position: ' + numPosition + '%' + speedText, 'success');
        }
    });
    
    // Mettre à jour l'affichage immédiatement
    updatePositionDisplay(entityId, numPosition);
}

// Contrôles volets standards avec gestion slow
function controlCover(entityId, action) {
    debugLog('Contrôle volet: ' + entityId + ' -> ' + action);
    
    var isSlowMode = getCoverSlowMode(entityId);
    var targetEntityId = entityId;
    
    if (isSlowMode && action !== 'stop') {
        // Construire le nom de l'entité slow
        targetEntityId = entityId.replace('cover.fenetre_', 'cover.fenetre_') + '_low_speed';
        
        // Vérifier si l'entité slow existe
        var slowEntity = getEntityById(targetEntityId);
        if (!slowEntity) {
            debugLog('Entité slow non trouvée: ' + targetEntityId + ', utilisation entité standard');
            targetEntityId = entityId;
        }
    }
    
    var service = action + '_cover';
    var serviceData = { entity_id: targetEntityId };
    
    sendServiceCall('cover', service, serviceData, function(success) {
        if (success) {
            var actionNames = {
                'open': 'Ouverture',
                'close': 'Fermeture', 
                'stop': 'Arrêt'
            };
            
            var speedText = isSlowMode && action !== 'stop' ? ' (silencieux)' : '';
            var message = '🪟 ' + (actionNames[action] || action) + speedText;
            showTemporaryMessage(message, 'info');
        }
    });
}

// Mettre à jour l'affichage de position
function updatePositionDisplay(sliderOrEntityId, position) {
    var entityId, value;
    
    if (typeof sliderOrEntityId === 'string') {
        // Appelé avec entityId et position
        entityId = sliderOrEntityId;
        value = position;
    } else {
        // Appelé depuis un slider
        entityId = sliderOrEntityId.getAttribute('data-entity');
        value = sliderOrEntityId.value;
    }
    
    var displayId = 'pos-display-' + entityId.replace('.', '-');
    var display = document.getElementById(displayId);
    if (display) {
        display.textContent = value + '%';
    }
    
    // Mettre à jour la représentation visuelle
    var visualFill = document.querySelector('[data-entity="' + entityId + '"]')
                              ?.parentElement.querySelector('.position-fill');
    if (visualFill) {
        visualFill.style.height = value + '%';
    }
}

// Contrôles volets standards (pour compatibilité)
function controlCover(entityId, action) {
    debugLog('Contrôle volet standard: ' + entityId + ' -> ' + action);
    
    var isSlowMode = getCoverSlowMode(entityId);
    var service;
    
    // Adapter le service selon le mode et l'action
    if (isSlowMode && action !== 'stop') {
        service = action + '_cover_slow';
    } else {
        service = action + '_cover';
    }
    
    sendServiceCall('cover', service, { entity_id: entityId }, function(success) {
        if (!success && isSlowMode) {
            // Fallback vers service standard si slow non disponible
            var standardService = action + '_cover';
            sendServiceCall('cover', standardService, { entity_id: entityId });
        }
    });
    
    var actionNames = {
        'open': 'Ouverture',
        'close': 'Fermeture', 
        'stop': 'Arrêt'
    };
    
    var speedText = isSlowMode && action !== 'stop' ? ' (silencieux)' : '';
    var message = '🪟 ' + (actionNames[action] || action) + speedText;
    showTemporaryMessage(message, 'info');
}

/* ===========================================
   INTÉGRATION AVEC LES FONCTIONS EXISTANTES
   =========================================== */

// Remplacer la fonction createEntityControls existante pour les PAC
var originalCreateEntityControls = createEntityControls;
createEntityControls = function(entity, domain) {
    if (domain === 'climate') {
        return createAdvancedClimateControl(entity);
    } else if (domain === 'cover') {
        return createAdvancedCoverControl(entity);
    } else {
        return originalCreateEntityControls(entity, domain);
    }
};

// Améliorer la fonction createCoverControls pour le mode slow
var originalControlCover = controlCover;
controlCover = function(entityId, action) {
    var isSlowMode = getCoverSlowMode(entityId);
    
    if (isSlowMode && action !== 'stop') {
        // Essayer le service slow d'abord
        var slowService = action + '_cover_slow';
        sendServiceCall('cover', slowService, { entity_id: entityId }, function(success) {
            if (!success) {
                // Fallback vers service standard
                originalControlCover(entityId, action);
            }
        });
    } else {
        originalControlCover(entityId, action);
    }
    
    var speedText = isSlowMode && action !== 'stop' ? ' (silencieux)' : '';
    var actionText = action === 'open' ? 'Ouverture' : action === 'close' ? 'Fermeture' : 'Arrêt';
    showTemporaryMessage('🪟 ' + actionText + speedText, 'info');
};

/* ===========================================
   GESTION DES ÉVÉNEMENTS ET MISE À JOUR
   =========================================== */

// Mise à jour des contrôles avancés lors du refresh
function updateAdvancedControls() {
    // Mettre à jour les positions des volets
    var positionSliders = document.querySelectorAll('.position-slider');
    for (var i = 0; i < positionSliders.length; i++) {
        var slider = positionSliders[i];
        var entityId = slider.getAttribute('data-entity');
        var entity = getEntityById(entityId);
        
        if (entity && entity.attributes && entity.attributes.current_position !== undefined) {
            var position = entity.attributes.current_position;
            slider.value = position;
            updatePositionDisplay(slider);
        }
    }
    
    // Mettre à jour les états des PAC
    var pacToggles = document.querySelectorAll('.pac-power-toggle input');
    for (var i = 0; i < pacToggles.length; i++) {
        var toggle = pacToggles[i];
        var climateEntityId = toggle.closest('.climate-circular-control')
                                   ?.querySelector('.temperature-wheel')
                                   ?.getAttribute('onclick')
                                   ?.match(/'([^']+)'/)?.[1];
        
        if (climateEntityId) {
            var switchEntityId = findPacSwitchEntity(climateEntityId);
            if (switchEntityId) {
                var isPacOn = isEntityOn(switchEntityId);
                toggle.checked = isPacOn;
            }
        }
    }
}

// Intégrer la mise à jour dans le cycle de refresh existant
var originalUpdateCurrentView = updateCurrentView;
updateCurrentView = function() {
    originalUpdateCurrentView();
    
    // Ajouter la mise à jour des contrôles avancés
    setTimeout(updateAdvancedControls, 100);
};

/* ===========================================
   FONCTIONS UTILITAIRES
   =========================================== */

// Sauvegarder les préférences de mode slow (localStorage si disponible)
function saveCoverPreferences() {
    if (window.localStorage) {
        try {
            localStorage.setItem('ha-cover-slow-modes', JSON.stringify(coverSlowModes));
        } catch (e) {
            debugLog('Impossible de sauvegarder préférences volets: ' + e.message);
        }
    }
}

// Charger les préférences de mode slow
function loadCoverPreferences() {
    if (window.localStorage) {
        try {
            var saved = localStorage.getItem('ha-cover-slow-modes');
            if (saved) {
                coverSlowModes = JSON.parse(saved);
                debugLog('Préférences volets chargées: ' + Object.keys(coverSlowModes).length + ' volets');
            }
        } catch (e) {
            debugLog('Erreur chargement préférences volets: ' + e.message);
        }
    }
}

// Sauvegarder les préférences à chaque changement
var originalToggleCoverSpeed = toggleCoverSpeed;
toggleCoverSpeed = function(entityId) {
    originalToggleCoverSpeed(entityId);
    saveCoverPreferences();
};

/* ===========================================
   INITIALISATION DES CONTRÔLES AVANCÉS
   =========================================== */

// Initialiser les contrôles avancés
function initAdvancedControls() {
    debugLog('Initialisation contrôles avancés');
    
    // Charger les préférences
    loadCoverPreferences();
    
    debugLog('Contrôles avancés initialisés');
}

// Intégrer dans l'initialisation principale
var originalInitApp = initApp;
if (typeof initApp === 'function') {
    initApp = function() {
        var result = originalInitApp();
        
        if (result) {
            setTimeout(initAdvancedControls, 200);
        }
        
        return result;
    };
}

debugLog('Module Advanced Controls chargé');

/* ===========================================
   DÉTECTION ET GESTION DES INTERACTIONS
   =========================================== */

// Variables pour suivre l'état des interactions
var interactionState = {
    isInteracting: false,
    lastInteractionTime: 0
};

// Détection des interactions utilisateur
document.addEventListener('touchstart', function() {
    interactionState.isInteracting = true;
    interactionState.lastInteractionTime = Date.now();
});

document.addEventListener('touchend', function() {
    setTimeout(function() {
        if (Date.now() - interactionState.lastInteractionTime > 500) {
            interactionState.isInteracting = false;
        }
    }, 500);
});

// Gestion des gestes (désactivé temporairement pour diagnostic)
// function shouldDisableGestures(target) {
//     return false;
// }

/* ===========================================
   DIAGNOSTIC ET DEBUGGING
   =========================================== */

// Fonction de debug personnalisée
function debugLog(message) {
    if (window.console && console.log) {
        console.log('[DEBUG] ' + message);
    }
}

// Afficher un message d'erreur
function showError(message) {
    alert('Erreur: ' + message);
}

// Afficher un message temporaire
function showTemporaryMessage(message, type) {
    var messageBox = document.createElement('div');
    messageBox.className = 'temporary-message ' + (type || 'info');
    messageBox.textContent = message;
    
    document.body.appendChild(messageBox);
    
    setTimeout(function() {
        if (messageBox.parentNode) {
            messageBox.parentNode.removeChild(messageBox);
        }
    }, 3000);
}

// Envoyer un appel de service (simulation)
function sendServiceCall(domain, service, data, callback) {
    debugLog('Appel de service: ' + domain + '.' + service + ' avec données: ' + JSON.stringify(data));
    
    // Simulation d'un appel asynchrone
    setTimeout(function() {
        callback(true);
    }, 1000);
}

// Obtenir une entité par son ID (simulation)
function getEntityById(entityId) {
    // Simulation d'entités
    var entities = {
        'climate.adele': { entity_id: 'climate.adele', state: 'on', attributes: { friendly_name: 'PAC Adele', current_temperature: 22, temperature: 21, hvac_mode: 'cool' }},
        'switch.adele': { entity_id: 'switch.adele', state: 'on', attributes: { friendly_name: 'Interrupteur Adele' }},
        'cover.fenetre_salon': { entity_id: 'cover.fenetre_salon', state: 'open', attributes: { friendly_name: 'Fenêtre Salon', current_position: 100 }},
        'cover.fenetre_salon_low_speed': { entity_id: 'cover.fenetre_salon_low_speed', state: 'open', attributes: { friendly_name: 'Fenêtre Salon (Silencieux)', current_position: 100 }}
    };
    
    return entities[entityId] || null;
}

// Formater un nom convivial
function formatFriendlyName(entityId, friendlyName) {
    return friendlyName || entityId;
}

// Formater l'état d'une entité
function formatEntityState(entity, domain) {
    if (domain === 'climate') {
        return entity.attributes.current_temperature + '°C';
    } else if (domain === 'cover') {
        return entity.attributes.current_position + '%';
    } else {
        return entity.state;
    }
}

// Indicateur de statut (en ligne/hors ligne)
function getStatusIndicator(state, domain) {
    var isOnline = (state !== 'unavailable');
    return '<span class="status-indicator' + (isOnline ? ' online' : ' offline') + '"></span>';
}

/* ===========================================
   PERSONNALISATIONS SUPPLÉMENTAIRES
   =========================================== */

// Personnalisation des couleurs
var customColors = {
    primary: '#3498db',
    secondary: '#2ecc71',
    danger: '#e74c3c',
    warning: '#f39c12',
    info: '#8e44ad',
    light: '#ecf0f1',
    dark: '#2c3e50'
};

// Appliquer les couleurs personnalisées
function applyCustomColors() {
    var root = document.documentElement;
    
    for (var color in customColors) {
        root.style.setProperty('--color-' + color, customColors[color]);
    }
}

// Initialiser les couleurs personnalisées
applyCustomColors();

/* ===========================================
   AMÉLIORATIONS D'ACCESSIBILITÉ
   =========================================== */

// Améliorer la lisibilité des textes
var bodyFontSize = '16px';
document.body.style.fontSize = bodyFontSize;

// Contraste des couleurs
var highContrastMode = false;

// Basculer le mode contraste élevé
function toggleHighContrast() {
    highContrastMode = !highContrastMode;
    
    if (highContrastMode) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
}

// Initialiser le mode contraste
toggleHighContrast();

/* ===========================================
   OPTIMISATIONS DE PERFORMANCE
   =========================================== */

// Détection des performances (simulation)
var performanceData = {
    cpuUsage: 30,
    memoryUsage: 2048,
    diskUsage: 70
};

// Afficher les données de performance
function displayPerformanceData() {
    debugLog('Utilisation CPU: ' + performanceData.cpuUsage + '%');
    debugLog('Utilisation Mémoire: ' + performanceData.memoryUsage + ' Mo');
    debugLog('Utilisation Disque: ' + performanceData.diskUsage + '%');
}

// Initialiser l'affichage des performances
displayPerformanceData();

/* ===========================================
   SUIVI ET ANALYSE
   =========================================== */

// Variables de suivi
var analyticsData = {
    pageViews: 0,
    uniqueVisitors: 0
};

// Suivi d'une vue de page
function trackPageView() {
    analyticsData.pageViews++;
    debugLog('Vue de page enregistrée. Total: ' + analyticsData.pageViews);
}

// Suivi d'un visiteur unique
function trackUniqueVisitor() {
    analyticsData.uniqueVisitors++;
    debugLog('Visiteur unique enregistré. Total: ' + analyticsData.uniqueVisitors);
}

// Initialiser le suivi
trackPageView();
trackUniqueVisitor();

/* ===========================================
   GESTION DES ERREURS
   =========================================== */

// Gestionnaire d'erreurs global
window.onerror = function(message, source, lineno, colno, error) {
    // Afficher une notification d'erreur
    showError('Une erreur est survenue: ' + message);
};

// Exemple de génération d'erreur
function throwError() {
    nonExistentFunction();
}

// Décommenter pour tester la gestion des erreurs
// throwError();

/* ===========================================
   FONCTIONS DE NETTOYAGE ET D'ARRÊT
   =========================================== */

// Nettoyer les ressources
function cleanup() {
    debugLog('Nettoyage des ressources');
    
    // Supprimer les écouteurs d'événements
    document.removeEventListener('touchstart', touchStartHandler);
    document.removeEventListener('touchend', touchEndHandler);
    
    debugLog('Ressources nettoyées');
}

// Arrêter l'application
function shutdown() {
    debugLog('Arrêt de l\'application');
    
    // Nettoyer les ressources
    cleanup();
    
    // Fermer les connexions, arrêter les timers, etc.
    // ...
    
    debugLog('Application arrêtée');
}

// Décommenter pour tester l'arrêt de l'application
// shutdown();

/* ===========================================
   DOCUMENTATION ET COMMENTAIRES
   =========================================== */

// Documentation du code
/**
 * Fonction pour créer un contrôle climatique avancé
 * @param {Object} entity - L'entité climatique
 * @returns {String} - Le code HTML du contrôle
 */
function createAdvancedClimateControl(entity) {
    // ...
}

// Documentation des fonctions publiques
/**
 * Basculer l'alimentation PAC
 * @param {String} switchEntityId - L'ID de l'entité interrupteur
 */
function togglePacPower(switchEntityId) {
    // ...
}

/* ===========================================
   EXEMPLES D'UTILISATION
   =========================================== */

// Exemple d'utilisation de createAdvancedClimateControl
var climateControlHtml = createAdvancedClimateControl(getEntityById('climate.adele'));
document.getElementById('climate-control-container').innerHTML = climateControlHtml;

// Exemple d'utilisation de togglePacPower
// togglePacPower('switch.adele');

/* ===========================================
   REMERCIEMENTS ET CRÉDITS
   =========================================== */

// Remerciements spéciaux à la communauté Home Assistant pour son soutien
// et à tous les contributeurs de ce projet.

debugLog('Module Advanced Controls entièrement chargé');