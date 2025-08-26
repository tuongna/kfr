import { STORAGE_KEYS, getLearned } from './store.js';
import { APP_VERSION } from '../version.js';

const VERSION_KEY = 'appVersion';

const btnUpdate = document.getElementById('btn-update');
const btnExportData = document.getElementById('btn-export-data');
const btnImportData = document.getElementById('btn-import-data');

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

function handleClickExportData() {
  const data = {
    version: APP_VERSION,
    learnedVocab: getLearned(STORAGE_KEYS.vocab),
    learnedSentences: getLearned(STORAGE_KEYS.sentences),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kfr-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleClickImportData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.learnedVocab || importedData.learnedSentences) {
            if (importedData.learnedVocab) {
              localStorage.setItem(STORAGE_KEYS.vocab, JSON.stringify(importedData.learnedVocab));
            }
            if (importedData.learnedSentences) {
              localStorage.setItem(
                STORAGE_KEYS.sentences,
                JSON.stringify(importedData.learnedSentences)
              );
            }
            console.log('Data imported successfully! Reloading...');
            window.location.reload();
          } else {
            console.log('Invalid data.');
          }
        } catch (err) {
          console.error('Failed to import data', err);
          console.log('An error occurred while importing data.');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

btnUpdate.addEventListener('click', handleClickUpdate);
btnExportData.addEventListener('click', handleClickExportData);
btnImportData.addEventListener('click', handleClickImportData);

renderUpdateButton();
