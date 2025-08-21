importScripts('version.js');

const CACHE_NAME = `pwa-cache-${APP_VERSION}`;

const coreFiles = [
    '/',
    '/index.html',
    '/vocab.html',
    '/lessions.html',
    '/feedback.html',
    '/sentences.html',
    '/style.css',
    '/js/utils/speech.js',
    '/js/vocab.js',
    '/js/lessions.js',
    '/js/feedback.js',
    '/js/sentences.js',
    '/manifest.json',
];

const icons = [
    '/favicon.ico',
    '/assets/icons/icon-72.png',
    '/assets/icons/icon-128.png',
    '/assets/icons/icon-144.png',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
];

const urlsToCache = [...coreFiles, ...icons];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of urlsToCache) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn('Failed to cache', url, err);
                }
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request)
                .then((networkResponse) => {
                    if (
                        event.request.method === 'GET' &&
                        networkResponse.ok &&
                        event.request.url.startsWith('http')
                    ) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('/index.html'));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
            )
    );
    self.clients.claim();
});
