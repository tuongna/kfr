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

export function migrateOldLearned() {
    const oldLearned = JSON.parse(localStorage.getItem('learned')) || [];
    if (oldLearned.length) {
        const vocab = getLearned('vocab');
        const mergedVocab = Object.fromEntries(
            oldLearned.map((ko) => [ko, { level: 0, xp: 10, nextReview: new Date() }])
        );
        saveLearned('vocab', { ...mergedVocab, ...vocab });
        localStorage.removeItem('learned');
    }
}
