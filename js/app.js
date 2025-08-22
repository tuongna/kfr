import { initRouter } from './router.js';
import {
  playAudio,
  genIdFromRR,
  cloneDeep,
  shuffleData,
  findMatchingIndex,
  getQuizWords,
} from './utils.js';
import { getLearned, saveLearned, migrateOldLearned } from './store.js';

// ==============================
// CONFIG & CONSTANTS
// ==============================
const MOTHER_TONGUE = 'vi';
const DAY = 24 * 60 * 60 * 1000;
const SRS_INTERVALS = [DAY, 3 * DAY, 10 * DAY, 30 * DAY];
const SRS_RETRY = DAY / 4;
const XPS = [10, 30, 100, 300];
const XPS_INCENTIVE = 2;
const BADGES = ['🥉', '🥈', '🥇', '🏆', '💎'];
const VOCAB_KEY = 'vocab';
const SENTENCES_KEY = 'sentences';
const PAGE_INDEX_KEYS = {
  [VOCAB_KEY]: 'vocabPage',
  [SENTENCES_KEY]: 'sentencesPage',
};
const PRACTICE_MODE_KEY = 'practiceMode';

// ==============================
// DOM ELEMENTS
// ==============================
const wordEl = document.querySelector('#word');
const wordLabelEl = document.querySelector('#word > span');
const speakBtn = document.querySelector('#word > button');
const phoneticEl = document.getElementById('phonetic');
const meaningEl = document.getElementById('meaning');
const quizEl = document.getElementById('quiz');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statsEl = document.getElementById('stats');
const practiceMode = document.getElementById('practice-mode');
const cardBadge = document.getElementById('card-badge');
const learnProgressList = document.getElementById('learn-progress-list');
const learnProgressBronze = document.getElementById('learn-progress-bronze');
const learnProgressSilver = document.getElementById('learn-progress-silver');
const learnProgressGold = document.getElementById('learn-progress-gold');
const learnProgressCup = document.getElementById('learn-progress-cup');
const learnProgressDiamond = document.getElementById('learn-progress-diamond');
const reviewMessage = document.getElementById('review-message');

// ==============================
// STATE
// ==============================
const dataSource = { [VOCAB_KEY]: [], [SENTENCES_KEY]: [] };
const dataSourcePractice = { [VOCAB_KEY]: [], [SENTENCES_KEY]: [] };

const currentIndex = {
  [VOCAB_KEY]: parseInt(localStorage.getItem(PAGE_INDEX_KEYS.vocab), 10) || 0,
  [SENTENCES_KEY]: parseInt(localStorage.getItem(PAGE_INDEX_KEYS.sentences), 10) || 0,
};

let wrong = false;

// ==============================
// LOGIC / DATA FUNCTIONS
// ==============================
function getUrlKey() {
  const hash = window.location.hash;

  if (!hash || hash === '#') {
    return VOCAB_KEY;
  }

  return hash.replace('#', '');
}

function getData() {
  const key = getUrlKey();
  return practiceMode.checked ? dataSourcePractice[key] || [] : dataSource[key] || [];
}

function getIndex() {
  const key = getUrlKey();
  return currentIndex[key];
}

function setIndex(index) {
  const key = getUrlKey();
  const data = getData();
  currentIndex[key] = Math.max(0, Math.min(index, data.length - 1));
  localStorage.setItem(PAGE_INDEX_KEYS[key], currentIndex[key]);
}

function getLearnedWords() {
  return getLearned(getUrlKey());
}

function canPractice(word) {
  const { nextReview } = getLearnedWords()[word] || {};
  return !nextReview || new Date(nextReview) <= new Date();
}

function hasPractice() {
  return getData().some((item) => canPractice(item.ko));
}

function improveLearned(ko) {
  const key = getUrlKey();
  const learned = cloneDeep(getLearnedWords());
  let meta = learned[ko] || { level: -1, xp: 0 };

  if (wrong) {
    meta.xp += XPS_INCENTIVE;
    meta.nextReview = new Date(Date.now() + SRS_RETRY);
  } else if (meta.level < SRS_INTERVALS.length - 1) {
    meta.level++;
    meta.xp += XPS[meta.level];
    meta.nextReview = new Date(Date.now() + SRS_INTERVALS[meta.level]);
  }

  wrong = false;
  learned[ko] = meta;
  saveLearned(key, learned);

  renderAndSave(getIndex());
}

function decreaseIndex() {
  setIndex((getIndex() - 1 + getData().length) % getData().length);
}

function increaseIndex() {
  setIndex((getIndex() + 1) % getData().length);
}

function handleClickSpeak(e) {
  if (!e.target.disabled) {
    playAudio(`${e.target.dataset.speak}.mp3`);
  }
}

// ==============================
// VIEW / RENDER FUNCTIONS
// ==============================
function render(index) {
  const data = getData();
  const learnedWords = getLearnedWords();
  const item = data[index];
  if (!item) return;

  const audioFileName = genIdFromRR(item.rr);

  wordLabelEl.textContent = item.ko;
  phoneticEl.textContent = practiceMode.checked ? '----' : item.rr || '';
  meaningEl.textContent = practiceMode.checked ? '' : item[MOTHER_TONGUE] || '';

  speakBtn.dataset.speak = audioFileName;
  speakBtn.style.display = practiceMode.checked ? 'none' : '';
  speakBtn.disabled = false;
  fetch(`../assets/audio/${audioFileName}.mp3`, { method: 'HEAD' })
    .then((res) => {
      speakBtn.disabled = !res.ok;
    })
    .catch(() => (speakBtn.disabled = true));

  quizEl.innerHTML = '';
  learnProgressList.display = 'none';
  reviewMessage.style.display = 'none';
  prevBtn.disabled = false;
  nextBtn.disabled = false;

  if (practiceMode.checked) {
    renderQuiz(index, data, learnedWords);
  }

  if (!hasPractice()) {
    practiceMode.disabled = true;
    practiceMode.checked = false;
    learnProgressList.display = '';
    reviewMessage.style.display = '';
  } else practiceMode.disabled = false;

  const meta = learnedWords[item.ko];
  wordEl.classList.toggle('learned', !!meta);
  cardBadge.textContent = meta ? BADGES.slice(0, meta.level + 1).join('') : '';

  updateStats();
}

function renderQuiz(index, data, learnedWords) {
  const learnedCountBronze = Object.values(learnedWords).filter((w) => w.level >= 0).length;
  const learnedCountSilver = Object.values(learnedWords).filter((w) => w.level >= 1).length;
  const learnedCountGold = Object.values(learnedWords).filter((w) => w.level >= 2).length;
  const learnedCountCup = Object.values(learnedWords).filter((w) => w.level >= 3).length;
  const learnedCountDiamond = Object.values(learnedWords).filter((w) => w.level >= 4).length;

  learnProgressList.style.display = '';
  learnProgressBronze.value = (learnedCountBronze / (data.length || 1)) * 100;
  learnProgressSilver.value = (learnedCountSilver / (data.length || 1)) * 100;
  learnProgressGold.value = (learnedCountGold / (data.length || 1)) * 100;
  learnProgressCup.value = (learnedCountCup / (data.length || 1)) * 100;
  learnProgressDiamond.value = (learnedCountDiamond / (data.length || 1)) * 100;

  quizEl.innerHTML = getQuizWords(getData(), getIndex())
    .map((v) => `<button class="btn-secondary" data-word="${v.ko}">${v[MOTHER_TONGUE]}</button>`)
    .join('');

  quizEl.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (e.target.dataset.word === data[index].ko) {
        e.target.classList.add('correct');
        improveLearned(data[index].ko);
        nextCard();
      } else {
        wrong = true;
        e.target.classList.add('incorrect');
      }
    });
  });

  if (data.length - Object.keys(getLearnedWords()).length <= 1) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }
}

function renderAndSave(index) {
  render(index);
  const key = getUrlKey();
  localStorage.setItem(PAGE_INDEX_KEYS[key], index);
}

function updateStats() {
  const learned = Object.values(getLearnedWords());
  const totalXP = learned.reduce((sum, { xp }) => sum + xp, 0);
  const counts = [0, 1, 2, 3, 4].map((l) => learned.filter((w) => w.level >= l).length);

  statsEl.innerHTML =
    `<span>${totalXP} XP</span>` + counts.map((c, i) => `<span>${c}${BADGES[i]}</span>`).join('');
}

// ==============================
// NAVIGATION
// ==============================
function prevCard() {
  if (practiceMode.checked && hasPractice()) {
    const data = getData(),
      index = getIndex();
    for (let i = index - 1; i > index - data.length; i--) {
      const idx = (i + data.length) % data.length;
      if (canPractice(data[idx].ko)) {
        setIndex(idx);
        break;
      }
    }
  } else decreaseIndex();
  renderAndSave(getIndex());
}

function nextCard() {
  if (practiceMode.checked && hasPractice()) {
    const data = getData(),
      index = getIndex();
    for (let i = index + 1; i < index + data.length; i++) {
      if (canPractice(data[i % data.length].ko)) {
        setIndex(i % data.length);
        break;
      }
    }
  } else increaseIndex();
  renderAndSave(getIndex());
}

function activatePracticeMode() {
  const key = getUrlKey();
  const isPracticeMode = practiceMode.checked;
  localStorage.setItem(PRACTICE_MODE_KEY, isPracticeMode ? '1' : '0');

  if (isPracticeMode) {
    setIndex(findMatchingIndex(dataSource[key], dataSourcePractice[key], currentIndex[key]));
  } else {
    setIndex(findMatchingIndex(dataSourcePractice[key], dataSource[key], currentIndex[key]));
  }

  if (practiceMode.checked && !canPractice(getData()[getIndex()].ko)) {
    nextCard();
  } else {
    renderAndSave(getIndex());
  }
}

// ==============================
// SPA ROUTER
// ==============================
function activateLinks() {
  const key = getUrlKey();
  document.querySelectorAll('a[data-link]').forEach((a) => {
    const hash = a.getAttribute('href').replace('/', '');
    const linkKey = hash.replace('#', '');
    a.classList.toggle('active', linkKey === key);
  });
}

function onRouteChange() {
  renderAndSave(getIndex());
  activateLinks();
}
// ==============================
// LOAD DATA
// ==============================
async function loadData() {
  // Load vocabulary and sentences data
  const [vocab, sentences] = await Promise.all([
    fetch('../data/vocab.json').then((r) => r.json()),
    fetch('../data/sentences.json').then((r) => r.json()),
  ]);

  // Initialize data sources
  dataSource[VOCAB_KEY] = vocab;
  dataSource[SENTENCES_KEY] = sentences;

  // Shuffle data for practice mode
  dataSourcePractice[VOCAB_KEY] = shuffleData(vocab);
  dataSourcePractice[SENTENCES_KEY] = shuffleData(sentences);
}
// ==============================
// EVENTS
// ==============================
speakBtn.addEventListener('click', handleClickSpeak);
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
window.addEventListener('hashchange', onRouteChange);

// ==============================
// INIT
// ==============================
(async () => {
  await loadData();
  migrateOldLearned();
  renderAndSave(getIndex());
  initRouter(onRouteChange);
  practiceMode.checked = localStorage.getItem(PRACTICE_MODE_KEY) === '1';

  // Set initial hash
  if (!window.location.hash) {
    window.location.hash = '#vocab';
  }
  onRouteChange();
})();
