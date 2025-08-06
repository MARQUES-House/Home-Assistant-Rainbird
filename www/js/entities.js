/* ===========================================
   DASHBOARD HOME ASSISTANT - GESTION DES ENTITÉS
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   AFFICHAGE PRINCIPAL DE TOUTES LES ENTITÉS
   =========================================== */

// Afficher toutes les entités organisées par sections
function displayAllStates() {
    debugLog('Affichage de tous les états (' + entities.length + ' entités)');
    
    var content = document.getElementById('allContent');
    if (!content) {
        debugLog('ERREUR: Container allContent introuvable');
        return;
    }
    
    if (entities.length === 0) {
        content.innerHTML = '<div class="loading">📭 Aucune donnée disponible</div>';
        return;
    }
    
    // Organiser les entités par domaine
    var organizedEntities = organizeEntitiesByDomain();
    
    // Générer le HTML pour chaque section
    var html = '';
    var sectionOrder = ['climate', 'cover', 'light', 'switch', 'sensor', 'binary_sensor', 'weather'];
    
    for (var i = 0; i < sectionOrder.length; i++) {
        var domain = sectionOrder[i];
        if (organizedEntities[domain] && organizedEntities[domain].length > 0) {
            var sectionHtml = createDomainSection(domain, organizedEntities[domain]);
            if (sectionHtml) {
                html += sectionHtml;
            }
        }
    }
    
    // Ajouter les domaines non listés à la fin
    for (var domain in organizedEntities) {
        if (organizedEntities.hasOwnProperty(domain) && sectionOrder.indexOf(domain) === -1) {
            if (organizedEntities[domain].length > 0) {
                var sectionHtml = createDomainSection(domain, organizedEntities[domain]);
                if (sectionHtml) {
                    html += sectionHtml;
                }
            }
        }
    }
    
    // Afficher le contenu ou message vide
    if (html === '') {
        html = '<div class="loading">📭 Aucune entité compatible trouvée</div>';
    }
    
    content.innerHTML = html;
    debugLog('Affichage terminé avec ' + Object.keys(organizedEntities).length + ' sections');
}

// Organiser les entités par domaine
function organizeEntitiesByDomain() {
    var organized = {};
    
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        var domain = entity.entity_id.split('.')[0];
        
        // Filtrer certains domaines non pertinents pour l'affichage principal
        if (shouldIncludeInMainView(domain, entity)) {
            if (!organized[domain]) {
                organized[domain] = [];
            }
            organized[domain].push(entity);
        }
    }
    
    return organized;
}

// Vérifier si une entité doit être incluse dans la vue principale
function shouldIncludeInMainView(domain, entity) {
    // Exclure certains domaines système
    var excludedDomains = ['automation', 'script', 'zone', 'device_tracker', 'person'];
    
    if (excludedDomains.indexOf(domain) !== -1) {
        return false;
    }
    
    // Exclure certaines entités par pattern
    var entityId = entity.entity_id;
    
    // Exclure les entités cachées ou système
    if (entityId.indexOf('hidden_') !== -1 || entityId.indexOf('system_') !== -1) {
        return false;
    }
    
    // Inclure seulement les capteurs pertinents
    if (domain === 'sensor' || domain === 'binary_sensor') {
        return isRelevantSensor(entity);
    }
    
    return true;
}

// Vérifier si un capteur est pertinent pour l'affichage
function isRelevantSensor(entity) {
    var entityId = entity.entity_id;
    var attributes = entity.attributes || {};
    
    // Capteurs de température, humidité, etc.
    var relevantClasses = ['temperature', 'humidity', 'pressure', 'illuminance', 'power', 'energy'];
    if (attributes.device_class && relevantClasses.indexOf(attributes.device_class) !== -1) {
        return true;
    }
    
    // Capteurs avec des mots-clés pertinents dans l'ID
    var relevantKeywords = ['temperature', 'humidite', 'probleme', 'etat', 'porte', 'fenetre'];
    for (var i = 0; i < relevantKeywords.length; i++) {
        if (entityId.indexOf(relevantKeywords[i]) !== -1) {
            return true;
        }
    }
    
    return false;
}

/* ===========================================
   CRÉATION DES SECTIONS PAR DOMAINE
   =========================================== */

// Créer une section pour un domaine d'entités
function createDomainSection(domain, domainEntities) {
    if (!domainEntities || domainEntities.length === 0) {
        return '';
    }
    
    var domainConfig = getDomainConfig(domain);
    var sectionTitle = domainConfig.icon + ' ' + domainConfig.name;
    var maxEntities = getMaxEntitiesForDomain(domain);
    
    // Limiter le nombre d'entités affichées pour éviter l'encombrement
    var entitiesToShow = domainEntities.slice(0, maxEntities);
    var hasMore = domainEntities.length > maxEntities;
    
    var html = '<div class="section">';
    html += '<h3>' + sectionTitle + ' <span class="section-count">' + entitiesToShow.length;
    
    if (hasMore) {
        html += '+';
    }
    
    html += '</span></h3>';
    
    // Ajouter chaque entité
    for (var i = 0; i < entitiesToShow.length; i++) {
        var entity = entitiesToShow[i];
        var controllable = isEntityControllable(entity.entity_id);
        html += createEntityHtml(entity, controllable, domain);
    }
    
    // Message si des entités sont masquées
    if (hasMore) {
        var hiddenCount = domainEntities.length - maxEntities;
        html += '<div class="entity" style="opacity: 0.6; font-style: italic;">';
        html += '<div class="entity-info">';
        html += '<div class="entity-name">+ ' + hiddenCount + ' autres entités</div>';
        html += '<div class="entity-state">Voir dans les vues spécialisées</div>';
        html += '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// Obtenir le nombre maximum d'entités à afficher par domaine
function getMaxEntitiesForDomain(domain) {
    var limits = {
        'climate': 8,
        'cover': 12,
        'light': 15,
        'switch': 10,
        'sensor': 8,
        'binary_sensor': 6,
        'weather': 3
    };
    
    return limits[domain] || 10;
}

/* ===========================================
   GÉNÉRATION HTML DES ENTITÉS
   =========================================== */

// Créer le HTML pour une entité
function createEntityHtml(entity, controllable, domain) {
    if (!entity || !entity.entity_id) {
        debugLog('ERREUR: Entité invalide pour createEntityHtml');
        return '';
    }
    
    var entityId = entity.entity_id;
    var state = entity.state || 'unknown';
    var attributes = entity.attributes || {};
    var friendlyName = formatFriendlyName(entityId, attributes.friendly_name);
    
    var html = '<div class="entity' + (state === 'unavailable' ? ' unavailable' : '') + '">';
    
    // Informations de l'entité
    html += '<div class="entity-info">';
    html += '<div class="entity-name">';
    html += getStatusIndicator(state, domain);
    html += friendlyName;
    html += '</div>';
    html += '<div class="entity-state">' + formatEntityState(entity, domain) + '</div>';
    html += '</div>';
    
    // Contrôles si l'entité est contrôlable
    if (controllable && state !== 'unavailable') {
        html += createEntityControls(entity, domain);
    }
    
    html += '</div>';
    return html;
}

// Créer les contrôles pour une entité
function createEntityControls(entity, domain) {
    var entityId = entity.entity_id;
    var state = entity.state;
    
    switch (domain) {
        case 'light':
        case 'switch':
            return createToggleControls(entityId, state);
            
        case 'cover':
            return createCoverControls(entityId, state);
            
        case 'climate':
            return createClimateControls(entityId, entity);
            
        default:
            return '';
    }
}

// Créer les contrôles on/off/toggle
function createToggleControls(entityId, state) {
    var isOn = (state === 'on');
    var buttonClass = isOn ? 'control-btn off' : 'control-btn';
    var buttonText = isOn ? 'OFF' : 'ON';
    var action = isOn ? 'turn_off' : 'turn_on';
    
    return '<button class="' + buttonClass + '" onclick="controlEntity(\'' + entityId + '\', \'' + action + '\')">' + 
           buttonText + '</button>';
}

// Créer les contrôles de volets (monter, stop, descendre)
function createCoverControls(entityId, state) {
    var html = '<div class="cover-controls">';
    html += '<button class="control-btn" onclick="controlCover(\'' + entityId + '\', \'open\')" title="Monter">▲</button>';
    html += '<button class="control-btn" onclick="controlCover(\'' + entityId + '\', \'stop\')" title="Stop">■</button>';
    html += '<button class="control-btn" onclick="controlCover(\'' + entityId + '\', \'close\')" title="Descendre">▼</button>';
    html += '</div>';
    return html;
}

// Créer les contrôles de climatisation
function createClimateControls(entityId, entity) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    var currentTemp = attributes.current_temperature;
    var targetTemp = attributes.temperature;
    
    var html = '<div>';
    
    // Bouton on/off principal
    var isOn = (state !== 'off');
    var buttonClass = isOn ? 'control-btn off' : 'control-btn';
    var buttonText = isOn ? 'OFF' : 'ON';
    var action = isOn ? 'turn_off' : 'turn_on';
    
    html += '<button class="' + buttonClass + '" onclick="controlEntity(\'' + entityId + '\', \'' + action + '\')">' + 
            buttonText + '</button>';
    
    // Informations de température
    if (currentTemp !== undefined || targetTemp !== undefined) {
        html += '<div class="climate-info">';
        
        if (currentTemp !== undefined) {
            html += '<span class="climate-temp">Actuelle: ' + formatValue(currentTemp, '°C') + '</span>';
        }
        
        if (targetTemp !== undefined) {
            html += '<span class="climate-temp">Cible: ' + formatValue(targetTemp, '°C') + '</span>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

/* ===========================================
   FORMATAGE DES ÉTATS ET VALEURS
   =========================================== */

// Formater l'état d'une entité pour l'affichage
function formatEntityState(entity, domain) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    
    if (state === 'unavailable') {
        return '❌ Indisponible';
    }
    
    if (state === 'unknown') {
        return '❓ État inconnu';
    }
    
    switch (domain) {
        case 'sensor':
            return formatSensorState(entity);
            
        case 'binary_sensor':
            return formatBinarySensorState(entity);
            
        case 'weather':
            return formatWeatherState(entity);
            
        case 'climate':
            return formatClimateState(entity);
            
        case 'cover':
            return formatCoverState(state);
            
        case 'light':
        case 'switch':
            return formatToggleState(state, attributes);
            
        default:
            return capitalizeFirstLetter(state);
    }
}

// Formater l'état d'un capteur
function formatSensorState(entity) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    var unit = attributes.unit_of_measurement;
    
    if (unit) {
        return formatValue(state, unit);
    }
    
    return state;
}

// Formater l'état d'un capteur binaire
function formatBinarySensorState(entity) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    var deviceClass = attributes.device_class;
    
    if (state === 'on') {
        switch (deviceClass) {
            case 'problem':
                return '⚠️ Problème détecté';
            case 'door':
            case 'window':
                return '🔓 Ouvert';
            case 'motion':
                return '🚶 Mouvement';
            case 'moisture':
                return '💧 Humidité détectée';
            default:
                return '✅ Activé';
        }
    } else {
        switch (deviceClass) {
            case 'problem':
                return '✅ Normal';
            case 'door':
            case 'window':
                return '🔒 Fermé';
            case 'motion':
                return '🚫 Aucun mouvement';
            case 'moisture':
                return '🌵 Sec';
            default:
                return '❌ Inactif';
        }
    }
}

// Formater l'état de la météo
function formatWeatherState(entity) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    var temperature = attributes.temperature;
    var humidity = attributes.humidity;
    
    var stateText = capitalizeFirstLetter(state);
    
    if (temperature !== undefined) {
        stateText += ' • ' + formatValue(temperature, '°C');
    }
    
    if (humidity !== undefined) {
        stateText += ' • ' + formatValue(humidity, '%');
    }
    
    return stateText;
}

// Formater l'état de la climatisation
function formatClimateState(entity) {
    var state = entity.state;
    var attributes = entity.attributes || {};
    var currentTemp = attributes.current_temperature;
    var hvacAction = attributes.hvac_action;
    
    var stateText = '';
    
    switch (state) {
        case 'heat':
            stateText = '🔥 Chauffage';
            break;
        case 'cool':
            stateText = '❄️ Refroidissement';
            break;
        case 'auto':
            stateText = '🔄 Automatique';
            break;
        case 'off':
            stateText = '⭕ Éteint';
            break;
        default:
            stateText = capitalizeFirstLetter(state);
    }
    
    if (hvacAction && hvacAction !== 'idle' && hvacAction !== state) {
        stateText += ' (' + hvacAction + ')';
    }
    
    if (currentTemp !== undefined) {
        stateText += ' • ' + formatValue(currentTemp, '°C');
    }
    
    return stateText;
}

// Formater l'état des volets
function formatCoverState(state) {
    switch (state) {
        case 'open':
            return '🔼 Ouvert';
        case 'closed':
            return '🔽 Fermé';
        case 'opening':
            return '⬆️ Ouverture...';
        case 'closing':
            return '⬇️ Fermeture...';
        default:
            return capitalizeFirstLetter(state);
    }
}

// Formater l'état des interrupteurs et éclairages
function formatToggleState(state, attributes) {
    var brightness = attributes.brightness;
    var colorMode = attributes.color_mode;
    
    if (state === 'on') {
        var stateText = '💡 Allumé';
        
        if (brightness !== undefined) {
            var brightnessPercent = Math.round((brightness / 255) * 100);
            stateText += ' (' + brightnessPercent + '%)';
        }
        
        return stateText;
    } else {
        return '⭕ Éteint';
    }
}

/* ===========================================
   INDICATEURS DE STATUT
   =========================================== */

// Obtenir l'indicateur de statut pour une entité
function getStatusIndicator(state, domain) {
    var color = getStatusColor(state);
    var className = 'status-' + getStatusClass(state);
    
    return '<span class="status-indicator ' + className + '"></span>';
}

// Obtenir la classe CSS pour un état
function getStatusClass(state) {
    switch (state) {
        case 'on':
        case 'open':
        case 'heat':
        case 'cool':
        case 'auto':
            return 'on';
        case 'off':
        case 'closed':
            return 'off';
        case 'unavailable':
        case 'unknown':
            return 'unavailable';
        default:
            return 'off';
    }
}

/* ===========================================
   FONCTIONS UTILITAIRES
   =========================================== */

// Capitaliser la première lettre d'une chaîne
function capitalizeFirstLetter(string) {
    if (!string || string.length === 0) {
        return string;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Obtenir une entité par son ID
function getEntityById(entityId) {
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].entity_id === entityId) {
            return entities[i];
        }
    }
    return null;
}

// Vérifier si une entité existe
function entityExists(entityId) {
    return getEntityById(entityId) !== null;
}

// Obtenir les entités par domaine
function getEntitiesByDomain(domain) {
    var domainEntities = [];
    
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity.entity_id.split('.')[0] === domain) {
            domainEntities.push(entity);
        }
    }
    
    return domainEntities;
}

// Filtrer les entités par pattern
function filterEntitiesByPattern(pattern) {
    var filtered = [];
    var regex = new RegExp(pattern, 'i'); // Case insensitive
    
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (regex.test(entity.entity_id) || 
            (entity.attributes.friendly_name && regex.test(entity.attributes.friendly_name))) {
            filtered.push(entity);
        }
    }
    
    return filtered;
}

/* ===========================================
   GESTION DES ERREURS D'AFFICHAGE
   =========================================== */

// Afficher un message d'erreur dans le contenu principal
function showMainContentError(message) {
    var content = document.getElementById('allContent');
    if (content) {
        content.innerHTML = '<div class="loading" style="color: #e74c3c;">❌ ' + message + '</div>';
    }
}

// Afficher un message de chargement dans le contenu principal
function showMainContentLoading(message) {
    var content = document.getElementById('allContent');
    if (content) {
        content.innerHTML = '<div class="loading">⏳ ' + (message || 'Chargement...') + '</div>';
    }
}

// Vérifier l'intégrité des données d'entités
function validateEntitiesData() {
    if (!Array.isArray(entities)) {
        debugLog('ERREUR: entities n\'est pas un tableau');
        return false;
    }
    
    var validEntities = 0;
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity && entity.entity_id && typeof entity.entity_id === 'string') {
            validEntities++;
        } else {
            debugLog('ATTENTION: Entité invalide à l\'index ' + i);
        }
    }
    
    debugLog('Validation entités: ' + validEntities + '/' + entities.length + ' valides');
    return validEntities > 0;
}

debugLog('Module Entities chargé');