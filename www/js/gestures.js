/* ===========================================
   DASHBOARD HOME ASSISTANT - NAVIGATION PAR GESTES
   Swipe entre sections + Gestures tactiles
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   VARIABLES DE GESTION DES GESTES
   =========================================== */

// Configuration des gestes
var SWIPE_THRESHOLD = 50;        // Distance minimale pour déclencher un swipe (px)
var SWIPE_VELOCITY_THRESHOLD = 0.3; // Vitesse minimale (px/ms)
var TAP_THRESHOLD = 10;          // Distance maximale pour un tap (px)
var LONG_PRESS_DURATION = 500;   // Durée pour un long press (ms)

// Variables de suivi des touches
var touchStartX = 0;
var touchStartY = 0;
var touchStartTime = 0;
var touchEndX = 0;
var touchEndY = 0;
var touchEndTime = 0;
var longPressTimer = null;
var isLongPressing = false;
var gesturesEnabled = true;

// Ordre des filtres pour navigation
var filterOrder = ['all', 'pieces', 'materiel', 'scenarios'];
var currentFilterIndex = 0;

/* ===========================================
   DÉTECTION DES GESTES TACTILES
   =========================================== */

// Démarrer le suivi tactile
function handleTouchStart(event) {
    if (!gesturesEnabled || event.touches.length !== 1) {
        return;
    }
    
    var touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isLongPressing = false;
    
    // Démarrer le timer pour long press
    longPressTimer = setTimeout(function() {
        if (!isLongPressing) {
            handleLongPress(touchStartX, touchStartY);
        }
    }, LONG_PRESS_DURATION);
    
    debugLog('Touch start: ' + touchStartX + ',' + touchStartY);
}

// Suivi du déplacement tactile
function handleTouchMove(event) {
    if (!gesturesEnabled || event.touches.length !== 1) {
        return;
    }
    
    // Annuler le long press si mouvement détecté
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    var touch = event.touches[0];
    var deltaX = Math.abs(touch.clientX - touchStartX);
    var deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Si mouvement significatif, ce n'est plus un tap/long press
    if (deltaX > TAP_THRESHOLD || deltaY > TAP_THRESHOLD) {
        isLongPressing = false;
    }
}

// Fin du geste tactile
function handleTouchEnd(event) {
    if (!gesturesEnabled || event.changedTouches.length !== 1) {
        return;
    }
    
    // Nettoyer le timer long press
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    var touch = event.changedTouches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    touchEndTime = Date.now();
    
    // Calculer les deltas
    var deltaX = touchEndX - touchStartX;
    var deltaY = touchEndY - touchStartY;
    var deltaTime = touchEndTime - touchStartTime;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    var velocity = distance / deltaTime;
    
    debugLog('Touch end: deltaX=' + deltaX + ', deltaY=' + deltaY + ', velocity=' + velocity.toFixed(2));
    
    // Éviter de traiter si long press en cours
    if (isLongPressing) {
        return;
    }
    
    // Détecter le type de geste
    if (distance < TAP_THRESHOLD) {
        // Tap simple - déjà géré par les événements click
        return;
    }
    
    // Vérifier si c'est un swipe horizontal valide
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && 
        Math.abs(deltaX) > Math.abs(deltaY) * 2 && // Plus horizontal que vertical
        velocity > SWIPE_VELOCITY_THRESHOLD) {
        
        if (deltaX > 0) {
            handleSwipeRight();
        } else {
            handleSwipeLeft();
        }
    }
    
    // Vérifier si c'est un swipe vertical valide
    else if (Math.abs(deltaY) > SWIPE_THRESHOLD && 
             Math.abs(deltaY) > Math.abs(deltaX) * 2 && // Plus vertical qu'horizontal
             velocity > SWIPE_VELOCITY_THRESHOLD) {
        
        if (deltaY > 0) {
            handleSwipeDown();
        } else {
            handleSwipeUp();
        }
    }
}

/* ===========================================
   GESTION DES GESTES SPÉCIFIQUES
   =========================================== */

// Swipe vers la droite - Filtre précédent
function handleSwipeRight() {
    debugLog('Swipe droite détecté');
    
    // Retour en arrière dans les détails
    if (currentRoom !== null) {
        showPiecesList();
        return;
    }
    
    if (currentMaterial !== null) {
        showMaterielList();
        return;
    }
    
    // Navigation vers filtre précédent
    switchToPreviousFilter();
}

// Swipe vers la gauche - Filtre suivant
function handleSwipeLeft() {
    debugLog('Swipe gauche détecté');
    
    // Pas de navigation dans les détails
    if (currentRoom !== null || currentMaterial !== null) {
        return;
    }
    
    // Navigation vers filtre suivant
    switchToNextFilter();
}

// Swipe vers le haut - Rafraîchir
function handleSwipeUp() {
    debugLog('Swipe haut détecté - Rafraîchissement');
    
    if (!isLoading && haUrl && haToken) {
        showTemporaryMessage('🔄 Rafraîchissement...', 'info');
        loadStates();
    }
}

// Swipe vers le bas - Retour au début ou configuration
function handleSwipeDown() {
    debugLog('Swipe bas détecté');
    
    // Si dans les détails, retourner à la liste
    if (currentRoom !== null) {
        showPiecesList();
    } else if (currentMaterial !== null) {
        showMaterielList();
    } else {
        // Sinon, scroll vers le haut de la page
        window.scrollTo(0, 0);
    }
}

// Long press - Menu contextuel ou diagnostic
function handleLongPress(x, y) {
    debugLog('Long press détecté à ' + x + ',' + y);
    isLongPressing = true;
    
    // Vibration haptique si supportée
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    // En mode debug, afficher les statistiques
    if (DEBUG_MODE) {
        showDebugInfo();
    } else {
        // Mode normal : afficher un menu contextuel simple
        showContextMenu(x, y);
    }
}

/* ===========================================
   NAVIGATION ENTRE FILTRES
   =========================================== */

// Aller au filtre suivant
function switchToNextFilter() {
    var currentIndex = filterOrder.indexOf(currentFilter);
    if (currentIndex === -1) currentIndex = 0;
    
    var nextIndex = (currentIndex + 1) % filterOrder.length;
    var nextFilter = filterOrder[nextIndex];
    
    debugLog('Navigation: ' + currentFilter + ' → ' + nextFilter);
    
    // Trouver l'onglet correspondant et déclencher le changement
    var tabs = document.getElementsByClassName('filter-tab');
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabText = tab.textContent.toLowerCase();
        
        if ((nextFilter === 'all' && tabText.indexOf('tout') !== -1) ||
            (nextFilter === 'pieces' && tabText.indexOf('pièces') !== -1) ||
            (nextFilter === 'materiel' && tabText.indexOf('matériel') !== -1) ||
            (nextFilter === 'scenarios' && tabText.indexOf('scénarios') !== -1)) {
            
            switchToFilter(nextFilter, tab);
            showSwipeIndicator('→');
            break;
        }
    }
}

// Aller au filtre précédent
function switchToPreviousFilter() {
    var currentIndex = filterOrder.indexOf(currentFilter);
    if (currentIndex === -1) currentIndex = 0;
    
    var prevIndex = currentIndex === 0 ? filterOrder.length - 1 : currentIndex - 1;
    var prevFilter = filterOrder[prevIndex];
    
    debugLog('Navigation: ' + currentFilter + ' ← ' + prevFilter);
    
    // Trouver l'onglet correspondant et déclencher le changement
    var tabs = document.getElementsByClassName('filter-tab');
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabText = tab.textContent.toLowerCase();
        
        if ((prevFilter === 'all' && tabText.indexOf('tout') !== -1) ||
            (prevFilter === 'pieces' && tabText.indexOf('pièces') !== -1) ||
            (prevFilter === 'materiel' && tabText.indexOf('matériel') !== -1) ||
            (prevFilter === 'scenarios' && tabText.indexOf('scénarios') !== -1)) {
            
            switchToFilter(prevFilter, tab);
            showSwipeIndicator('←');
            break;
        }
    }
}

/* ===========================================
   INDICATEURS VISUELS POUR GESTES
   =========================================== */

// Afficher un indicateur temporaire de swipe
function showSwipeIndicator(direction) {
    var indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = direction;
    indicator.style.cssText = 
        'position: fixed; top: 50%; left: 50%; ' +
        'transform: translate(-50%, -50%); ' +
        'background: rgba(74, 144, 226, 0.9); ' +
        'color: white; padding: 20px; ' +
        'border-radius: 50%; font-size: 2em; ' +
        'z-index: 10000; pointer-events: none; ' +
        'animation: swipeIndicator 0.5s ease-out;';
    
    // Ajouter les keyframes si pas déjà présents
    if (!document.getElementById('swipeIndicatorStyle')) {
        var style = document.createElement('style');
        style.id = 'swipeIndicatorStyle';
        style.innerHTML = 
            '@keyframes swipeIndicator { ' +
            '0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } ' +
            '50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } ' +
            '100% { opacity: 0; transform: translate(-50%, -50%) scale(1); } ' +
            '}';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
    
    setTimeout(function() {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 500);
}

// Afficher un menu contextuel simple
function showContextMenu(x, y) {
    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = 
        'position: fixed; left: ' + x + 'px; top: ' + y + 'px; ' +
        'background: rgba(0, 0, 0, 0.9); color: white; ' +
        'border-radius: 8px; padding: 10px; z-index: 10001; ' +
        'font-size: 0.9em; min-width: 150px;';
    
    var menuItems = [
        '🔄 Rafraîchir',
        '⚙️ Configuration',
        '📊 Statistiques'
    ];
    
    var menuHtml = '';
    for (var i = 0; i < menuItems.length; i++) {
        menuHtml += '<div class="menu-item" style="padding: 8px; cursor: pointer; ' +
                   'border-bottom: 1px solid rgba(255,255,255,0.2);" ' +
                   'onclick="handleContextMenuClick(' + i + ')">' + 
                   menuItems[i] + '</div>';
    }
    
    menu.innerHTML = menuHtml;
    document.body.appendChild(menu);
    
    // Supprimer après 3 secondes ou au prochain touch
    var removeMenu = function() {
        if (menu && menu.parentNode) {
            menu.parentNode.removeChild(menu);
        }
        document.removeEventListener('touchstart', removeMenu);
    };
    
    setTimeout(removeMenu, 3000);
    document.addEventListener('touchstart', removeMenu);
}

// Gérer les clics du menu contextuel
function handleContextMenuClick(index) {
    switch (index) {
        case 0: // Rafraîchir
            if (!isLoading && haUrl && haToken) {
                loadStates();
                showTemporaryMessage('🔄 Rafraîchissement manuel', 'info');
            }
            break;
        case 1: // Configuration
            showConfigPanel();
            break;
        case 2: // Statistiques
            if (typeof getSmartRefreshStats === 'function') {
                var stats = getSmartRefreshStats();
                var message = 'Refresh: ' + stats.rateName + '\nDernière interaction: ' + stats.timeSinceInteraction;
                showTemporaryMessage(message, 'info');
            }
            break;
    }
}

// Afficher les informations de debug
function showDebugInfo() {
    var debugInfo = 'DEBUG MODE\n';
    debugInfo += 'Filtre: ' + currentFilter + '\n';
    debugInfo += 'Entités: ' + entities.length + '\n';
    debugInfo += 'Refresh: ' + (refreshInterval ? 'Actif' : 'Inactif') + '\n';
    
    if (typeof getSmartRefreshStats === 'function') {
        var stats = getSmartRefreshStats();
        debugInfo += 'Smart refresh: ' + stats.rateName;
    }
    
    showTemporaryMessage(debugInfo, 'info');
}

/* ===========================================
   GESTION DES CONFLITS ET DÉSACTIVATION
   =========================================== */

// Désactiver temporairement les gestes
function disableGestures() {
    gesturesEnabled = false;
    debugLog('Gestes désactivés');
}

// Réactiver les gestes
function enableGestures() {
    gesturesEnabled = true;
    debugLog('Gestes réactivés');
}

// Vérifier si on est dans une zone où les gestes doivent être désactivés
function shouldDisableGestures(target) {
    // Désactiver dans les champs de saisie
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return true;
    }
    
    // Désactiver dans les zones de scroll
    var scrollableParent = target.closest('.scrollable');
    if (scrollableParent) {
        return true;
    }
    
    return false;
}

/* ===========================================
   INSTALLATION DES LISTENERS
   =========================================== */

// Installer les listeners de gestes
function setupGestureListeners() {
    debugLog('Installation listeners de gestes');
    
    // Utiliser passive listeners pour de meilleures performances
    var options = { passive: true };
    
    document.addEventListener('touchstart', function(e) {
        if (shouldDisableGestures(e.target)) {
            return;
        }
        handleTouchStart(e);
    }, options);
    
    document.addEventListener('touchmove', function(e) {
        if (shouldDisableGestures(e.target)) {
            return;
        }
        handleTouchMove(e);
    }, options);
    
    document.addEventListener('touchend', function(e) {
        if (shouldDisableGestures(e.target)) {
            return;
        }
        handleTouchEnd(e);
    }, options);
    
    // Éviter les gestes système iOS qui interfèrent
    document.addEventListener('touchstart', function(e) {
        // Empêcher le refresh pull-to-refresh natif sur iOS
        if (e.touches.length === 1 && window.pageYOffset === 0) {
            e.preventDefault();
        }
    });
    
    debugLog('Listeners de gestes installés');
}

// Supprimer les listeners de gestes
function removeGestureListeners() {
    debugLog('Suppression listeners de gestes');
    // Note: En pratique, on garderait les listeners actifs
    // Cette fonction est surtout pour le nettoyage en cas de besoin
}

/* ===========================================
   INITIALISATION DES GESTES
   =========================================== */

// Initialiser le système de gestes
function initGestures() {
    debugLog('Initialisation système de gestes');
    
    // Installer les listeners
    setupGestureListeners();
    
    // Activer les gestes
    enableGestures();
    
    debugLog('Système de gestes opérationnel');
}

/* ===========================================
   INTÉGRATION AVEC L'APPLICATION PRINCIPALE
   =========================================== */

// Fonction pour afficher un message temporaire (si pas déjà définie)
if (typeof showTemporaryMessage !== 'function') {
    function showTemporaryMessage(message, type) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 
            'position: fixed; top: 20px; left: 20px; right: 20px; z-index: 10000; ' +
            'padding: 15px; border-radius: 10px; font-weight: 600; text-align: center; ' +
            'background: rgba(74, 144, 226, 0.95); color: white; ' +
            'box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
        
        overlay.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(overlay);
        
        setTimeout(function() {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 2000);
    }
}

// Suppression de la redéfinition de initApp dans ce fichier

debugLog('Module Gestures chargé');