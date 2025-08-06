/* ===========================================
   DASHBOARD HOME ASSISTANT - NAVIGATION
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

/* ===========================================
   GESTION DES FILTRES PRINCIPAUX
   =========================================== */

// Changer de filtre principal (Tout, Pièces, Matériel, Scénarios)
function switchToFilter(filterType, clickedTab) {
    debugLog('Changement vers filtre: ' + filterType);
    
    // Sauvegarder le nouveau filtre
    currentFilter = filterType;
    
    // Mettre à jour l'apparence des onglets
    updateFilterTabs(clickedTab);
    
    // Masquer tous les contenus
    hideAllContent();
    
    // Réinitialiser les états de navigation
    resetNavigationState();
    
    // Afficher le contenu approprié
    showFilterContent(filterType);
}

// Mettre à jour l'apparence des onglets de filtre
function updateFilterTabs(activeTab) {
    var tabs = document.getElementsByClassName('filter-tab');
    
    // Supprimer la classe active de tous les onglets
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var className = tab.className;
        
        // Supprimer la classe active (compatible iOS 9)
        className = className.replace(/\bactive\b/g, '');
        className = className.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        tab.className = className;
    }
    
    // Ajouter la classe active à l'onglet cliqué
    if (activeTab) {
        activeTab.className += ' active';
    }
    
    debugLog('Onglets mis à jour, actif: ' + (activeTab ? activeTab.textContent : 'aucun'));
}

// Masquer tous les contenus
function hideAllContent() {
    var contentElements = [
        'allContent',
        'piecesContent', 
        'materielContent',
        'scenariosContent',
        'pieceDetails',
        'materielDetails'
    ];
    
    for (var i = 0; i < contentElements.length; i++) {
        var element = document.getElementById(contentElements[i]);
        if (element) {
            element.style.display = 'none';
        }
    }
    
    debugLog('Tous les contenus masqués');
}

// Réinitialiser l'état de navigation
function resetNavigationState() {
    currentRoom = null;
    currentMaterial = null;
    debugLog('État de navigation réinitialisé');
}

// Afficher le contenu selon le filtre sélectionné
function showFilterContent(filterType) {
    switch (filterType) {
        case 'all':
            showAllContent();
            break;
        case 'pieces':
            showPiecesContent();
            break;
        case 'materiel':
            showMaterielContent();
            break;
        case 'scenarios':
            showScenariosContent();
            break;
        default:
            debugLog('ERREUR: Type de filtre inconnu: ' + filterType);
            showAllContent(); // Fallback
    }
}

/* ===========================================
   AFFICHAGE DES CONTENUS PRINCIPAUX
   =========================================== */

// Afficher le contenu principal (toutes les entités)
function showAllContent() {
    debugLog('Affichage contenu principal');
    
    var allContent = document.getElementById('allContent');
    if (allContent) {
        allContent.style.display = 'flex';
        
        // Charger les données si disponibles
        if (entities.length > 0) {
            displayAllStates();
        } else {
            allContent.innerHTML = '<div class="loading">⏳ Chargement des données...</div>';
        }
    } else {
        debugLog('ERREUR: Élément allContent introuvable');
    }
}

// Afficher la grille des pièces
function showPiecesContent() {
    debugLog('Affichage grille pièces');
    
    var piecesContent = document.getElementById('piecesContent');
    if (piecesContent) {
        piecesContent.style.display = 'flex';
        loadPiecesGrid();
    } else {
        debugLog('ERREUR: Élément piecesContent introuvable');
    }
}

// Afficher la grille du matériel  
function showMaterielContent() {
    debugLog('Affichage grille matériel');
    
    var materielContent = document.getElementById('materielContent');
    if (materielContent) {
        materielContent.style.display = 'flex';
        loadMaterielGrid();
    } else {
        debugLog('ERREUR: Élément materielContent introuvable');
    }
}

// Afficher la grille des scénarios
function showScenariosContent() {
    debugLog('Affichage grille scénarios');
    
    var scenariosContent = document.getElementById('scenariosContent');
    if (scenariosContent) {
        scenariosContent.style.display = 'flex';
        loadScenariosGrid();
    } else {
        debugLog('ERREUR: Élément scenariosContent introuvable');
    }
}

/* ===========================================
   CHARGEMENT DES GRILLES
   =========================================== */

// Charger la grille des pièces
function loadPiecesGrid() {
    debugLog('Chargement grille pièces (' + Object.keys(roomsConfig).length + ' pièces)');
    
    var content = document.getElementById('piecesContent');
    if (!content) {
        debugLog('ERREUR: Container piecesContent introuvable');
        return;
    }
    
    var html = '';
    var roomCount = 0;
    
    // Générer les cartes de pièces
    for (var roomId in roomsConfig) {
        if (roomsConfig.hasOwnProperty(roomId)) {
            var room = roomsConfig[roomId];
            var availableEntities = countAvailableEntities(room.entities);
            
            html += generateRoomCard(roomId, room, availableEntities);
            roomCount++;
        }
    }
    
    // Afficher le contenu ou message vide
    if (html === '') {
        html = '<div class="loading">📭 Aucune pièce configurée</div>';
    }
    
    content.innerHTML = html;
    debugLog('Grille pièces chargée: ' + roomCount + ' pièces');
}

// Charger la grille du matériel
function loadMaterielGrid() {
    debugLog('Chargement grille matériel (' + Object.keys(materialConfig).length + ' catégories)');
    
    var content = document.getElementById('materielContent');
    if (!content) {
        debugLog('ERREUR: Container materielContent introuvable');
        return;
    }
    
    var html = '';
    var materialCount = 0;
    
    // Générer les cartes de matériel
    for (var materialId in materialConfig) {
        if (materialConfig.hasOwnProperty(materialId)) {
            var material = materialConfig[materialId];
            var availableEntities = countAvailableEntities(material.entities);
            
            html += generateMaterialCard(materialId, material, availableEntities);
            materialCount++;
        }
    }
    
    // Afficher le contenu ou message vide
    if (html === '') {
        html = '<div class="loading">📭 Aucun matériel configuré</div>';
    }
    
    content.innerHTML = html;
    debugLog('Grille matériel chargée: ' + materialCount + ' catégories');
}

// Charger la grille des scénarios
function loadScenariosGrid() {
    debugLog('Chargement grille scénarios (' + Object.keys(scenariosConfig).length + ' scénarios)');
    
    var content = document.getElementById('scenariosContent');
    if (!content) {
        debugLog('ERREUR: Container scenariosContent introuvable');
        return;
    }
    
    var html = '';
    var scenarioCount = 0;
    
    // Générer les cartes de scénarios
    for (var scenarioId in scenariosConfig) {
        if (scenariosConfig.hasOwnProperty(scenarioId)) {
            var scenario = scenariosConfig[scenarioId];
            html += generateScenarioCard(scenarioId, scenario);
            scenarioCount++;
        }
    }
    
    // Afficher le contenu ou message vide
    if (html === '') {
        html = '<div class="loading">📭 Aucun scénario configuré</div>';
    }
    
    content.innerHTML = html;
    debugLog('Grille scénarios chargée: ' + scenarioCount + ' scénarios');
}

/* ===========================================
   GÉNÉRATION DES CARTES HTML
   =========================================== */

// Générer une carte de pièce
function generateRoomCard(roomId, room, entityCount) {
    var iconEmoji = room.name.split(' ')[0] || '🏠';
    var roomName = room.name.substring(2) || room.name;
    var entityText = entityCount + ' équipement' + (entityCount > 1 ? 's' : '');
    
    return '<div class="room-card" onclick="showPieceDetails(\'' + roomId + '\')">' +
           '<div class="room-icon">' + iconEmoji + '</div>' +
           '<div class="room-name">' + roomName + '</div>' +
           '<div class="room-info">' +
           '<span>' + entityText + '</span>' +
           '</div>' +
           '</div>';
}

// Générer une carte de matériel
function generateMaterialCard(materialId, material, entityCount) {
    var iconEmoji = material.name.split(' ')[0] || '⚙️';
    var materialName = material.name.substring(2) || material.name;
    var entityText = entityCount + ' élément' + (entityCount > 1 ? 's' : '');
    
    return '<div class="material-card" onclick="showMaterielDetails(\'' + materialId + '\')">' +
           '<div class="material-icon">' + iconEmoji + '</div>' +
           '<div class="material-name">' + materialName + '</div>' +
           '<div class="material-info">' +
           '<span>' + entityText + '</span>' +
           '</div>' +
           '</div>';
}

// Générer une carte de scénario
function generateScenarioCard(scenarioId, scenario) {
    return '<div class="scenario-card ' + scenario.className + '" onclick="executeScenario(\'' + scenarioId + '\')">' +
           '<div class="scenario-icon">' + scenario.icon + '</div>' +
           '<div class="scenario-name">' + scenario.name + '</div>' +
           '<div class="scenario-info">' +
           '<span>' + scenario.description + '</span>' +
           '</div>' +
           '</div>';
}

/* ===========================================
   NAVIGATION DANS LES DÉTAILS
   =========================================== */

// Afficher les détails d'une pièce
function showPieceDetails(roomId) {
    debugLog('Affichage détails pièce: ' + roomId);
    
    var room = roomsConfig[roomId];
    if (!room) {
        debugLog('ERREUR: Pièce introuvable: ' + roomId);
        return;
    }
    
    currentRoom = roomId;
    
    // Masquer la grille des pièces
    var piecesContent = document.getElementById('piecesContent');
    if (piecesContent) {
        piecesContent.style.display = 'none';
    }
    
    // Récupérer les entités de la pièce
    var roomEntities = getRoomEntities(room);
    
    // Générer le contenu des détails
    var html = generateRoomDetailsHtml(room, roomEntities);
    
    // Afficher les détails
    var pieceEntities = document.getElementById('pieceEntities');
    if (pieceEntities) {
        pieceEntities.innerHTML = html;
    }
    
    var pieceDetails = document.getElementById('pieceDetails');
    if (pieceDetails) {
        pieceDetails.style.display = 'block';
    }
    
    debugLog('Détails pièce affichés: ' + roomEntities.length + ' entités');
}

// Afficher les détails du matériel
function showMaterielDetails(materialId) {
    debugLog('Affichage détails matériel: ' + materialId);
    
    var material = materialConfig[materialId];
    if (!material) {
        debugLog('ERREUR: Matériel introuvable: ' + materialId);
        return;
    }
    
    currentMaterial = materialId;
    
    // Masquer la grille du matériel
    var materielContent = document.getElementById('materielContent');
    if (materielContent) {
        materielContent.style.display = 'none';
    }
    
    // Récupérer les entités du matériel
    var materialEntities = getMaterialEntities(material);
    
    // Générer le contenu des détails
    var html = generateMaterialDetailsHtml(material, materialEntities);
    
    // Afficher les détails
    var materielEntities = document.getElementById('materielEntities');
    if (materielEntities) {
        materielEntities.innerHTML = html;
    }
    
    var materielDetails = document.getElementById('materielDetails');
    if (materielDetails) {
        materielDetails.style.display = 'block';
    }
    
    debugLog('Détails matériel affichés: ' + materialEntities.length + ' entités');
}

// Retourner à la liste des pièces
function showPiecesList() {
    debugLog('Retour à la liste des pièces');
    
    var pieceDetails = document.getElementById('pieceDetails');
    var piecesContent = document.getElementById('piecesContent');
    
    if (pieceDetails) {
        pieceDetails.style.display = 'none';
    }
    
    if (piecesContent) {
        piecesContent.style.display = 'flex';
    }
    
    currentRoom = null;
}

// Retourner à la liste du matériel
function showMaterielList() {
    debugLog('Retour à la liste du matériel');
    
    var materielDetails = document.getElementById('materielDetails');
    var materielContent = document.getElementById('materielContent');
    
    if (materielDetails) {
        materielDetails.style.display = 'none';
    }
    
    if (materielContent) {
        materielContent.style.display = 'flex';
    }
    
    currentMaterial = null;
}

/* ===========================================
   FONCTIONS UTILITAIRES DE NAVIGATION
   =========================================== */

// Récupérer les entités d'une pièce
function getRoomEntities(room) {
    var roomEntities = [];
    
    if (!room.entities || ! room.entities.length) {
        return roomEntities;
    }
    
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        
        // Vérifier si l'entité fait partie de cette pièce
        for (var j = 0; j < room.entities.length; j++) {
            if (entity.entity_id === room.entities[j]) {
                roomEntities.push(entity);
                break;
            }
        }
    }
    
    return roomEntities;
}

// Récupérer les entités d'une catégorie de matériel
function getMaterialEntities(material) {
    var materialEntities = [];
    
    if (!material.entities || !material.entities.length) {
        return materialEntities;
    }
    
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        
        // Vérifier si l'entité fait partie de cette catégorie
        for (var j = 0; j < material.entities.length; j++) {
            if (entity.entity_id === material.entities[j]) {
                materialEntities.push(entity);
                break;
            }
        }
    }
    
    return materialEntities;
}

// Générer le HTML des détails d'une pièce
function generateRoomDetailsHtml(room, roomEntities) {
    var html = '<div class="section">';
    html += '<h3>' + room.name + ' <span class="section-count">' + roomEntities.length + '</span></h3>';
    
    if (roomEntities.length === 0) {
        html += '<div class="entity">Aucun équipement disponible</div>';
    } else {
        // Trier les entités par domaine pour un meilleur affichage
        var sortedEntities = sortEntitiesByDomain(roomEntities);
        
        for (var i = 0; i < sortedEntities.length; i++) {
            var entity = sortedEntities[i];
            var domain = entity.entity_id.split('.')[0];
            var controllable = isEntityControllable(entity.entity_id);
            
            html += createEntityHtml(entity, controllable, domain);
        }
    }
    
    html += '</div>';
    return html;
}

// Générer le HTML des détails d'une catégorie matériel
function generateMaterialDetailsHtml(material, materialEntities) {
    var html = '<div class="section">';
    html += '<h3>' + material.name + ' <span class="section-count">' + materialEntities.length + '</span></h3>';
    
    if (materialEntities.length === 0) {
        html += '<div class="entity">Aucun élément disponible</div>';
    } else {
        // Trier les entités par domaine pour un meilleur affichage  
        var sortedEntities = sortEntitiesByDomain(materialEntities);
        
        for (var i = 0; i < sortedEntities.length; i++) {
            var entity = sortedEntities[i];
            var domain = entity.entity_id.split('.')[0];
            var controllable = isEntityControllable(entity.entity_id);
            
            html += createEntityHtml(entity, controllable, domain);
        }
    }
    
    html += '</div>';
    return html;
}

// Trier les entités par domaine pour un affichage organisé
function sortEntitiesByDomain(entities) {
    // Ordre de priorité pour l'affichage
    var domainOrder = ['climate', 'cover', 'light', 'switch', 'sensor', 'binary_sensor', 'weather'];
    
    return entities.sort(function(a, b) {
        var domainA = a.entity_id.split('.')[0];
        var domainB = b.entity_id.split('.')[0];
        
        var indexA = domainOrder.indexOf(domainA);
        var indexB = domainOrder.indexOf(domainB);
        
        // Si les domaines ne sont pas dans la liste, les mettre à la fin
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        
        return indexA - indexB;
    });
}

/* ===========================================
   MISE À JOUR DE LA VUE ACTUELLE
   =========================================== */

// Mettre à jour la vue actuellement affichée après rafraîchissement des données
function updateCurrentView() {
    debugLog('Mise à jour vue courante: ' + currentFilter);
    
    switch (currentFilter) {
        case 'all':
            if (document.getElementById('allContent').style.display !== 'none') {
                displayAllStates();
            }
            break;
            
        case 'pieces':
            if (currentRoom) {
                // Mettre à jour les détails de la pièce
                showPieceDetails(currentRoom);
            } else if (document.getElementById('piecesContent').style.display !== 'none') {
                // Mettre à jour la grille des pièces
                loadPiecesGrid();
            }
            break;
            
        case 'materiel':
            if (currentMaterial) {
                // Mettre à jour les détails du matériel
                showMaterielDetails(currentMaterial);
            } else if (document.getElementById('materielContent').style.display !== 'none') {
                // Mettre à jour la grille du matériel
                loadMaterielGrid();
            }
            break;
            
        case 'scenarios':
            if (document.getElementById('scenariosContent').style.display !== 'none') {
                // Recharger la grille des scénarios (pas de données dynamiques)
                loadScenariosGrid();
            }
            break;
            
        default:
            debugLog('ATTENTION: Vue inconnue à mettre à jour: ' + currentFilter);
    }
}

/* ===========================================
   INITIALISATION DE LA NAVIGATION
   =========================================== */

// Initialiser l'état de navigation au démarrage
function initNavigation() {
    debugLog('Initialisation navigation');
    
    // Vérifier que les éléments DOM existent
    var filterTabs = document.getElementById('filterTabs');
    if (!filterTabs) {
        debugLog('ERREUR: filterTabs introuvable lors de l\'initialisation');
        return false;
    }
    
    // Réinitialiser l'état
    currentFilter = 'all';
    currentRoom = null;
    currentMaterial = null;
    
    // Afficher la vue par défaut
    hideAllContent();
    showAllContent();
    
    debugLog('Navigation initialisée avec succès');
    return true;
}

debugLog('Module Navigation chargé');