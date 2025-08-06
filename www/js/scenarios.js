/* ===========================================
   DASHBOARD HOME ASSISTANT - GESTION DES SCÉNARIOS
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   INITIALISATION DE L'APPLICATION
   =========================================== */

// Initialiser l'application au démarrage
function initApp() {
    debugLog('=== DÉMARRAGE APPLICATION ===');
    debugLog('Navigateur: ' + navigator.userAgent);
    
    try {
        // Vérifier la disponibilité des éléments DOM
        if (!checkDOMElements()) {
            debugLog('ERREUR CRITIQUE: Éléments DOM manquants');
            showError('Erreur d\'initialisation de l\'interface');
            return false;
        }
        
        // Initialiser la navigation
        if (!initNavigation()) {
            debugLog('ERREUR: Échec initialisation navigation');
            return false;
        }
        
        // Initialiser la gestion des messages
        initMessageSystem();
        
        // Afficher le panel de configuration
        showConfigPanel();
        
        debugLog('=== APPLICATION INITIALISÉE ===');
        debugLog('Pièces: ' + Object.keys(roomsConfig).length);
        debugLog('Matériel: ' + Object.keys(materialConfig).length);
        debugLog('Scénarios: ' + Object.keys(scenariosConfig).length);
        
        return true;
        
    } catch (error) {
        debugLog('EXCEPTION lors de l\'initialisation: ' + error.message);
        showError('Erreur critique lors du démarrage: ' + error.message);
        return false;
    }
}

// Vérifier la présence des éléments DOM essentiels
function checkDOMElements() {
    var requiredElements = [
        'filterTabs',
        'configPanel',
        'loading',
        'allContent',
        'piecesContent',
        'materielContent',
        'scenariosContent',
        'statusBar'
    ];
    
    var missing = [];
    
    for (var i = 0; i < requiredElements.length; i++) {
        var elementId = requiredElements[i];
        var element = document.getElementById(elementId);
        
        if (!element) {
            missing.push(elementId);
            debugLog('MANQUANT: ' + elementId);
        }
    }
    
    if (missing.length > 0) {
        debugLog('Éléments DOM manquants: ' + missing.join(', '));
        return false;
    }
    
    debugLog('Tous les éléments DOM sont présents');
    return true;
}

/* ===========================================
   SYSTÈME DE MESSAGES ET FEEDBACK
   =========================================== */

// Initialiser le système de messages
function initMessageSystem() {
    debugLog('Initialisation système de messages');
    
    // Nettoyer les anciens messages au démarrage
    clearMessages();
    
    // Installer le gestionnaire d'erreurs global pour iOS 9.3.5
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        var errorMsg = 'Erreur JS: ' + msg + ' (ligne ' + lineNo + ')';
        debugLog(errorMsg);
        
        // En mode debug, afficher l'erreur à l'utilisateur
        if (DEBUG_MODE) {
            showError('Erreur technique: ' + msg);
        }
        
        return false; // Laisser l'erreur se propager
    };
}

// Afficher un message d'erreur
function showError(message) {
    debugLog('ERREUR: ' + message);
    
    clearMessages();
    
    var errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = '❌ ' + message;
    
    // Ajouter dans le panel de configuration s'il est visible
    var configPanel = document.getElementById('configPanel');
    if (configPanel && configPanel.style.display !== 'none') {
        configPanel.appendChild(errorDiv);
    } else {
        // Sinon, ajouter dans le contenu principal
        var mainContent = document.getElementById('allContent');
        if (mainContent) {
            var errorContainer = document.createElement('div');
            errorContainer.className = 'section';
            errorContainer.appendChild(errorDiv);
            mainContent.appendChild(errorContainer);
        }
    }
    
    // Auto-masquage après 10 secondes
    setTimeout(function() {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

// Afficher un message de succès
function showSuccess(message) {
    debugLog('SUCCÈS: ' + message);
    
    clearMessages();
    
    var successDiv = document.createElement('div');
    successDiv.className = 'success-feedback';
    successDiv.innerHTML = message;
    
    // Ajouter dans le panel de configuration s'il est visible
    var configPanel = document.getElementById('configPanel');
    if (configPanel && configPanel.style.display !== 'none') {
        configPanel.appendChild(successDiv);
    } else {
        // Afficher en overlay temporaire
        showTemporaryMessage(message, 'success');
        return;
    }
    
    // Auto-masquage après 5 secondes
    setTimeout(function() {
        if (successDiv && successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

// Afficher un message temporaire en overlay
function showTemporaryMessage(message, type) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 20px; left: 20px; right: 20px; z-index: 10000; ' +
                           'padding: 15px; border-radius: 10px; font-weight: 600; text-align: center; ' +
                           'box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
    
    if (type === 'success') {
        overlay.style.background = 'rgba(92, 184, 92, 0.95)';
        overlay.style.color = 'white';
    } else {
        overlay.style.background = 'rgba(217, 83, 79, 0.95)';
        overlay.style.color = 'white';
    }
    
    overlay.innerHTML = message;
    document.body.appendChild(overlay);
    
    // Animation d'apparition
    overlay.style.opacity = '0';
    overlay.style.transform = 'translateY(-20px)';
    overlay.style.transition = 'all 0.3s ease';
    
    setTimeout(function() {
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto-suppression
    setTimeout(function() {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(-20px)';
        
        setTimeout(function() {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }, 3000);
}

// Nettoyer tous les messages
function clearMessages() {
    var messageTypes = ['error', 'success-feedback'];
    
    for (var i = 0; i < messageTypes.length; i++) {
        var elements = document.getElementsByClassName(messageTypes[i]);
        
        // Parcourir à rebours pour éviter les problèmes d'index
        for (var j = elements.length - 1; j >= 0; j--) {
            var element = elements[j];
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }
}

// Nettoyer seulement les erreurs
function clearErrors() {
    var errors = document.getElementsByClassName('error');
    
    for (var i = errors.length - 1; i >= 0; i--) {
        var error = errors[i];
        if (error && error.parentNode) {
            error.parentNode.removeChild(error);
        }
    }
}

/* ===========================================
   GESTION AVANCÉE DES SCÉNARIOS
   =========================================== */

// Exécuter un scénario avec gestion avancée
function executeScenario(scenarioId) {
    debugLog('=== EXÉCUTION SCÉNARIO: ' + scenarioId + ' ===');
    
    var scenario = scenariosConfig[scenarioId];
    if (!scenario) {
        showError('Scénario introuvable: ' + scenarioId);
        debugLog('ERREUR: Scénario inexistant');
        return false;
    }
    
    // Vérifier la configuration Home Assistant
    if (!haUrl || !haToken) {
        showError('Veuillez d\'abord configurer la connexion Home Assistant');
        debugLog('ERREUR: Configuration HA manquante');
        return false;
    }
    
    // Message de confirmation avec délai pour éviter les clics accidentels
    var confirmMessage = scenario.confirmMessage || 
                        ('Lancer le scénario "' + scenario.name + '" ?\n\n' + scenario.description);
    
    if (!confirm(confirmMessage)) {
        debugLog('Scénario annulé par l\'utilisateur');
        return false;
    }
    
    // Gestion spéciale pour les automations
    if (scenario.entity_id && scenario.service === 'automation.turn_on') {
        debugLog('Déclenchement automation: ' + scenario.entity_id);
        
        sendServiceCall('automation', 'turn_on', { entity_id: scenario.entity_id }, function(success) {
            if (success) {
                showSuccess('✅ Scénario "' + scenario.name + '" lancé !');
                debugLog('Automation déclenchée avec succès');
                
                // Programmer un rafraîchissement des données après 3 secondes
                setTimeout(function() {
                    if (!isLoading) {
                        debugLog('Rafraîchissement post-scénario');
                        loadStates();
                    }
                }, 3000);
                
                trackScenarioExecution(scenarioId);
            } else {
                showError('❌ Échec du lancement du scénario "' + scenario.name + '"');
                debugLog('Échec déclenchement automation');
            }
        });
        
        return true;
    }
    
    // Validation du format de service standard
    var serviceParts = scenario.service.split('.');
    if (serviceParts.length !== 2) {
        showError('Configuration de scénario invalide: ' + scenario.service);
        debugLog('ERREUR: Format service invalide: ' + scenario.service);
        return false;
    }
    
    var domain = serviceParts[0];
    var service = serviceParts[1];
    
    debugLog('Appel service: ' + domain + '.' + service);
    
    // Exécuter avec callback de succès
    sendServiceCall(domain, service, {}, function(success) {
        if (success) {
            showSuccess('✅ Scénario "' + scenario.name + '" lancé avec succès !');
            debugLog('Scénario exécuté avec succès');
            
            // Programmer un rafraîchissement des données après 3 secondes
            setTimeout(function() {
                if (!isLoading) {
                    debugLog('Rafraîchissement post-scénario');
                    loadStates();
                }
            }, 3000);
            
            // Analytics simple (compter les exécutions)
            trackScenarioExecution(scenarioId);
            
        } else {
            showError('❌ Échec du lancement du scénario "' + scenario.name + '"');
            debugLog('Échec exécution scénario');
        }
    });
    
    return true;
}

// Suivi statistique simple des scénarios
function trackScenarioExecution(scenarioId) {
    if (!window.localStorage) {
        return; // Pas de localStorage sur cette version iOS
    }
    
    try {
        var key = 'ha_scenario_' + scenarioId;
        var count = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, (count + 1).toString());
        debugLog('Scénario ' + scenarioId + ' exécuté ' + (count + 1) + ' fois');
    } catch (e) {
        debugLog('Impossible de sauvegarder les statistiques: ' + e.message);
    }
}

/* ===========================================
   GESTION DU CYCLE DE VIE DE L'APPLICATION
   =========================================== */

// Gérer la visibilité de la page (économie de batterie)
function handleVisibilityChange() {
    if (document.hidden) {
        debugLog('Application en arrière-plan');
        
        // Ralentir le rafraîchissement quand l'app est cachée
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = setInterval(function() {
                if (!isLoading) {
                    loadStates();
                }
            }, REFRESH_INTERVAL * 3); // 3x plus lent
        }
        
    } else {
        debugLog('Application au premier plan');
        
        // Reprendre le rafraîchissement normal
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = setInterval(function() {
                if (!isLoading) {
                    loadStates();
                }
            }, REFRESH_INTERVAL);
        }
        
        // Rafraîchissement immédiat au retour
        if (!isLoading) {
            loadStates();
        }
    }
}

// Gérer les changements d'état du réseau
function handleNetworkChange() {
    debugLog('Changement état réseau détecté');
    
    if (navigator.onLine === false) {
        showError('🌐 Connexion réseau perdue');
        
        // Arrêter le rafraîchissement automatique
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        
    } else {
        debugLog('Connexion réseau rétablie');
        clearErrors();
        
        // Reprendre le rafraîchissement si configuré
        if (haUrl && haToken && !refreshInterval) {
            startAutoRefresh();
        }
    }
}

/* ===========================================
   UTILITAIRES DE PERFORMANCE
   =========================================== */

// Optimiser les performances pour iOS 9.3.5
function optimizePerformance() {
    debugLog('Optimisation performances iOS 9.3.5');
    
    // Désactiver les animations complexes sur les vieux appareils
    if (navigator.userAgent.indexOf('iPad') !== -1) {
        var style = document.createElement('style');
        style.innerHTML = '* { -webkit-transform: translateZ(0); }'; // Force GPU
        document.head.appendChild(style);
    }
    
    // Nettoyer les event listeners en trop
    cleanupEventListeners();
}

// Nettoyer les event listeners pour éviter les fuites mémoire
function cleanupEventListeners() {
    // Supprimer les anciens listeners de visibilité
    if (document.removeEventListener) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleNetworkChange);
        window.removeEventListener('offline', handleNetworkChange);
    }
    
    // Réinstaller les nouveaux
    if (document.addEventListener) {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleNetworkChange);
        window.addEventListener('offline', handleNetworkChange);
    }
}

/* ===========================================
   DIAGNOSTICS ET MAINTENANCE
   =========================================== */

// Diagnostiquer l'état de l'application
function runDiagnostics() {
    debugLog('=== DIAGNOSTIC SYSTÈME ===');
    
    var diagnostics = {
        version: 'HA Dashboard v1.0 - iOS 9.3.5',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        hasConfig: !!(haUrl && haToken),
        entitiesCount: entities.length,
        refreshActive: !!refreshInterval,
        currentFilter: currentFilter,
        currentRoom: currentRoom,
        currentMaterial: currentMaterial,
        memoryUsage: 'Non disponible sur iOS 9.3.5'
    };
    
    for (var key in diagnostics) {
        if (diagnostics.hasOwnProperty(key)) {
            debugLog(key + ': ' + diagnostics[key]);
        }
    }
    
    debugLog('=== FIN DIAGNOSTIC ===');
    return diagnostics;
}

// Nettoyer la mémoire et les ressources
function cleanup() {
    debugLog('Nettoyage des ressources');
    
    // Arrêter les timers
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    // Nettoyer les commandes en attente
    pendingCommands = [];
    
    // Nettoyer les messages
    clearMessages();
    
    // Supprimer les event listeners
    cleanupEventListeners();
    
    debugLog('Nettoyage terminé');
}

/* ===========================================
   GESTION DES ERREURS SPÉCIFIQUES iOS 9.3.5
   =========================================== */

// Gérer les erreurs spécifiques à iOS 9.3.5
function handleiOS9Errors() {
    // Polyfill pour les méthodes manquantes
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(searchElement, fromIndex) {
            for (var i = fromIndex || 0; i < this.length; i++) {
                if (this[i] === searchElement) {
                    return i;
                }
            }
            return -1;
        };
    }
    
    // Fallback pour JSON si manquant
    if (!window.JSON) {
        showError('JSON non supporté sur ce navigateur');
        return false;
    }
    
    // Vérifier XMLHttpRequest
    if (!window.XMLHttpRequest) {
        showError('XMLHttpRequest non supporté');
        return false;     
    }
    
    return true;
}

/* ===========================================
   POINTS D'ENTRÉE ET FINALISATION
   =========================================== */

// Point d'entrée principal quand le DOM est prêt
function onDOMReady() {
    debugLog('DOM Ready - Démarrage de l\'application');
    
    // Vérifier la compatibilité iOS 9.3.5
    if (!handleiOS9Errors()) {
        return;
    }
    
    // Optimiser les performances
    optimizePerformance();
    
    // Initialiser l'application
    if (initApp()) {
        debugLog('✅ Application démarrée avec succès');
        
        // Démarrer les diagnostics en mode debug
        if (DEBUG_MODE) {
            setTimeout(runDiagnostics, 2000);
        }
    } else {
        debugLog('❌ Échec du démarrage de l\'application');
    }
}

// Gestion de la fermeture de l'application
window.onbeforeunload = function() {
    debugLog('Fermeture de l\'application');
    cleanup();
};

// Messages de fin de chargement
debugLog('Module Scenarios chargé');
debugLog('=== TOUS LES MODULES CHARGÉS ===');
debugLog('Prêt pour initialisation...');