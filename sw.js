importScripts('version.js');

const CACHE_NAME = `pwa-cache-${APP_VERSION}`;

const coreFiles = [
    '/',
    '/index.html',
    '/grammar.html',
    '/feedback.html',
    '/sentences.html',
    '/style.css',
    '/js/utils/speech.js',
    '/js/vocab.js',
    '/js/grammar.js',
    '/js/feedback.js',
    '/js/sentences.js',
    '/manifest.json',
    '/favicon.ico',
];

const icons = [
    '/icons/icon-72.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
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
        caches
            .match(event.request)
            .then((response) => response || fetch(event.request))
            .catch(() => caches.match('/index.html'))
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
