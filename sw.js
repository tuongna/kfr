importScripts('version.js');

const CACHE_NAME = `pwa-cache-${APP_VERSION}`;

const urlsToCache = [
    '/',
    '/index.html',
    '/grammar.html',
    '/feedback.html',
    '/style.css',
    '/vocab.js',
    '/grammar.js',
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-72.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches
            .match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k !== CACHE_NAME)
                        .map((k) => caches.delete(k))
                )
            )
    );

    return self.clients.claim();
});
