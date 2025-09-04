import { APP_VERSION } from './version.js';
import { genIdFromRR } from './js/utils.js';

const CACHE_NAME = `pwa-cache-${APP_VERSION}`;

const coreFiles = [
  '/',
  '/data/recognition-bias.json',
  '/data/sentences.json',
  '/data/vocab.json',
  '/feedback.html',
  '/index.html',
  '/js/app.js',
  '/js/lessons.js',
  '/js/router.js',
  '/js/store.js',
  '/js/stt/index.js',
  '/js/stt/recognizer-processor.js',
  '/js/utils.js',
  '/js/vendors/marked.esm.js',
  '/js/version.js',
  '/lessions.html',
  '/manifest.json',
  '/style.css',
];

const icons = [
  '/favicon.ico',
  '/assets/icons/icon-72.png',
  '/assets/icons/icon-128.png',
  '/assets/icons/icon-144.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const urlsToCache = [...coreFiles, ...icons];
      const cache = await caches.open(CACHE_NAME);
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('Failed to cache', url, err);
        }
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));

      // Cache audio files during activate
      try {
        const vocabRes = await fetch('/data/vocab.json');
        const vocab = await vocabRes.json();

        const sentencesRes = await fetch('/data/sentences.json');
        const sentences = await sentencesRes.json();

        const audioFiles = [...vocab, ...sentences].map(
          (item) => `/assets/audio/${genIdFromRR(item.rr)}.mp3`
        );
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(
          audioFiles.map((url) => {
            try {
              return cache.add(url);
            } catch (err) {
              console.warn('Failed to cache', url, err);
            }
          })
        );
      } catch (err) {
        console.warn('Failed to fetch audio lists', err);
      }
    })()
  );
  self.clients.claim();
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
            networkResponse.status === 200 &&
            event.request.url.startsWith('http')
          ) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((err) => {
                console.warn('Cache put failed for:', event.request.url, err);
              });
          }

          return networkResponse;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
