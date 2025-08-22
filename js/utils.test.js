import { getQuizWords } from './utils.js';
import fs from 'fs';

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

  it('should shuffle the result so the target is not always at the same position', () => {
    // Check for randomness by running multiple times
    const positions = [];
    for (let run = 0; run < 20; run++) {
      const result = getQuizWords(data, 0);
      const idx = result.findIndex((item) => item.ko === data[0].ko);
      positions.push(idx);
    }
    // Should have at least 2 different positions
    const uniquePositions = new Set(positions);
    if (uniquePositions.size <= 1) {
      console.log('Target always at the same position for index 0:', positions);
    }
    expect(uniquePositions.size).toBeGreaterThan(1);
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
        if (exclamationCandidates.length !== 1) {
          console.log('Fail (exclamation) at index:', i, 'Result:', result);
        }
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
});
