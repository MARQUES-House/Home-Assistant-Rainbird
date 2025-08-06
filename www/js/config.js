/* ===========================================
   DASHBOARD HOME ASSISTANT - CONFIGURATION
   Compatible iOS 9.3.5 - Syntaxe ES5 uniquement
   =========================================== */

// Gestion d'erreurs globale pour iOS 9.3.5
window.onerror = function (msg, url, lineNo, columnNo, error) {
    debugLog("JS ERROR: " + msg + " Ligne: " + lineNo);
    return false;
};

/* ===========================================
   VARIABLES GLOBALES
   =========================================== */

// Configuration de connexion Home Assistant
var haUrl = '';
var haToken = '';

// Données et état de l'application
var entities = [];
var refreshInterval = null;
var isLoading = false;
var pendingCommands = [];

// Navigation
var currentFilter = 'all';
var currentRoom = null;
var currentMaterial = null;

// Paramètres de l'application
var REFRESH_INTERVAL = 10000; // 10 secondes
var DEBUG_MODE = true; // Activer/désactiver les logs de debug

/* ===========================================
   CONFIGURATION DES PIÈCES
   =========================================== */

var roomsConfig = {
    'adele': { 
        name: '👧 Adèle', 
        entities: [
            'climate.adele',
            'cover.fenetre_adele_arriere',
            'cover.fenetre_adele_ru',
            'sensor.adele_temperature',
            'sensor.adele_humidite',
            'binary_sensor.adele_probleme'
        ]
    },
    'alex': { 
        name: '👦 Alex', 
        entities: [
            'climate.alex',
            'cover.fenetre_alex_jar',
            'cover.fenetre_alex_rue',
            'sensor.alex_temperature',
            'sensor.alex_humidite',
            'binary_sensor.alex_probleme'
        ]
    },
    'bureau': { 
        name: '💼 Bureau', 
        entities: [
            'climate.bureau',
            'cover.fenetre_bureau',
            'sensor.bureau_temperature',
            'sensor.bureau_humidite',
            'binary_sensor.bureau_probleme'
        ]
    },
    'cuisine': { 
        name: '🍳 Cuisine', 
        entities: [
            'climate.cuisine',
            'cover.fenetre_cuisine',
            'cover.fenetre_cuisine_avant',
            'sensor.cuisine_temperature',
            'sensor.cuisine_humidite',
            'binary_sensor.cuisine_probleme'
        ]
    },
    'entree_tv': { 
        name: '📺 Entrée & TV', 
        entities: [
            'climate.entree_tv',
            'cover.fenetre_entree',
            'cover.fenetre_salon_central',
            'cover.fenetre_salon_dr',
            'cover.fenetre_salon_gauche',
            'cover.fenetre_salon_tv',
            'sensor.entree_tv_temperature',
            'sensor.entree_tv_humidite',
            'binary_sensor.entree_tv_probleme'
        ]
    },
    'parents': { 
        name: '🛏️ Parents', 
        entities: [
            'climate.parents',
            'cover.fenetre_sdb_suite',
            'cover.fenetre_suite',
            'sensor.parents_temperature',
            'sensor.parents_humidite',
            'binary_sensor.parents_probleme'
        ]
    }
};

/* ===========================================
   CONFIGURATION DU MATÉRIEL
   =========================================== */

var materialConfig = {
    'volets': { 
        name: '🪟 Volets', 
        entities: [
            'cover.tous_les_volets',
            'cover.volets_rdc_2',
            'cover.volets_chambres_2',
            'cover.fenetre_adele_arriere',
            'cover.fenetre_adele_ru',
            'cover.fenetre_alex_jar',
            'cover.fenetre_alex_rue',
            'cover.fenetre_bureau',
            'cover.fenetre_cuisine',
            'cover.fenetre_cuisine_avant',
            'cover.fenetre_entree',
            'cover.fenetre_salon_central',
            'cover.fenetre_salon_dr',
            'cover.fenetre_salon_gauche',
            'cover.fenetre_salon_tv',
            'cover.fenetre_sdb_suite',
            'cover.fenetre_suite'
        ]
    },
    'temperature': { 
        name: '🌡️ Température', 
        entities: [
            'sensor.adele_temperature',
            'sensor.alex_temperature',
            'sensor.bureau_temperature',
            'sensor.cuisine_temperature',
            'sensor.entree_tv_temperature',
            'sensor.parents_temperature',
            'weather.forecast_maison'
        ]
    },
    'climatisation': {
        name: '❄️ Climatisation',
        entities: [
            'climate.adele',
            'climate.alex',
            'climate.bureau',
            'climate.cuisine',
            'climate.entree_tv',
            'climate.parents'
        ]
    },
    'electromenager': { 
        name: '🔌 Électroménager', 
        entities: [
            'switch.lave_vaisselle_etat',
            'sensor.lave_vaisselle_etat',
            'sensor.lave_vaisselle_porte',
            'switch.table_de_cuisson_etat',
            'switch.table_de_cuisson_securite_enfant',
            'sensor.table_de_cuisson_etat'
        ]
    },
    'eclairage': {
        name: '💡 Éclairage',
        entities: [
            'light.salon_principal',
            'light.cuisine_spots',
            'light.chambre_adele',
            'light.chambre_alex',
            'light.bureau_desk',
            'light.chambre_parents'
        ]
    },
    'securite': {
        name: '🔒 Sécurité',
        entities: [
            'binary_sensor.adele_probleme',
            'binary_sensor.alex_probleme',
            'binary_sensor.bureau_probleme',
            'binary_sensor.cuisine_probleme',
            'binary_sensor.entree_tv_probleme',
            'binary_sensor.parents_probleme'
        ]
    }
};

/* ===========================================
   CONFIGURATION DES SCÉNARIOS
   =========================================== */

var scenariosConfig = {
    'coucher': { 
        name: '😴 Coucher', 
        icon: '🌙', 
        service: 'script.scenario_coucher', 
        description: 'Mode nuit avec éclairage tamisé', 
        className: 'coucher',
        confirmMessage: 'Activer le mode coucher ?\n\n• Éclairage tamisé\n• Volets fermés\n• Climatisation réduite'
    },
    'absent': { 
        name: '🏠 Absent', 
        icon: '🚪', 
        service: 'script.scenario_absent', 
        description: 'Sécurisation de la maison', 
        className: 'absent',
        confirmMessage: 'Activer le mode absent ?\n\n• Éclairages éteints\n• Volets fermés\n• Sécurité activée'
    },
    'fete': { 
        name: '🎉 Fête', 
        icon: '🎊', 
        service: 'script.scenario_fete', 
        description: 'Ambiance festive', 
        className: 'fete',
        confirmMessage: 'Activer le mode fête ?\n\n• Éclairage coloré\n• Musique\n• Ambiance festive'
    },
    'film': { 
        name: '🎥 Soirée Film', 
        icon: '🍿', 
        service: 'script.scenario_soiree_film', 
        description: 'Ambiance cinéma', 
        className: 'film',
        confirmMessage: 'Activer le mode cinéma ?\n\n• Éclairage tamisé\n• Volets fermés\n• Son optimisé'
    },
    'nuit': { 
        name: '🌌 Nuit', 
        icon: '😴', 
        service: 'script.scenario_nuit', 
        description: 'Extinction complète', 
        className: 'nuit',
        confirmMessage: 'Activer le mode nuit ?\n\n• Extinction complète\n• Sécurité nocturne\n• Mode silencieux'
    },
    'reveil': {
        name: '☀️ Réveil',
        icon: '🌅',
        service: 'script.scenario_reveil',
        description: 'Réveil en douceur',
        className: 'reveil',
        confirmMessage: 'Activer le mode réveil ?\n\n• Éclairage progressif\n• Volets ouverts\n• Température confort'
    },
    'detente': {
        name: '🛋️ Détente',
        icon: '☕',
        service: 'script.scenario_detente',
        description: 'Mode relaxation',
        className: 'detente',
        confirmMessage: 'Activer le mode détente ?\n\n• Éclairage doux\n• Température confort\n• Ambiance zen'
    }
};

/* ===========================================
   CONFIGURATION DES DOMAINES D'ENTITÉS
   =========================================== */

// Mapping des domaines avec leurs icônes et couleurs
var domainConfig = {
    'climate': {
        icon: '❄️',
        name: 'Climatisation',
        controllable: true,
        color: '#2980b9'
    },
    'cover': {
        icon: '🪟',
        name: 'Volets',
        controllable: true,
        color: '#3498db'
    },
    'light': {
        icon: '💡',
        name: 'Éclairage',
        controllable: true,
        color: '#f39c12'
    },
    'switch': {
        icon: '🔌',
        name: 'Interrupteur',
        controllable: true,
        color: '#27ae60'
    },
    'sensor': {
        icon: '📊',
        name: 'Capteur',
        controllable: false,
        color: '#95a5a6'
    },
    'binary_sensor': {
        icon: '🔍',
        name: 'Détecteur',
        controllable: false,
        color: '#e74c3c'
    },
    'weather': {
        icon: '🌤️',
        name: 'Météo',
        controllable: false,
        color: '#3498db'
    },
    'automation': {
        icon: '🤖',
        name: 'Automatisation',
        controllable: true,
        color: '#9b59b6'
    },
    'script': {
        icon: '📝',
        name: 'Script',
        controllable: true,
        color: '#e67e22'
    }
};

/* ===========================================
   CONFIGURATION DES UNITÉS ET FORMATAGE
   =========================================== */

// Unités de mesure et leur formatage
var unitConfig = {
    '°C': { symbol: '°C', decimals: 1, color: '#e74c3c' },
    '%': { symbol: '%', decimals: 0, color: '#3498db' },
    'W': { symbol: 'W', decimals: 0, color: '#f39c12' },
    'kWh': { symbol: 'kWh', decimals: 2, color: '#27ae60' },
    'lx': { symbol: 'lx', decimals: 0, color: '#f1c40f' },
    'hPa': { symbol: 'hPa', decimals: 0, color: '#95a5a6' },
    'km/h': { symbol: 'km/h', decimals: 0, color: '#3498db' },
    'mm': { symbol: 'mm', decimals: 1, color: '#3498db' }
};

/* ===========================================
   CONFIGURATION DES MESSAGES
   =========================================== */

var messages = {
    // Messages de connexion
    connection: {
        connecting: '🔄 Connexion en cours...',
        success: '✅ Connexion réussie !',
        failed: '❌ Erreur de connexion',
        timeout: '⏱️ Délai de connexion dépassé',
        unauthorized: '🔐 Token invalide ou expiré',
        networkError: '🌐 Erreur réseau'
    },
    
    // Messages d'actions
    actions: {
        commandSent: '✅ Commande envoyée',
        commandFailed: '❌ Erreur lors de la commande',
        scenarioStarted: '🎬 Scénario lancé avec succès',
        scenarioFailed: '❌ Erreur lors du lancement du scénario'
    },
    
    // Messages de validation
    validation: {
        urlRequired: 'Veuillez saisir l\'URL de Home Assistant',
        tokenRequired: 'Veuillez saisir le token d\'accès',
        invalidUrl: 'URL invalide. Format attendu: http://IP:8123',
        fieldsRequired: 'Veuillez remplir tous les champs'
    },
    
    // Messages d'état
    status: {
        loading: '⏳ Chargement des données...',
        noData: '📭 Aucune donnée disponible',
        updateSuccess: '🔄 Données mises à jour',
        lastUpdate: 'Dernière mise à jour : ',
        entitiesLoaded: ' entités chargées'
    }
};

/* ===========================================
   CONFIGURATION DES COULEURS DE STATUT
   =========================================== */

var statusColors = {
    'on': '#5cb85c',
    'off': '#d9534f',
    'open': '#3498db',
    'closed': '#e74c3c',
    'opening': '#f39c12',
    'closing': '#f39c12',
    'heat': '#e74c3c',
    'cool': '#3498db',
    'auto': '#9b59b6',
    'unavailable': '#95a5a6',
    'unknown': '#95a5a6',
    'idle': '#95a5a6'
};

/* ===========================================
   FONCTIONS UTILITAIRES DE CONFIGURATION
   =========================================== */

// Fonction pour obtenir la configuration d'un domaine
function getDomainConfig(domain) {
    return domainConfig[domain] || {
        icon: '❓',
        name: domain,
        controllable: false,
        color: '#95a5a6'
    };
}

// Fonction pour obtenir la couleur selon l'état
function getStatusColor(state) {
    return statusColors[state] || statusColors['unknown'];
}

// Fonction pour formater une valeur avec son unité
function formatValue(value, unit) {
    if (!value || value === 'unknown' || value === 'unavailable') {
        return '—';
    }
    
    var config = unitConfig[unit];
    if (config) {
        var numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        return numValue.toFixed(config.decimals) + config.symbol;
    }
    
    return value + (unit ? ' ' + unit : '');
}

// Fonction pour nettoyer et formater les noms d'entités
function formatFriendlyName(entityId, friendlyName) {
    if (friendlyName && friendlyName !== '') {
        return friendlyName;
    }
    
    // Fallback: formatter l'entity_id
    var parts = entityId.split('.');
    var name = parts[1] || entityId;
    
    // Remplacements courants
    name = name.replace(/_/g, ' ');
    name = name.replace(/fenetre/g, 'Fenêtre');
    name = name.replace(/temperature/g, 'Température');
    name = name.replace(/humidite/g, 'Humidité');
    name = name.replace(/probleme/g, 'Problème');
    name = name.replace(/lave vaisselle/g, 'Lave-vaisselle');
    name = name.replace(/table de cuisson/g, 'Table de cuisson');
    name = name.replace(/salon/g, 'Salon');
    name = name.replace(/chambre/g, 'Chambre');
    name = name.replace(/cuisine/g, 'Cuisine');
    name = name.replace(/bureau/g, 'Bureau');
    name = name.replace(/entree/g, 'Entrée');
    name = name.replace(/parents/g, 'Parents');
    
    // Capitaliser la première lettre
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// Fonction pour compter les entités disponibles dans une liste
function countAvailableEntities(entityList) {
    var count = 0;
    for (var i = 0; i < entityList.length; i++) {
        for (var j = 0; j < entities.length; j++) {
            if (entities[j].entity_id === entityList[i]) {
                count++;
                break;
            }
        }
    }
    return count;
}

// Fonction pour vérifier si une entité est contrôlable
function isEntityControllable(entityId) {
    var domain = entityId.split('.')[0];
    var config = getDomainConfig(domain);
    return config.controllable;
}

// Fonction de debug (peut être désactivée en production)
function debugLog(message) {
    if (!DEBUG_MODE) return;
    
    var debugPanel = document.getElementById('debugPanel');
    var debugText = document.getElementById('debugText');
    
    if (debugPanel && debugText) {
        var now = new Date();
        var timeStr = ('0' + now.getHours()).slice(-2) + ':' + 
                      ('0' + now.getMinutes()).slice(-2) + ':' + 
                      ('0' + now.getSeconds()).slice(-2);
        
        debugText.innerHTML = timeStr + ': ' + message;
        debugPanel.style.display = 'block';
        
        // Masquer automatiquement après 3 secondes
        setTimeout(function() {
            if (debugPanel) {
                debugPanel.style.display = 'none';
            }
        }, 3000);
    }
    
    // Log aussi dans la console pour le développement
    if (console && console.log) {
        console.log('[HA Dashboard] ' + message);
    }
}

/* ===========================================
   INITIALISATION DE LA CONFIGURATION
   =========================================== */

// Log de démarrage
debugLog('Configuration chargée - ' + Object.keys(roomsConfig).length + ' pièces, ' + 
         Object.keys(materialConfig).length + ' types de matériel, ' + 
         Object.keys(scenariosConfig).length + ' scénarios');