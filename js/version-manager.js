import { STORAGE_KEYS, VOCAB_KEY, SENTENCES_KEY, getLearned } from './store.js';
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => reg.unregister());
        })
        .finally(() => {
          navigator.serviceWorker.register('/sw.js', { type: 'module' });
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
  const exportData = {
    version: APP_VERSION,
    learnedVocab: getLearned(VOCAB_KEY),
    learnedSentences: getLearned(SENTENCES_KEY),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kfr-export-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

function handleClickImportData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let importedData;
      try {
        importedData = JSON.parse(event.target.result);
      } catch (err) {
        console.error('Failed to parse imported data:', err);
        alert('Invalid JSON file.');
        return;
      }

      const { learnedVocab, learnedSentences } = importedData;
      const isValidVocab = true; // TODO: Implement validation logic
      const isValidSentences = true; // TODO: Implement validation logic
      if (isValidVocab && isValidSentences) {
        localStorage.setItem(STORAGE_KEYS.vocab, JSON.stringify(learnedVocab));
        localStorage.setItem(STORAGE_KEYS.sentences, JSON.stringify(learnedSentences));
        console.log('Data imported successfully. Reloading...');
        window.location.reload();
      } else {
        alert('Imported file does not contain valid data.');
      }
    };
    reader.readAsText(file);
  });

  input.click();
}

btnUpdate.addEventListener('click', handleClickUpdate);
btnExportData.addEventListener('click', handleClickExportData);
btnImportData.addEventListener('click', handleClickImportData);

renderUpdateButton();
