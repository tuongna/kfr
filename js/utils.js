/**
 * Generates an ID from a string by replacing spaces with underscores and shortening if necessary.
 * If the string is longer than 20 characters, it compresses the middle and adds a length indicator.
 *
 * @param {string} rr - The input string.
 * @returns {string} The generated ID.
 */
export function genIdFromRR(rr = '') {
    rr = rr.replace(/\s+/g, '_');

    if (rr.length <= 20) {
        return rr;
    }

    const extra = rr.length - 16;
    const extraStr = extra.toString().padStart(4, '0');

    return rr.slice(0, 8) + extraStr + rr.slice(12, 20);
}

/**
 * Plays an audio file from the assets/audio directory.
 *
 * @param {string} filename - The name of the audio file to play.
 */
export function playAudio(filename) {
    const audio = new Audio(`../assets/audio/${filename}`);
    audio.play();
}

/**
 * Deep clones an object using JSON serialization.
 *
 * @param {any} obj - The object to clone.
 * @returns {any} The deep-cloned object.
 */
export function cloneDeep(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    return JSON.parse(JSON.stringify(obj));
}

/**
 * Shuffles the data array while grouping items with similar tags together.
 * Each group (items with the same sorted tags) is shuffled internally, then the group order is shuffled.
 * The result is a new order where items with similar tags are close, but overall order is randomized.
 *
 * @param {Array<Object>} data - The array of items to shuffle, each item should have a 'tags' property (array).
 * @returns {Array<Object>} The shuffled data array.
 */
export function shuffleData(data) {
    // Group items by their sorted tags
    const groups = {};
    cloneDeep(data).forEach((item) => {
        const key = item.tags.slice().sort().join('|');
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // Shuffle each group
    Object.values(groups).forEach((group) => {
        for (let idx = group.length - 1; idx > 0; idx--) {
            const randIdx = Math.floor(Math.random() * (idx + 1));
            [group[idx], group[randIdx]] = [group[randIdx], group[idx]];
        }
    });

    // Shuffle group order
    const groupKeys = Object.keys(groups);
    for (let i = groupKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [groupKeys[i], groupKeys[j]] = [groupKeys[j], groupKeys[i]];
    }

    // Concatenate groups so similar tags are close
    let result = [];
    groupKeys.forEach((key) => {
        result = result.concat(groups[key]);
    });

    // Return the shuffled data
    return result;
}

/**
 * Finds the index of an item in the destination array (`desData`) that matches the `id` of the item
 * at the specified index (`srcIndex`) in the source array (`srcData`).
 *
 * @param {Array<Object>} srcData - The source array containing objects with an `id` property.
 * @param {Array<Object>} desData - The destination array containing objects with an `id` property.
 * @param {number} srcIndex - The index of the item in `srcData` whose `id` will be matched.
 * @returns {number} The index of the matching item in `desData`, or -1 if no match is found.
 */
export function findMatchingIndex(srcData, desData, srcIndex) {
    const srcItem = srcData[srcIndex];
    return desData.findIndex((item) => item.ko === srcItem.ko);
}

/**
 * Generates a list of quiz words related to the target item at the given index.
 *
 * The function selects up to 3 candidate items from the data array that share tags with the target item,
 * preferring those with a 'word' property if enough exist. The target item is always included.
 * If the result contains fewer than 4 items, additional items are randomly selected from the data array,
 * excluding duplicates and the target item, to ensure a total of 4 items.
 * The final result is shuffled before returning.
 *
 * @param {Array<Object>} data - The array of word objects, each containing at least 'id', 'tags', and optionally 'word'.
 * @param {number} index - The index of the target item in the data array.
 * @returns {Array<Object>} An array of 4 word objects for the quiz, including the target item and related candidates.
 */
export function getQuizWords(data, index) {
    const targetTags = new Set(data[index].tags);

    // Filter candidates sharing tags, excluding the target index
    const candidates = data.filter(
        (item, idx) => idx !== index && item.tags.some((tag) => targetTags.has(tag))
    );

    // Prefer candidates with 'word' property if enough exist
    const pool = candidates.filter((item) => item.word);
    const selectedPool = pool.length >= 3 ? pool : candidates;

    // Shuffle and select up to 3 candidates
    const selected = selectedPool
        .map((item) => item)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    // Add the target item
    let merged = [...selected, data[index]];

    // If there are not enough 4 results, supplement from data (excluding duplicates)
    if (merged.length < 4) {
        const usedIds = new Set(merged.map((item) => item.id));
        const extra = data
            .filter((item) => !usedIds.has(item.id) && item.id !== data[index].id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 4 - merged.length);
        merged = merged.concat(extra);
    }

    // Shuffle the final result
    merged = merged.sort(() => Math.random() - 0.5);

    return merged;
}
