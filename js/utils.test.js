import { getQuizWords } from './utils.js';
import fs from 'fs';

// const data = JSON.parse(fs.readFileSync('./data/vocab.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('./data/sentences.json', 'utf8'));

describe('getQuizWords', () => {
  it('should always return 4 items for every index in data', () => {
    for (let i = 0; i < data.length; i++) {
      const result = getQuizWords(data, i);
      if (result.length !== 4) {
        console.log('Fail at index:', i, 'Result:', result);
      }
      expect(result.length).toBe(4);
    }
  });

  it('should always include the target item at a random position', () => {
    for (let i = 0; i < data.length; i++) {
      const result = getQuizWords(data, i);
      const target = data[i];
      const found = result.some((item) => item.ko === target.ko);
      if (!found) {
        console.log('Target not found at index:', i, 'Result:', result);
      }
      expect(found).toBeTrue();
    }
  });

  it('should not include duplicate items', () => {
    for (let i = 0; i < data.length; i++) {
      const result = getQuizWords(data, i);
      const kos = result.map((item) => item.ko);
      const uniqueIds = new Set(kos);
      if (uniqueIds.size !== 4) {
        console.log('Duplicate found at index:', i, 'Result:', result);
      }
      expect(uniqueIds.size).toBe(4);
    }
  });

  it('should not include the target more than once', () => {
    for (let i = 0; i < data.length; i++) {
      const result = getQuizWords(data, i);
      const targetKo = data[i].ko;
      const count = result.filter((item) => item.ko === targetKo).length;
      if (count !== 1) {
        console.log('Target appears more than once at index:', i, 'Result:', result);
      }
      expect(count).toBe(1);
    }
  });

  it('should not have the target appear at the same position more than 50% of the time', () => {
    const positions = [];
    const runs = data.length;
    for (let run = 0; run < runs; run++) {
      const result = getQuizWords(data, run);
      const idx = result.findIndex((item) => item.ko === data[run].ko);
      positions.push(idx);
    }
    // Count occurrences of each position
    const counts = positions.reduce((acc, pos) => {
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount > runs / 2) {
      console.log('Target appears at the same position too often:', positions);
    }
    expect(maxCount).toBeLessThanOrEqual(runs / 2);
  });

  it('should ensure that if the target is a question (ends with "?"), all candidates also ends with "?"', () => {
    for (let i = 0; i < data.length; i++) {
      const target = data[i];
      if (typeof target.ko === 'string' && target.ko.trim().endsWith('?')) {
        const result = getQuizWords(data, i);
        const questionCandidates = result.filter((item) => item.ko.trim().endsWith('?'));
        if (questionCandidates.length !== 4) {
          console.log('Fail (question) at index:', i, 'Result:', result);
        }
        expect(questionCandidates.length).toBe(4);
      }
    }
  });

  it('should ensure that if the target is an exclamation (ends with "!"), all candidates also ends with "!"', () => {
    for (let i = 0; i < data.length; i++) {
      const target = data[i];
      if (typeof target.ko === 'string' && target.ko.trim().endsWith('!')) {
        const result = getQuizWords(data, i);
        const exclamationCandidates = result.filter((item) => item.ko.trim().endsWith('!'));
        console.log('Fail (exclamation) at index:', i, 'Result:', result);
        expect(exclamationCandidates.length).toBe(1);
      }
    }
  });

  it('should ensure that if the target does NOT end with "?" or "!", none of the candidates end with "?" or "!"', () => {
    for (let i = 0; i < data.length; i++) {
      const target = data[i];
      if (
        typeof target.ko === 'string' &&
        !target.ko.trim().endsWith('?') &&
        !target.ko.trim().endsWith('!')
      ) {
        const result = getQuizWords(data, i);
        const hasQuestionOrExclamation = result.some(
          (item) =>
            typeof item.ko === 'string' &&
            (item.ko.trim().endsWith('?') || item.ko.trim().endsWith('!'))
        );
        if (hasQuestionOrExclamation) {
          console.log('Fail (normal sentence) at index:', i, 'Result:', result);
        }
        expect(hasQuestionOrExclamation).toBeFalse();
      }
    }
  });

  it('should not include candidates with overlapping Vietnamese meanings with the target', () => {
    for (let i = 0; i < data.length; i++) {
      const result = getQuizWords(data, i);
      const target = data[i];
      // All candidates except target should not have overlapping 'vi' meanings
      for (const item of result) {
        if (item.ko !== target.ko && Array.isArray(item.vi) && Array.isArray(target.vi)) {
          const overlap = item.vi.some((mean) => target.vi.includes(mean));
          if (overlap) {
            console.log('Overlapping vi meanings at index:', i, 'Result:', result);
          }
          expect(overlap).toBeFalse();
        }
      }
    }
  });
});
