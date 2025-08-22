const APP_VERSION = '0.0.1+dev.567';

const VERSION_KEY = 'appVersion';

export function checkAndUpdateVersion() {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    console.log('Version changed:', storedVersion, '→', APP_VERSION);

    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } else {
    console.log('Version is up-to-date:', APP_VERSION);
  }
}
