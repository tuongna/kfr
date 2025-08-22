/**
 * Generates an ID from a string by replacing spaces with underscores and shortening if necessary.
 * If the string is longer than 20 characters, it compresses the middle and adds a length indicator.
 *
 * @param {string} rr - The input string.
 * @returns {string} The generated ID.
 */
export function genIdFromRR(rr = '') {
  rr = rr.replace(/[.]/g, '_').replace(/\s+/g, '_');

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
 * Shuffles an array using the Fisher-Yates algorithm for unbiased randomization.
 *
 * @param {Array<any>} array - The array to shuffle.
 * @returns {Array<any>} A new shuffled array.
 */
export function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns an array of 4 quiz word objects related to the target item at the given index.
 *
 * Selects up to 3 candidate items from the data array that share tags with the target item,
 * excluding the target itself. If fewer than 3 candidates are found, fills the remainder
 * with random items from the data array (excluding duplicates and the target).
 * The target item is always included. The final array is shuffled before returning.
 * If the target ends with "?" or "!", all candidates also end with that mark.
 * If the target does NOT end with "?" or "!", none of the candidates end with "?" or "!".
 * If not enough candidates, other answers (not ending with "?" or "!") may be mixed in.
 *
 * @param {Array<Object>} data - Array of objects with at least 'id' and 'tags' properties.
 * @param {number} index - Index of the target item in the data array.
 * @returns {Array<Object>} Array of 4 word objects for the quiz, including the target and related candidates.
 */
export function getQuizWords(data, index) {
  const target = data[index];
  const targetTags = new Set(target.tags);
  const koStr = typeof target.ko === 'string' ? target.ko.trim() : '';
  const isQuestion = koStr.endsWith('?');
  const isExclaim = koStr.endsWith('!');
  const isNormal = !isQuestion && !isExclaim;

  // Candidates sharing at least one tag, excluding the target
  let candidates = data
    .map((item, idx) => ({ item, idx }))
    .filter(({ item, idx }) => {
      if (idx === index) return false;
      const itemKo = typeof item.ko === 'string' ? item.ko.trim() : '';
      if (isQuestion && !itemKo.endsWith('?')) return false;
      if (isExclaim && !itemKo.endsWith('!')) return false;
      if (isNormal && (itemKo.endsWith('?') || itemKo.endsWith('!'))) return false;
      return item.tags.some((tag) => targetTags.has(tag));
    });

  // Select up to 3 candidates, avoiding duplicates by index
  let selected = [];
  const usedIdx = new Set([index]);
  for (const { item, idx } of candidates) {
    if (selected.length >= 3) break;
    if (!usedIdx.has(idx)) {
      selected.push(item);
      usedIdx.add(idx);
    }
  }

  // If not enough, fill from other items (excluding duplicates and the target)
  if (selected.length < 3) {
    for (let i = 0; i < data.length && selected.length < 3; i++) {
      if (!usedIdx.has(i)) {
        const item = data[i];
        const itemKo = typeof item.ko === 'string' ? item.ko.trim() : '';
        // If target is a question, prefer candidates ending with "?"
        if (isQuestion && itemKo.endsWith('?')) {
          selected.push(item);
          usedIdx.add(i);
        }
        // If target is an exclamation, prefer candidates ending with "!"
        else if (isExclaim && itemKo.endsWith('!')) {
          selected.push(item);
          usedIdx.add(i);
        }
        // If target is normal, prefer candidates NOT ending with "?" or "!"
        else if (isNormal && !itemKo.endsWith('?') && !itemKo.endsWith('!')) {
          selected.push(item);
          usedIdx.add(i);
        }
      }
    }
    // If still not enough, allow mixing in other answers (not ending with "?" or "!")
    if (selected.length < 3 && isNormal) {
      for (let i = 0; i < data.length && selected.length < 3; i++) {
        if (!usedIdx.has(i)) {
          const itemKo = typeof data[i].ko === 'string' ? data[i].ko.trim() : '';
          if (!itemKo.endsWith('?') && !itemKo.endsWith('!')) {
            selected.push(data[i]);
            usedIdx.add(i);
          }
        }
      }
    }
    // If still not enough, allow any remaining items
    if (selected.length < 3) {
      for (let i = 0; i < data.length && selected.length < 3; i++) {
        if (!usedIdx.has(i)) {
          selected.push(data[i]);
          usedIdx.add(i);
        }
      }
    }
  }

  // Merge target and selected, then shuffle once
  return shuffle([target, ...selected]);
}
