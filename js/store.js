export const VOCAB_KEY = 'vocab';
export const SENTENCES_KEY = 'sentences';

export const STORAGE_KEYS = {
  [VOCAB_KEY]: 'learnedVocab',
  [SENTENCES_KEY]: 'learnedSentences',
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
