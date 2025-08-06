/* ===========================================
   DASHBOARD HOME ASSISTANT - API
   Compatible iOS 9.3.5 - XMLHttpRequest uniquement
   =========================================== */

/* ===========================================
   FONCTIONS DE CONFIGURATION ET CONNEXION
   =========================================== */

// Sauvegarder la configuration et se connecter
function saveConfig() {
    debugLog('Sauvegarde configuration...');
    
    var urlInput = document.getElementById('haUrl');
    var tokenInput = document.getElementById('haToken');
    
    if (!urlInput || !tokenInput) {
        debugLog('ERREUR: Inputs de configuration introuvables');
        showError(messages.validation.fieldsRequired);
        return;
    }
    
    var inputUrl = urlInput.value.replace(/^\s+|\s+$/g, ''); // trim pour iOS 9
    var inputToken = tokenInput.value.replace(/^\s+|\s+$/g, '');
    
    // Validation des champs
    if (!inputUrl || inputUrl === '') {
        showError(messages.validation.urlRequired);
        return;
    }
    
    if (!inputToken || inputToken === '') {
        showError(messages.validation.tokenRequired);
        return;
    }
    
    // Nettoyer et valider l'URL
    var cleanedUrl = cleanUrl(inputUrl);
    if (!isValidUrl(cleanedUrl)) {
        showError(messages.validation.invalidUrl);
        return;
    }
    
    // Sauvegarder la configuration
    haUrl = cleanedUrl;
    haToken = inputToken;
    
    debugLog('Configuration sauvegardée: ' + haUrl);
    
    // Masquer le panel de configuration et démarrer
    hideConfigPanel();
    startAutoRefresh();
}

// Tester la connexion Home Assistant
function testConnection() {
    debugLog('Test de connexion...');
    
    var urlInput = document.getElementById('haUrl');
    var tokenInput = document.getElementById('haToken');
    
    if (!urlInput || !tokenInput) {
        debugLog('ERREUR: Inputs de test introuvables');
        showError(messages.validation.fieldsRequired);
        return;
    }
    
    var testUrl = urlInput.value.replace(/^\s+|\s+$/g, '');
    var testToken = tokenInput.value.replace(/^\s+|\s+$/g, '');
    
    if (!testUrl || !testToken) {
        showError(messages.validation.fieldsRequired);
        return;
    }
    
    // Nettoyer l'URL pour le test
    var cleanedTestUrl = cleanUrl(testUrl);
    if (!isValidUrl(cleanedTestUrl)) {
        showError(messages.validation.invalidUrl);
        return;
    }
    
    // Effectuer le test de connexion
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cleanedTestUrl + '/api/', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + testToken);
    xhr.timeout = 10000; // 10 secondes de timeout
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.message === 'API running.') {
                        showSuccess(messages.connection.success);
                        debugLog('Test connexion réussi');
                    } else {
                        showError(messages.connection.failed + ': Réponse inattendue');
                        debugLog('Réponse API inattendue: ' + xhr.responseText);
                    }
                } catch (e) {
                    showError(messages.connection.failed + ': Réponse invalide');
                    debugLog('Erreur parsing réponse test: ' + e.message);
                }
            } else if (xhr.status === 401) {
                showError(messages.connection.unauthorized);
                debugLog('Token invalide lors du test');
            } else if (xhr.status === 0) {
                showError(messages.connection.networkError);
                debugLog('Erreur réseau lors du test');
            } else {
                showError(messages.connection.failed + ' (Code: ' + xhr.status + ')');
                debugLog('Test connexion échoué: ' + xhr.status);
            }
        }
    };
    
    xhr.ontimeout = function() {
        showError(messages.connection.timeout);
        debugLog('Timeout lors du test de connexion');
    };
    
    xhr.onerror = function() {
        showError(messages.connection.networkError);
        debugLog('Erreur réseau lors du test');
    };
    
    try {
        xhr.send();
    } catch (e) {
        showError(messages.connection.failed + ': ' + e.message);
        debugLog('Exception lors du test: ' + e.message);
    }
}

/* ===========================================
   FONCTIONS DE CHARGEMENT DES DONNÉES
   =========================================== */

// Démarrer le rafraîchissement automatique
function startAutoRefresh() {
    debugLog('Démarrage auto-refresh (intervalle: ' + REFRESH_INTERVAL + 'ms)');
    
    // Premier chargement immédiat
    loadStates();
    
    // Arrêter l'ancien intervalle s'il existe
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Démarrer le nouveau cycle de rafraîchissement
    refreshInterval = setInterval(function() {
        if (!isLoading) {
            loadStates();
        } else {
            debugLog('Chargement en cours, intervalle ignoré');
        }
    }, REFRESH_INTERVAL);
}

// Charger tous les états des entités
function loadStates() {
    if (isLoading) {
        debugLog('Chargement déjà en cours, requête ignorée');
        return;
    }
    
    if (!haUrl || !haToken) {
        debugLog('Configuration manquante, chargement annulé');
        return;
    }
    
    debugLog('Chargement des états...');
    isLoading = true;
    
    // Afficher l'indicateur de chargement pour le premier chargement
    var loadingEl = document.getElementById('loading');
    if (entities.length === 0 && loadingEl) {
        loadingEl.style.display = 'block';
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', haUrl + '/api/states', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + haToken);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000; // 15 secondes de timeout
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            isLoading = false;
            
            // Masquer l'indicateur de chargement
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    
                    if (Array.isArray(data)) {
                        var previousCount = entities.length;
                        entities = data;
                        
                        debugLog('États chargés: ' + entities.length + ' entités' + 
                                (previousCount > 0 ? ' (mise à jour)' : ' (initial)'));
                        
                        // Mettre à jour l'affichage
                        updateCurrentView();
                        updateStatusBar();
                        clearErrors();
                        
                        // Traiter les commandes en attente
                        processPendingCommands();
                        
                    } else {
                        throw new Error('Format de réponse invalide');
                    }
                    
                } catch (e) {
                    showError('Erreur lors du traitement des données: ' + e.message);
                    debugLog('Erreur parsing états: ' + e.message);
                }
                
            } else if (xhr.status === 401) {
                showError(messages.connection.unauthorized);
                debugLog('Token invalide, arrêt du rafraîchissement');
                
                // Arrêter le rafraîchissement et afficher la configuration
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
                showConfigPanel();
                
            } else if (xhr.status === 0) {
                showError(messages.connection.networkError);
                debugLog('Erreur réseau lors du chargement');
                
            } else {
                var errorMsg = 'Erreur serveur (' + xhr.status + ')';
                showError(errorMsg);
                debugLog('Erreur HTTP lors du chargement: ' + xhr.status);
            }
        }
    };
    
    xhr.ontimeout = function() {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
        
        showError(messages.connection.timeout);
        debugLog('Timeout lors du chargement des états');
    };
    
    xhr.onerror = function() {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
        
        showError(messages.connection.networkError);
        debugLog('Erreur réseau lors du chargement');
    };
    
    try {
        xhr.send();
    } catch (e) {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
        
        showError('Erreur lors de la requête: ' + e.message);
        debugLog('Exception lors du chargement: ' + e.message);
    }
}

/* ===========================================
   FONCTIONS DE CONTRÔLE DES ENTITÉS
   =========================================== */

// Contrôler une entité (on/off, open/close, etc.)
function controlEntity(entityId, action, targetValue) {
    debugLog('Contrôle entité: ' + entityId + ' -> ' + action + 
             (targetValue !== undefined ? ' (' + targetValue + ')' : ''));
    
    if (!haUrl || !haToken) {
        showError('Configuration manquante');
        return;
    }
    
    var domain = entityId.split('.')[0];
    var service = getServiceForAction(domain, action);
    
    if (!service) {
        showError('Action non supportée pour ' + domain);
        debugLog('Service introuvable pour ' + domain + '/' + action);
        return;
    }
    
    // Préparer les données de service
    var serviceData = {
        entity_id: entityId
    };
    
    // Ajouter des paramètres spécifiques selon l'action
    if (targetValue !== undefined) {
        if (domain === 'climate' && action === 'set_temperature') {
            serviceData.temperature = targetValue;
        } else if (domain === 'light' && action === 'turn_on') {
            serviceData.brightness_pct = targetValue;
        }
    }
    
    // Envoyer la commande
    sendServiceCall(service.domain, service.service, serviceData);
}

// Contrôler les volets (cas spécial avec 3 actions)
function controlCover(entityId, action) {
    debugLog('Contrôle volet: ' + entityId + ' -> ' + action);
    
    var serviceMap = {
        'open': 'open_cover',
        'close': 'close_cover',
        'stop': 'stop_cover'
    };
    
    var service = serviceMap[action];
    if (!service) {
        showError('Action volet inconnue: ' + action);
        return;
    }
    
    sendServiceCall('cover', service, { entity_id: entityId });
}

// Exécuter un scénario
function executeScenario(scenarioId) {
    debugLog('Exécution scénario: ' + scenarioId);
    
    var scenario = scenariosConfig[scenarioId];
    if (!scenario) {
        showError('Scénario introuvable: ' + scenarioId);
        return;
    }
    
    // Message de confirmation personnalisé
    var confirmMessage = scenario.confirmMessage || 
                        'Voulez-vous lancer le scénario "' + scenario.name + '" ?\n\n' + scenario.description;
    
    if (confirm(confirmMessage)) {
        var serviceParts = scenario.service.split('.');
        if (serviceParts.length !== 2) {
            showError('Format de service invalide: ' + scenario.service);
            return;
        }
        
        var domain = serviceParts[0];
        var service = serviceParts[1];
        
        sendServiceCall(domain, service, {}, function(success) {
            if (success) {
                showSuccess('✅ Scénario "' + scenario.name + '" lancé !');
                debugLog('Scénario exécuté avec succès: ' + scenarioId);
                
                // Rafraîchir les données après un court délai
                setTimeout(function() {
                    if (!isLoading) {
                        loadStates();
                    }
                }, 2000);
            }
        });
    }
}

/* ===========================================
   FONCTIONS UTILITAIRES API
   =========================================== */

// Envoyer un appel de service à Home Assistant
function sendServiceCall(domain, service, data, callback) {
    debugLog('Appel service: ' + domain + '.' + service);
    
    if (!haUrl || !haToken) {
        showError('Configuration manquante');
        if (callback) callback(false);
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', haUrl + '/api/services/' + domain + '/' + service, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + haToken);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 10000; // 10 secondes
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                debugLog('Service exécuté avec succès');
                
                // Ajouter la commande aux commandes en attente pour validation
                if (data.entity_id) {
                    addPendingCommand(data.entity_id, service);
                }
                
                if (callback) callback(true);
                
            } else if (xhr.status === 401) {
                showError(messages.connection.unauthorized);
                debugLog('Token invalide lors de l\'appel service');
                if (callback) callback(false);
                
            } else {
                var errorMsg = 'Erreur service (' + xhr.status + ')';
                showError(errorMsg);
                debugLog('Erreur HTTP service: ' + xhr.status);
                if (callback) callback(false);
            }
        }
    };
    
    xhr.ontimeout = function() {
        showError(messages.connection.timeout);
        debugLog('Timeout lors de l\'appel service');
        if (callback) callback(false);
    };
    
    xhr.onerror = function() {
        showError(messages.connection.networkError);
        debugLog('Erreur réseau lors de l\'appel service');
        if (callback) callback(false);
    };
    
    try {
        var jsonData = JSON.stringify(data || {});
        xhr.send(jsonData);
        debugLog('Données envoyées: ' + jsonData);
    } catch (e) {
        showError('Erreur envoi service: ' + e.message);
        debugLog('Exception envoi service: ' + e.message);
        if (callback) callback(false);
    }
}

// Obtenir le service approprié pour une action et un domaine
function getServiceForAction(domain, action) {
    var serviceMap = {
        'light': {
            'turn_on': { domain: 'light', service: 'turn_on' },
            'turn_off': { domain: 'light', service: 'turn_off' },
            'toggle': { domain: 'light', service: 'toggle' }
        },
        'switch': {
            'turn_on': { domain: 'switch', service: 'turn_on' },
            'turn_off': { domain: 'switch', service: 'turn_off' },
            'toggle': { domain: 'switch', service: 'toggle' }
        },
        'cover': {
            'open': { domain: 'cover', service: 'open_cover' },
            'close': { domain: 'cover', service: 'close_cover' },
            'stop': { domain: 'cover', service: 'stop_cover' }
        },
        'climate': {
            'turn_on': { domain: 'climate', service: 'turn_on' },
            'turn_off': { domain: 'climate', service: 'turn_off' },
            'set_temperature': { domain: 'climate', service: 'set_temperature' }
        }
    };
    
    return serviceMap[domain] && serviceMap[domain][action] ? serviceMap[domain][action] : null;
}

// Nettoyer et valider une URL
function cleanUrl(url) {
    if (!url) return '';
    
    url = url.replace(/^\s+|\s+$/g, ''); // trim
    
    // Supprimer le slash final
    if (url.charAt(url.length - 1) === '/') {
        url = url.slice(0, -1);
    }
    
    // Ajouter http:// si pas de protocole
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        url = 'http://' + url;
    }
    
    return url;
}

// Valider le format d'une URL
function isValidUrl(url) {
    if (!url) return false;
    
    // Pattern basique pour valider l'URL Home Assistant
    var pattern = /^https?:\/\/[\w\.-]+(:\d+)?$/;
    return pattern.test(url);
}

/* ===========================================
   GESTION DES COMMANDES EN ATTENTE
   =========================================== */

// Ajouter une commande en attente de confirmation
function addPendingCommand(entityId, service) {
    var command = {
        entityId: entityId,
        service: service,
        timestamp: new Date().getTime()
    };
    
    pendingCommands.push(command);
    debugLog('Commande en attente ajoutée: ' + entityId + ' / ' + service);
    
    // Nettoyer les anciennes commandes (plus de 30 secondes)
    cleanupPendingCommands();
}

// Traiter les commandes en attente après rafraîchissement
function processPendingCommands() {
    if (pendingCommands.length === 0) return;
    
    var now = new Date().getTime();
    var processedCommands = [];
    
    for (var i = 0; i < pendingCommands.length; i++) {
        var command = pendingCommands[i];
        
        // Vérifier si la commande n'est pas trop ancienne (30 secondes max)
        if (now - command.timestamp > 30000) {
            processedCommands.push(i);
            continue;
        }
        
        // Vérifier si l'état de l'entité a changé
        var entity = findEntityById(command.entityId);
        if (entity) {
            var expectedChange = getExpectedStateChange(command.service);
            if (entity.state === expectedChange) {
                debugLog('Commande confirmée: ' + command.entityId + ' -> ' + entity.state);
                processedCommands.push(i);
            }
        }
    }
    
    // Supprimer les commandes traitées
    for (var i = processedCommands.length - 1; i >= 0; i--) {
        pendingCommands.splice(processedCommands[i], 1);
    }
}

// Nettoyer les anciennes commandes en attente
function cleanupPendingCommands() {
    var now = new Date().getTime();
    var validCommands = [];
    
    for (var i = 0; i < pendingCommands.length; i++) {
        if (now - pendingCommands[i].timestamp <= 30000) {
            validCommands.push(pendingCommands[i]);
        }
    }
    
    pendingCommands = validCommands;
}

// Obtenir l'état attendu après une commande
function getExpectedStateChange(service) {
    var stateMap = {
        'turn_on': 'on',
        'turn_off': 'off',
        'open_cover': 'open',
        'close_cover': 'closed'
    };
    
    return stateMap[service] || null;
}

/* ===========================================
   FONCTIONS D'INTERFACE
   =========================================== */

// Masquer le panel de configuration
function hideConfigPanel() {
    var configPanel = document.getElementById('configPanel');
    if (configPanel) {
        configPanel.style.display = 'none';
    }
}

// Afficher le panel de configuration
function showConfigPanel() {
    var configPanel = document.getElementById('configPanel');
    if (configPanel) {
        configPanel.style.display = 'block';
    }
}

// Mettre à jour la barre de statut
function updateStatusBar() {
    var statusBar = document.getElementById('statusBar');
    if (statusBar) {
        var now = new Date();
        var timeStr = ('0' + now.getHours()).slice(-2) + ':' + 
                      ('0' + now.getMinutes()).slice(-2) + ':' + 
                      ('0' + now.getSeconds()).slice(-2);
        
        var entityCount = entities.length;
        statusBar.innerHTML = '🔄 Dernière mise à jour : ' + timeStr + 
                             ' (' + entityCount + ' entités)';
    }
}

// Trouver une entité par son ID
function findEntityById(entityId) {
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].entity_id === entityId) {
            return entities[i];
        }
    }
    return null;
}

debugLog('Module API chargé');