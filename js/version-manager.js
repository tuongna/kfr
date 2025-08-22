import { APP_VERSION } from '../version.js';

const VERSION_KEY = 'appVersion';

const btnUpdate = document.getElementById('btn-update');

function isNewVersionAvailable() {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  return storedVersion !== APP_VERSION;
}

function checkAndUpdateVersion() {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  if (isNewVersionAvailable()) {
    console.log('Version changed:', storedVersion, '→', APP_VERSION);

    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    localStorage.setItem(VERSION_KEY, APP_VERSION);
    window.location.reload();
  } else {
    console.log('Version is up-to-date:', APP_VERSION);
  }
}

function renderUpdateButton() {
  if (isNewVersionAvailable()) {
    btnUpdate.style.display = '';
  } else {
    btnUpdate.style.display = 'none';
  }
}

function handleClickUpdate(e) {
  checkAndUpdateVersion();
  renderUpdateButton();
}

btnUpdate.addEventListener('click', handleClickUpdate);

renderUpdateButton();
