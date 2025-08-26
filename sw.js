import { APP_VERSION } from './version.js';
import { genIdFromRR } from './js/utils.js';

const CACHE_NAME = `pwa-cache-${APP_VERSION}`;

const coreFiles = [
  '/',
  '/index.html',
  '/lessions.html',
  '/feedback.html',
  '/style.css',
  '/js/vendors/marked.esm.js',
  '/js/app.js',
  '/js/feedback.js',
  '/js/lessions.js',
  '/js/router.js',
  '/js/store.js',
  '/js/utils.js',
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

const audioFilesToCache = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Fetch audio file list during install
      try {
        const vocabRes = await fetch('/data/vocab.json');
        const vocab = await vocabRes.json();

        const sentencesRes = await fetch('/data/sentences.json');
        const sentences = await sentencesRes.json();

        [...vocab, ...sentences].forEach((item) => {
          const filePath = `/assets/audio/${genIdFromRR(item.rr)}.mp3`;
          audioFilesToCache.push(filePath);
        });
      } catch (err) {
        console.warn('Failed to fetch audio lists', err);
      }

      const urlsToCache = [...coreFiles, ...icons, ...audioFilesToCache];
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
