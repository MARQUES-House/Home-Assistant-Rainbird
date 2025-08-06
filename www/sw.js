/* ===========================================
   DASHBOARD HOME ASSISTANT - SERVICE WORKER
   Cache intelligent pour fonctionnement hors ligne
   Compatible iOS 9.3.5
   =========================================== */

   const CACHE_NAME = 'ha-dashboard-v1.0';
   const STATIC_CACHE = 'ha-static-v1.0';
   const DYNAMIC_CACHE = 'ha-dynamic-v1.0';
   
   // Fichiers à mettre en cache lors de l'installation
   const STATIC_FILES = [
     '/',
     '/index.html',
     '/css/base.css',
     '/css/components.css',
     '/css/colors.css',
     '/css/responsive.css',
     '/css/enhancements.css',
     '/js/config.js',
     '/js/api.js',
     '/js/navigation.js',
     '/js/entities.js',
     '/js/scenarios.js',
     '/js/smart-refresh.js',
     '/js/gestures.js',
     '/manifest.json'
   ];
   
   // URLs à ne jamais mettre en cache
   const NEVER_CACHE = [
     '/api/',
     'chrome-extension://',
     'moz-extension://'
   ];
   
   // Durée de vie du cache (en millisecondes)
   const CACHE_DURATION = {
     static: 7 * 24 * 60 * 60 * 1000,    // 7 jours pour les fichiers statiques
     dynamic: 24 * 60 * 60 * 1000,       // 1 jour pour les ressources dynamiques
     api: 5 * 60 * 1000                  // 5 minutes pour les données API (cache de secours)
   };
   
   /* ===========================================
      INSTALLATION DU SERVICE WORKER
      =========================================== */
   
   self.addEventListener('install', event => {
     console.log('[SW] Installation...');
     
     event.waitUntil(
       caches.open(STATIC_CACHE)
         .then(cache => {
           console.log('[SW] Mise en cache des fichiers statiques');
           return cache.addAll(STATIC_FILES);
         })
         .then(() => {
           console.log('[SW] Installation terminée');
           return self.skipWaiting(); // Activer immédiatement
         })
         .catch(err => {
           console.error('[SW] Erreur installation:', err);
         })
     );
   });
   
   /* ===========================================
      ACTIVATION DU SERVICE WORKER
      =========================================== */
   
   self.addEventListener('activate', event => {
     console.log('[SW] Activation...');
     
     event.waitUntil(
       caches.keys()
         .then(cacheNames => {
           // Supprimer les anciens caches
           const deletePromises = cacheNames
             .filter(cacheName => {
               return cacheName !== STATIC_CACHE && 
                      cacheName !== DYNAMIC_CACHE &&
                      (cacheName.startsWith('ha-') || cacheName.startsWith('ha-dashboard-'));
             })
             .map(cacheName => {
               console.log('[SW] Suppression ancien cache:', cacheName);
               return caches.delete(cacheName);
             });
           
           return Promise.all(deletePromises);
         })
         .then(() => {
           console.log('[SW] Activation terminée');
           return self.clients.claim(); // Prendre contrôle immédiatement
         })
         .catch(err => {
           console.error('[SW] Erreur activation:', err);
         })
     );
   });
   
   /* ===========================================
      INTERCEPTION DES REQUÊTES
      =========================================== */
   
   self.addEventListener('fetch', event => {
     const request = event.request;
     const url = new URL(request.url);
     
     // Ignorer les requêtes non-HTTP
     if (!request.url.startsWith('http')) {
       return;
     }
     
     // Ignorer les URLs à ne jamais mettre en cache
     if (NEVER_CACHE.some(pattern => request.url.includes(pattern))) {
       return;
     }
     
     // Stratégie selon le type de ressource
     if (isStaticResource(request)) {
       event.respondWith(cacheFirst(request));
     } else if (isAPIRequest(request)) {
       event.respondWith(networkFirst(request));
     } else {
       event.respondWith(staleWhileRevalidate(request));
     }
   });
   
   /* ===========================================
      STRATÉGIES DE CACHE
      =========================================== */
   
   // Cache First - Pour les ressources statiques
   async function cacheFirst(request) {
     try {
       const cachedResponse = await caches.match(request);
       
       if (cachedResponse) {
         // Vérifier si le cache n'est pas trop ancien
         const cacheTime = await getCacheTime(request);
         const now = Date.now();
         
         if (now - cacheTime < CACHE_DURATION.static) {
           console.log('[SW] Cache hit (static):', request.url);
           return cachedResponse;
         }
       }
       
       // Pas en cache ou expiré, aller sur le réseau
       const networkResponse = await fetch(request);
       
       if (networkResponse.ok) {
         const cache = await caches.open(STATIC_CACHE);
         await cache.put(request, networkResponse.clone());
         await setCacheTime(request);
         console.log('[SW] Mise en cache (static):', request.url);
       }
       
       return networkResponse;
       
     } catch (error) {
       console.log('[SW] Fallback cache (static):', request.url);
       
       // En cas d'erreur réseau, retourner le cache même expiré
       const cachedResponse = await caches.match(request);
       if (cachedResponse) {
         return cachedResponse;
       }
       
       // Dernière option: page d'erreur basique
       if (request.destination === 'document') {
         return new Response(`
           <!DOCTYPE html>
           <html>
           <head>
             <title>Hors ligne - HA Dashboard</title>
             <meta name="viewport" content="width=device-width, initial-scale=1.0">
             <style>
               body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #4a90e2; color: white; }
               .offline { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; max-width: 400px; margin: 0 auto; }
             </style>
           </head>
           <body>
             <div class="offline">
               <h1>🏠 HA Dashboard</h1>
               <h2>📡 Mode hors ligne</h2>
               <p>Impossible de se connecter à Home Assistant.</p>
               <p>Vérifiez votre connexion réseau.</p>
               <button onclick="location.reload()" style="padding: 15px 25px; background: #357abd; color: white; border: none; border-radius: 8px; font-size: 1em; margin-top: 20px;">Réessayer</button>
             </div>
           </body>
           </html>
         `, {
           headers: { 'Content-Type': 'text/html' }
         });
       }
       
       throw error;
     }
   }
   
   // Network First - Pour les API calls
   async function networkFirst(request) {
     try {
       const networkResponse = await fetch(request);
       
       if (networkResponse.ok) {
         // Mettre en cache pour fallback (cache de secours seulement)
         const cache = await caches.open(DYNAMIC_CACHE);
         await cache.put(request, networkResponse.clone());
         await setCacheTime(request);
         console.log('[SW] Cache API (fallback):', request.url);
       }
       
       return networkResponse;
       
     } catch (error) {
       console.log('[SW] Fallback cache (API):', request.url);
       
       // En cas d'erreur réseau, utiliser le cache de secours
       const cachedResponse = await caches.match(request);
       
       if (cachedResponse) {
         // Ajouter un header pour indiquer que c'est du cache
         const response = cachedResponse.clone();
         response.headers.set('X-Served-By', 'ServiceWorker-Cache');
         return response;
       }
       
       // Pas de cache disponible, retourner une réponse d'erreur JSON
       return new Response(JSON.stringify({
         error: 'Réseau indisponible',
         message: 'Impossible de contacter Home Assistant',
         cached: false,
         timestamp: new Date().toISOString()
       }), {
         status: 503,
         headers: { 
           'Content-Type': 'application/json',
           'X-Served-By': 'ServiceWorker-Error'
         }
       });
     }
   }
   
   // Stale While Revalidate - Pour les ressources dynamiques
   async function staleWhileRevalidate(request) {
     const cache = await caches.open(DYNAMIC_CACHE);
     const cachedResponse = await cache.match(request);
     
     // Lancer la requête réseau en arrière-plan
     const networkPromise = fetch(request)
       .then(networkResponse => {
         if (networkResponse.ok) {
           cache.put(request, networkResponse.clone());
           setCacheTime(request);
           console.log('[SW] Mise à jour cache (dynamic):', request.url);
         }
         return networkResponse;
       })
       .catch(error => {
         console.log('[SW] Erreur réseau (dynamic):', request.url, error);
         return null;
       });
     
     // Retourner le cache immédiatement s'il existe
     if (cachedResponse) {
       console.log('[SW] Cache hit (dynamic):', request.url);
       return cachedResponse;
     }
     
     // Sinon attendre la réponse réseau
     return networkPromise;
   }
   
   /* ===========================================
      FONCTIONS UTILITAIRES
      =========================================== */
   
   // Vérifier si c'est une ressource statique
   function isStaticResource(request) {
     const url = request.url;
     return STATIC_FILES.some(file => url.endsWith(file)) ||
            url.includes('/css/') ||
            url.includes('/js/') ||
            url.includes('/icons/') ||
            url.includes('.png') ||
            url.includes('.jpg') ||
            url.includes('.svg') ||
            url.includes('.ico');
   }
   
   // Vérifier si c'est une requête API
   function isAPIRequest(request) {
     return request.url.includes('/api/') ||
            request.url.includes('home-assistant') ||
            request.url.includes(':8123');
   }
   
   // Sauvegarder le timestamp de mise en cache
   async function setCacheTime(request) {
     try {
       const timeCache = await caches.open('ha-timestamps');
       const timestamp = new Response(Date.now().toString());
       await timeCache.put(request.url + ':timestamp', timestamp);
     } catch (error) {
       console.warn('[SW] Impossible de sauvegarder timestamp:', error);
     }
   }
   
   // Récupérer le timestamp de mise en cache
   async function getCacheTime(request) {
     try {
       const timeCache = await caches.open('ha-timestamps');
       const response = await timeCache.match(request.url + ':timestamp');
       
       if (response) {
         const timestamp = await response.text();
         return parseInt(timestamp, 10);
       }
     } catch (error) {
       console.warn('[SW] Impossible de récupérer timestamp:', error);
     }
     
     return 0; // Très ancien si pas de timestamp
   }
   
   /* ===========================================
      NETTOYAGE PÉRIODIQUE DU CACHE
      =========================================== */
   
   // Nettoyer les caches expirés
   async function cleanupExpiredCache() {
     try {
       const cacheNames = await caches.keys();
       
       for (const cacheName of cacheNames) {
         if (cacheName === 'ha-timestamps') continue;
         
         const cache = await caches.open(cacheName);
         const requests = await cache.keys();
         
         for (const request of requests) {
           const cacheTime = await getCacheTime(request);
           const now = Date.now();
           const maxAge = cacheName.includes('static') ? CACHE_DURATION.static : CACHE_DURATION.dynamic;
           
           if (now - cacheTime > maxAge) {
             await cache.delete(request);
             console.log('[SW] Cache expiré supprimé:', request.url);
           }
         }
       }
       
       console.log('[SW] Nettoyage cache terminé');
     } catch (error) {
       console.error('[SW] Erreur nettoyage cache:', error);
     }
   }
   
   // Lancer le nettoyage toutes les 6 heures
   setInterval(cleanupExpiredCache, 6 * 60 * 60 * 1000);
   
   /* ===========================================
      MESSAGES DEPUIS L'APPLICATION
      =========================================== */
   
   self.addEventListener('message', event => {
     const { type, payload } = event.data;
     
     switch (type) {
       case 'SKIP_WAITING':
         console.log('[SW] Message: SKIP_WAITING');
         self.skipWaiting();
         break;
         
       case 'GET_CACHE_INFO':
         getCacheInfo().then(info => {
           event.ports[0].postMessage({
             type: 'CACHE_INFO',
             payload: info
           });
         });
         break;
         
       case 'CLEAR_CACHE':
         clearAllCaches().then(() => {
           event.ports[0].postMessage({
             type: 'CACHE_CLEARED',
             payload: { success: true }
           });
         });
         break;
         
       case 'FORCE_UPDATE':
         console.log('[SW] Mise à jour forcée demandée');
         event.waitUntil(
           caches.delete(STATIC_CACHE).then(() => {
             return caches.open(STATIC_CACHE);
           }).then(cache => {
             return cache.addAll(STATIC_FILES);
           })
         );
         break;
         
       default:
         console.log('[SW] Message inconnu:', type);
     }
   });
   
   // Obtenir les informations de cache
   async function getCacheInfo() {
     try {
       const cacheNames = await caches.keys();
       const info = {
         caches: [],
         totalSize: 0,
         lastCleanup: Date.now()
       };
       
       for (const cacheName of cacheNames) {
         const cache = await caches.open(cacheName);
         const requests = await cache.keys();
         
         info.caches.push({
           name: cacheName,
           entries: requests.length,
           type: cacheName.includes('static') ? 'static' : 'dynamic'
         });
       }
       
       return info;
     } catch (error) {
       console.error('[SW] Erreur info cache:', error);
       return { error: error.message };
     }
   }
   
   // Vider tous les caches
   async function clearAllCaches() {
     try {
       const cacheNames = await caches.keys();
       const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
       await Promise.all(deletePromises);
       console.log('[SW] Tous les caches supprimés');
       return true;
     } catch (error) {
       console.error('[SW] Erreur suppression caches:', error);
       return false;
     }
   }
   
   /* ===========================================
      GESTION DES ERREURS GLOBALES
      =========================================== */
   
   self.addEventListener('error', event => {
     console.error('[SW] Erreur globale:', event.error);
   });
   
   self.addEventListener('unhandledrejection', event => {
     console.error('[SW] Promesse rejetée:', event.reason);
   });
   
   /* ===========================================
      SYNCHRONISATION EN ARRIÈRE-PLAN
      =========================================== */
   
   // Gérer la synchronisation en arrière-plan (si supportée)
   self.addEventListener('sync', event => {
     console.log('[SW] Sync demandée:', event.tag);
     
     if (event.tag === 'background-sync') {
       event.waitUntil(doBackgroundSync());
     }
   });
   
   async function doBackgroundSync() {
     try {
       // Tenter de synchroniser les données critiques
       console.log('[SW] Synchronisation arrière-plan...');
       
       // Ici on pourrait synchroniser les commandes en attente,
       // mais pour iOS 9.3.5, on garde simple
       
       console.log('[SW] Synchronisation terminée');
     } catch (error) {
       console.error('[SW] Erreur synchronisation:', error);
     }
   }
   
   /* ===========================================
      NOTIFICATIONS (si supportées)
      =========================================== */
   
   self.addEventListener('push', event => {
     console.log('[SW] Notification push reçue');
     
     // iOS 9.3.5 ne supporte pas les push notifications
     // mais on garde le code pour compatibilité future
     
     const options = {
       body: 'Mise à jour Home Assistant disponible',
       icon: '/icons/icon-192x192.png',
       badge: '/icons/badge-72x72.png',
       tag: 'ha-update',
       requireInteraction: true
     };
     
     event.waitUntil(
       self.registration.showNotification('HA Dashboard', options)
     );
   });
   
   self.addEventListener('notificationclick', event => {
     console.log('[SW] Clic sur notification');
     
     event.notification.close();
     
     event.waitUntil(
       clients.openWindow('/')
     );
   });
   
   /* ===========================================
      INITIALISATION
      =========================================== */
   
   console.log('[SW] Service Worker HA Dashboard v1.0 chargé');
   
   // Premier nettoyage après 30 secondes
   setTimeout(cleanupExpiredCache, 30000);