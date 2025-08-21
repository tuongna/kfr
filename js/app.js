import { playAudio, genIdFromRR, cloneDeep } from './utils.js';
import { getLearned, saveLearned, migrateOldLearned, STORAGE_KEYS } from './store.js';

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
const vocabLink = document.getElementById('vocab-link');
const sentencesLink = document.getElementById('sentences-link');
const learnProgress = document.getElementById('learn-progress');
const reviewMessage = document.getElementById('review-message');

// ==============================
// STATE
// ==============================
let dataSource = { [VOCAB_KEY]: [], [SENTENCES_KEY]: [] };
let currentIndex = {
    [VOCAB_KEY]: parseInt(localStorage.getItem(PAGE_INDEX_KEYS.vocab), 10) || 0,
    [SENTENCES_KEY]: parseInt(localStorage.getItem(PAGE_INDEX_KEYS.sentences), 10) || 0,
};
let wrong = false;

// ==============================
// LOGIC / DATA FUNCTIONS
// ==============================

function getUrlKey() {
    const key = new URLSearchParams(location.search).get('key');
    return key || VOCAB_KEY;
}

function getData() {
    const key = getUrlKey();
    return dataSource[key] || [];
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

function getQuizWords() {
    const index = getIndex();
    const data = getData();
    const seeds = [29, 11, 19, 95];
    let distractors = [];

    for (let s of seeds) {
        let idx = (s * 3 + index * 7) % data.length;
        if (idx === index || distractors.includes(idx)) idx = (95 * 3 + index * 7) % data.length;
        if (!distractors.includes(idx) && distractors.length < 3) distractors.push(idx);
        if (distractors.length === 3) break;
    }

    return [...distractors.map((i) => data[i]), data[index]].sort(() => 0.5 - Math.random());
}

// ==============================
// VIEW / RENDER FUNCTIONS
// ==============================

function render(index) {
    const data = getData();
    const learnedWords = getLearnedWords();
    const learnedCount = Object.keys(learnedWords).length;
    const item = data[index];
    if (!item) return;

    const audioFileName = genIdFromRR(item.rr);

    // Word / phonetic / meaning
    wordLabelEl.textContent = item.ko;
    phoneticEl.textContent = practiceMode.checked ? '----' : item.rr || '';
    meaningEl.textContent = practiceMode.checked ? '' : item[MOTHER_TONGUE] || '';

    // Audio
    speakBtn.dataset.speak = audioFileName;
    speakBtn.style.display = practiceMode.checked ? 'none' : '';
    speakBtn.disabled = false;
    fetch(`../assets/audio/${audioFileName}.mp3`, { method: 'HEAD' })
        .then((res) => {
            speakBtn.disabled = !res.ok;
        })
        .catch(() => (speakBtn.disabled = true));

    // Quiz mode
    quizEl.innerHTML = '';
    learnProgress.style.display = 'none';
    reviewMessage.style.display = 'none';
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    if (practiceMode.checked) {
        renderQuiz(index, data, learnedCount);
    }

    // Practice mode enable/disable
    if (!hasPractice()) {
        practiceMode.disabled = true;
        practiceMode.checked = false;
        learnProgress.style.display = '';
        learnProgress.value = 100;
        reviewMessage.style.display = '';
    } else practiceMode.disabled = false;

    // Badge
    const meta = learnedWords[item.ko];
    wordEl.classList.toggle('learned', !!meta);
    cardBadge.textContent = meta ? BADGES.slice(0, meta.level + 1).join('') : '';

    updateStats();
}

function renderQuiz(index, data, learnedCount) {
    learnProgress.style.display = '';
    learnProgress.value = (learnedCount / (data.length || 1)) * 100;

    quizEl.innerHTML = getQuizWords()
        .map(
            (v) => `<button class="btn-secondary" data-word="${v.ko}">${v[MOTHER_TONGUE]}</button>`
        )
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
        `<span>${totalXP} XP</span>` +
        counts.map((c, i) => `<span>${c}${BADGES[i]}</span>`).join('');
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
    const data = getData();
    if (practiceMode.checked && !canPractice(data[getIndex()].ko)) nextCard();
    else renderAndSave(getIndex());
}

// ==============================
// EVENTS
// ==============================
speakBtn.addEventListener('click', (e) => {
    if (!e.target.disabled) playAudio(`${e.target.dataset.speak}.mp3`);
});
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);

vocabLink.addEventListener('click', () => handleLinkClick(VOCAB_KEY));
sentencesLink.addEventListener('click', () => handleLinkClick(SENTENCES_KEY));

function handleLinkClick(key) {
    const url = new URL(window.location);
    url.searchParams.set('key', key);
    window.history.pushState({}, '', url);
    renderAndSave(getIndex());
    activateLinks();
}

function activateLinks() {
    const key = getUrlKey();
    vocabLink.classList.toggle('active', key === VOCAB_KEY);
    sentencesLink.classList.toggle('active', key === SENTENCES_KEY);
}

// ==============================
// LOAD DATA
// ==============================
async function loadData() {
    const [vocab, sentences] = await Promise.all([
        fetch('../data/vocab.json').then((r) => r.json()),
        fetch('../data/sentences.json').then((r) => r.json()),
    ]);
    dataSource = { [VOCAB_KEY]: vocab, [SENTENCES_KEY]: sentences };
}

// ==============================
// INIT
// ==============================
await loadData();
migrateOldLearned();
renderAndSave(getIndex());
activateLinks();
