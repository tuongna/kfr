import { getQuizWords } from './utils.js';

describe('getQuizWords', () => {
  const sampleData = [
    {
      id: 1,
      ko: '사과',
      vi: 'Táo',
      en: 'apple',
      rr: 'sagwa',
      level: 'A1',
      tags: ['food', 'fruit'],
    },
    {
      id: 2,
      ko: '바나나',
      vi: 'Chuối',
      en: 'banana',
      rr: 'banana',
      level: 'A1',
      tags: ['food', 'fruit'],
    },
    {
      id: 3,
      ko: '오렌지',
      vi: 'Cam',
      en: 'orange',
      rr: 'orenji',
      level: 'A1',
      tags: ['food', 'fruit'],
    },
    {
      id: 4,
      ko: '물',
      vi: 'Nước',
      en: 'water',
      rr: 'mul',
      level: 'A1',
      tags: ['drink'],
    },
    {
      id: 5,
      ko: '빵',
      vi: 'Bánh mì',
      en: 'bread',
      rr: 'ppang',
      level: 'A1',
      tags: ['food', 'grain'],
    },
  ];

  it('returns 4 items including the target', () => {
    const result = getQuizWords(sampleData, 0);
    expect(result.length).toBe(4);
    expect(result.some((item) => item.ko === '사과')).toBe(true);
  });

  it('includes only one target item', () => {
    const result = getQuizWords(sampleData, 1);
    expect(result.filter((item) => item.ko === '바나나').length).toBe(1);
  });

  it('selects candidates sharing tags with the target', () => {
    const result = getQuizWords(sampleData, 2);
    const candidateKOs = result.map((item) => item.ko);
    expect(candidateKOs).toContain('사과');
    expect(candidateKOs).toContain('바나나');
    expect(candidateKOs).toContain('오렌지');
  });

  it('fills with random items if not enough candidates', () => {
    const result = getQuizWords(sampleData, 3);
    expect(result.length).toBe(4);
    expect(result.some((item) => item.ko === '물')).toBe(true);
    expect(result.filter((item) => item.ko !== '물').length).toBe(3);
  });

  it('does not include duplicate items', () => {
    const result = getQuizWords(sampleData, 4);
    expect(new Set(result.map((item) => item.id)).size).toBe(4);
  });

  it('shuffles the result so target is not always at index 0', () => {
    const positions = Array.from({ length: 5 }, () =>
      getQuizWords(sampleData, 0)
        .map((item) => item.ko)
        .indexOf('사과')
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it('works with minimum data (4 items)', () => {
    const result = getQuizWords(sampleData.slice(0, 4), 0);
    expect(result.length).toBe(4);
    expect(result.some((item) => item.ko === '사과')).toBe(true);
  });

  it('works if all items have unique tags', () => {
    const uniqueTagData = [
      { id: 1, ko: 'A', tags: ['x'] },
      { id: 2, ko: 'B', tags: ['y'] },
      { id: 3, ko: 'C', tags: ['z'] },
      { id: 4, ko: 'D', tags: ['w'] },
    ];
    const result = getQuizWords(uniqueTagData, 0);
    expect(result.length).toBe(4);
    expect(result.some((item) => item.ko === 'A')).toBe(true);
  });
});
