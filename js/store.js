export const STORAGE_KEYS = {
  vocab: 'learnedVocab',
  sentences: 'learnedSentences',
};

export function getLearned(key) {
  const storageKey = STORAGE_KEYS[key] || STORAGE_KEYS.vocab;
  const data = localStorage.getItem(storageKey);
  return data ? JSON.parse(data) : {};
}

export function saveLearned(key, learned) {
  const storageKey = STORAGE_KEYS[key] || STORAGE_KEYS.vocab;
  localStorage.setItem(storageKey, JSON.stringify(learned));
}
