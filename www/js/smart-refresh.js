/* ===========================================
   DASHBOARD HOME ASSISTANT - SMART REFRESH
   Rafraîchissement intelligent selon l'activité
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   VARIABLES DE GESTION SMART REFRESH
   =========================================== */

// Timings de rafraîchissement
var REFRESH_NORMAL = 10000;    // 10 secondes - usage normal
var REFRESH_IDLE = 30000;      // 30 secondes - inactivité courte
var REFRESH_DEEP_IDLE = 60000; // 60 secondes - inactivité longue
var REFRESH_BACKGROUND = 120000; // 2 minutes - app en arrière-plan

// Seuils d'inactivité
var IDLE_THRESHOLD = 300000;     // 5 minutes = inactivité courte
var DEEP_IDLE_THRESHOLD = 900000; // 15 minutes = inactivité longue

// Variables de suivi
var lastInteraction = Date.now();
var currentRefreshRate = REFRESH_NORMAL;
var smartRefreshInterval = null;
var isAppInBackground = false;
var interactionListenersActive = false;

/* ===========================================
   DÉTECTION D'ACTIVITÉ UTILISATEUR
   =========================================== */

// Événements à surveiller pour détecter l'activité
var interactionEvents = [
    'touchstart', 'touchmove', 'touchend',
    'mousedown', 'mousemove', 'mouseup',
    'click', 'scroll', 'keydown'
];

// Enregistrer une interaction utilisateur
function recordInteraction() {
    lastInteraction = Date.now();
    debugLog('Interaction utilisateur détectée');
    
    // Si on était en mode ralenti, revenir au mode normal
    if (currentRefreshRate !== REFRESH_NORMAL) {
        setRefreshRate(REFRESH_NORMAL, 'Retour activité normale');
    }
}

// Installer les listeners d'interaction
function setupInteractionListeners() {
    if (interactionListenersActive) {
        return; // Déjà installés
    }
    
    debugLog('Installation listeners d\'interaction');
    
    for (var i = 0; i < interactionEvents.length; i++) {
        var eventType = interactionEvents[i];
        
        // Utiliser capture pour iOS 9.3.5
        document.addEventListener(eventType, recordInteraction, true);
    }
    
    interactionListenersActive = true;
}

// Supprimer les listeners d'interaction
function removeInteractionListeners() {
    if (!interactionListenersActive) {
        return;
    }
    
    debugLog('Suppression listeners d\'interaction');
    
    for (var i = 0; i < interactionEvents.length; i++) {
        var eventType = interactionEvents[i];
        document.removeEventListener(eventType, recordInteraction, true);
    }
    
    interactionListenersActive = false;
}

/* ===========================================
   GESTION DE LA VISIBILITÉ DE LA PAGE
   =========================================== */

// Gérer les changements de visibilité (compatible iOS 9.3.5)
function handleVisibilityChange() {
    var isHidden = document.hidden || document.webkitHidden;
    
    if (isHidden) {
        debugLog('Application en arrière-plan');
        isAppInBackground = true;
        setRefreshRate(REFRESH_BACKGROUND, 'Mode arrière-plan');
        
    } else {
        debugLog('Application au premier plan');
        isAppInBackground = false;
        
        // Enregistrer l'interaction de retour
        recordInteraction();
        
        // Rafraîchissement immédiat au retour
        if (!isLoading && haUrl && haToken) {
            debugLog('Rafraîchissement immédiat au retour');
            loadStates();
        }
    }
}

// Installer le listener de visibilité
function setupVisibilityListener() {
    // Essayer les différentes APIs selon le navigateur
    var visibilityEvent = 'visibilitychange';
    if (document.webkitHidden !== undefined) {
        visibilityEvent = 'webkitvisibilitychange';
    }
    
    document.addEventListener(visibilityEvent, handleVisibilityChange);
    debugLog('Listener visibilité installé: ' + visibilityEvent);
}

/* ===========================================
   LOGIQUE DE SMART REFRESH
   =========================================== */

// Calculer le taux de rafraîchissement optimal
function calculateOptimalRefreshRate() {
    var now = Date.now();
    var timeSinceLastInteraction = now - lastInteraction;
    
    // App en arrière-plan = rafraîchissement très lent
    if (isAppInBackground) {
        return REFRESH_BACKGROUND;
    }
    
    // Inactivité longue
    if (timeSinceLastInteraction > DEEP_IDLE_THRESHOLD) {
        return REFRESH_DEEP_IDLE;
    }
    
    // Inactivité courte
    if (timeSinceLastInteraction > IDLE_THRESHOLD) {
        return REFRESH_IDLE;
    }
    
    // Activité normale
    return REFRESH_NORMAL;
}

// Appliquer un nouveau taux de rafraîchissement
function setRefreshRate(newRate, reason) {
    if (newRate === currentRefreshRate) {
        return; // Pas de changement
    }
    
    debugLog('Changement taux refresh: ' + currentRefreshRate + 'ms → ' + newRate + 'ms (' + reason + ')');
    
    currentRefreshRate = newRate;
    
    // Redémarrer l'interval avec le nouveau taux
    if (smartRefreshInterval) {
        clearInterval(smartRefreshInterval);
    }
    
    startSmartRefreshInterval();
}

// Évaluer et ajuster le taux de rafraîchissement
function evaluateRefreshRate() {
    var optimalRate = calculateOptimalRefreshRate();
    
    if (optimalRate !== currentRefreshRate) {
        var reason = getRefreshRateReason(optimalRate);
        setRefreshRate(optimalRate, reason);
    }
}

// Obtenir la raison du changement de taux
function getRefreshRateReason(rate) {
    switch (rate) {
        case REFRESH_NORMAL:
            return 'Activité normale';
        case REFRESH_IDLE:
            return 'Inactivité courte (5min)';
        case REFRESH_DEEP_IDLE:
            return 'Inactivité longue (15min)';
        case REFRESH_BACKGROUND:
            return 'Arrière-plan';
        default:
            return 'Personnalisé';
    }
}

/* ===========================================
   GESTION DES INTERVALS
   =========================================== */

// Démarrer l'interval de smart refresh
function startSmartRefreshInterval() {
    debugLog('Démarrage smart refresh interval: ' + currentRefreshRate + 'ms');
    
    smartRefreshInterval = setInterval(function() {
        // Évaluer si le taux doit changer
        evaluateRefreshRate();
        
        // Effectuer le rafraîchissement si pas en cours
        if (!isLoading && haUrl && haToken) {
            loadStates();
        }
        
    }, currentRefreshRate);
}

// Arrêter le smart refresh
function stopSmartRefresh() {
    debugLog('Arrêt smart refresh');
    
    if (smartRefreshInterval) {
        clearInterval(smartRefreshInterval);
        smartRefreshInterval = null;
    }
    
    // Arrêter aussi l'ancien refresh si actif
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

/* ===========================================
   INTÉGRATION AVEC L'API EXISTANTE
   =========================================== */

// Remplacer startAutoRefresh par startSmartRefresh
function startSmartAutoRefresh() {
    debugLog('=== DÉMARRAGE SMART AUTO-REFRESH ===');
    
    // Arrêter tout refresh existant
    stopSmartRefresh();
    
    // Installer les listeners
    setupInteractionListeners();
    setupVisibilityListener();
    
    // Premier chargement immédiat
    if (!isLoading && haUrl && haToken) {
        loadStates();
    }
    
    // Démarrer l'interval intelligent
    startSmartRefreshInterval();
    
    debugLog('Smart refresh démarré avec succès');
}

// Fonction de nettoyage améliorée
function cleanupSmartRefresh() {
    debugLog('Nettoyage smart refresh');
    
    // Arrêter les intervals
    stopSmartRefresh();
    
    // Supprimer les listeners
    removeInteractionListeners();
    
    // Réinitialiser les variables
    lastInteraction = Date.now();
    currentRefreshRate = REFRESH_NORMAL;
    isAppInBackground = false;
}

/* ===========================================
   DIAGNOSTICS ET MONITORING
   =========================================== */

// Obtenir les statistiques du smart refresh
function getSmartRefreshStats() {
    var now = Date.now();
    var timeSinceLastInteraction = now - lastInteraction;
    
    return {
        currentRate: currentRefreshRate,
        rateName: getRefreshRateReason(currentRefreshRate),
        lastInteraction: new Date(lastInteraction).toLocaleTimeString(),
        timeSinceInteraction: Math.round(timeSinceLastInteraction / 1000) + 's',
        isBackground: isAppInBackground,
        listenersActive: interactionListenersActive,
        intervalActive: !!smartRefreshInterval
    };
}

// Afficher les stats de debug si demandé
function debugSmartRefreshStats() {
    if (!DEBUG_MODE) return;
    
    var stats = getSmartRefreshStats();
    debugLog('=== SMART REFRESH STATS ===');
    
    for (var key in stats) {
        if (stats.hasOwnProperty(key)) {
            debugLog(key + ': ' + stats[key]);
        }
    }
    
    debugLog('=== FIN STATS ===');
}

/* ===========================================
   GESTION DES ERREURS RÉSEAU
   =========================================== */

// Adapter le refresh selon les erreurs réseau
var consecutiveNetworkErrors = 0;
var maxNetworkErrors = 3;

// Enregistrer une erreur réseau
function recordNetworkError() {
    consecutiveNetworkErrors++;
    debugLog('Erreur réseau #' + consecutiveNetworkErrors);
    
    if (consecutiveNetworkErrors >= maxNetworkErrors) {
        // Ralentir drastiquement après plusieurs erreurs
        var errorRate = currentRefreshRate * 2;
        setRefreshRate(Math.min(errorRate, 300000), 'Erreurs réseau répétées'); // Max 5 minutes
    }
}

// Réinitialiser le compteur d'erreurs après succès
function resetNetworkErrors() {
    if (consecutiveNetworkErrors > 0) {
        debugLog('Réinitialisation compteur erreurs réseau');
        consecutiveNetworkErrors = 0;
        
        // Revenir au taux normal si on était ralenti pour erreurs
        evaluateRefreshRate();
    }
}

/* ===========================================
   INTÉGRATION AVEC L'APPLICATION PRINCIPALE
   =========================================== */

// Remplacer la fonction startAutoRefresh existante
function startAutoRefresh() {
    startSmartAutoRefresh();
}

// Intégrer dans les callbacks de succès/erreur API
var originalSendServiceCall = sendServiceCall;
if (typeof sendServiceCall === 'function') {
    sendServiceCall = function(domain, service, data, callback) {
        return originalSendServiceCall(domain, service, data, function(success) {
            if (success) {
                resetNetworkErrors();
            } else {
                recordNetworkError();
            }
            
            if (callback) callback(success);
        });
    };
}

// Patch de la fonction loadStates pour intégrer le monitoring
var originalLoadStates = loadStates;
if (typeof loadStates === 'function') {
    loadStates = function() {
        // Appeler la fonction originale avec monitoring
        var startTime = Date.now();
        
        originalLoadStates();
        
        // Le monitoring se fait dans les callbacks XHR existants
        var checkResult = function() {
            if (!isLoading) {
                var duration = Date.now() - startTime;
                if (duration > 5000) { // Plus de 5 secondes = lent
                    debugLog('Chargement lent détecté: ' + duration + 'ms');
                }
                return;
            }
            
            // Réessayer dans 100ms
            setTimeout(checkResult, 100);
        };
        
        setTimeout(checkResult, 100);
    };
}

/* ===========================================
   INITIALISATION
   =========================================== */

// Auto-diagnostic toutes les 5 minutes en mode debug
if (DEBUG_MODE) {
    setInterval(debugSmartRefreshStats, 300000);
}

debugLog('Module Smart Refresh chargé');