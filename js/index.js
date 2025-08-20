import { playAudio, genIdFromRR, cloneDeep } from './utils.js';

const MOTHER_TONGUE = 'vi';
const DAY = 24 * 60 * 60 * 1000;
const SRS_INTERVALS = [DAY, 3 * DAY, 10 * DAY, 30 * DAY];
const SRS_RETRY = DAY / 4;
const XPS = [10, 30, 100, 300];
const XPS_INCENTIVE = 2;
const BADGES = ['🥉', '🥈', '🥇', '🏆', '💎'];
const VOCAB_KEY = 'vocab';
const SENTENCES_KEY = 'sentences';

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

let dataSource = { [VOCAB_KEY]: [], [SENTENCES_KEY]: [] };
let currentIndex = {
    [VOCAB_KEY]: parseInt(localStorage.getItem('vocabPage'), 10) || 0,
    [SENTENCES_KEY]: parseInt(localStorage.getItem('sentencesPage'), 10) || 0,
};
let wrong = false;

function render(index) {
    const data = getData();
    const learneds = Object.keys(getLearnedWords());

    const dataCount = data.length;
    const learnedCount = learneds.length;

    const item = data[index];
    const audioFileName = genIdFromRR(item.rr);
    wordLabelEl.textContent = item.ko;
    speakBtn.dataset.speak = audioFileName;
    speakBtn.style.display = practiceMode.checked ? 'none' : '';
    learnProgress.style.display = 'none';
    reviewMessage.style.display = 'none';
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    const audioPath = `../audio/${audioFileName}.mp3`;
    fetch(audioPath, { method: 'HEAD' })
        .then((res) => {
            speakBtn.disabled = !res.ok;
            if (!res.ok) console.warn(`Audio missing for data ${item.ko}`);
        })
        .catch((err) => {
            speakBtn.disabled = true;
            console.error(`Error checking audio file: ${audioPath}`, err);
        });

    if (!practiceMode.checked) {
        phoneticEl.textContent = item.rr || '';
        meaningEl.textContent = item[MOTHER_TONGUE] || '';
        quizEl.innerHTML = '';
    } else {
        phoneticEl.textContent = '----';
        meaningEl.textContent = '';
        learnProgress.style.display = '';
        learnProgress.value = ((learnedCount || 0) / (dataCount || 1)) * 100;
        quizEl.innerHTML = `${getQuizWords()
            .map(
                (v) =>
                    `<button class="btn-secondary" data-word="${v.ko}">${v[MOTHER_TONGUE]}</button>`
            )
            .join('')}`;

        document.querySelectorAll('.quiz-words button').forEach((button) => {
            button.addEventListener('click', (e) => {
                if (e.target.dataset.word === item.ko) {
                    e.target.classList.add('correct');
                    improveLearned(item.ko);
                    nextCard();
                } else {
                    wrong = true;
                    e.target.classList.add('incorrect');
                }
            });
        });

        if (dataCount - learnedCount <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }
    }

    if (!hasPractice()) {
        practiceMode.disabled = true;
        practiceMode.checked = false;

        learnProgress.style.display = '';
        learnProgress.value = 100;
        reviewMessage.style.display = '';
    } else {
        practiceMode.disabled = false;
    }

    const meta = getLearnedWords()[item.ko];
    wordEl.classList.toggle('learned', !!meta);
    cardBadge.textContent = meta ? BADGES.slice(0, meta.level + 1).join('') : '';
    updateStats();
}

function renderAndSave(index) {
    const key = getUrlKey();
    render(index);

    if (key === VOCAB_KEY || !key) {
        localStorage.setItem('vocabPage', index);
    } else if (key === SENTENCES_KEY) {
        localStorage.setItem('sentencesPage', index);
    }
}

function getUrlKey() {
    const key = new URLSearchParams(location.search).get('key');
    return key || '';
}

function activateLinks() {
    const key = getUrlKey();

    vocabLink.classList.remove('active');
    sentencesLink.classList.remove('active');

    if (key === VOCAB_KEY || !key) {
        vocabLink.classList.add('active');
    } else if (key === SENTENCES_KEY) {
        sentencesLink.classList.add('active');
    }
}

function handleLinkClick(key) {
    const url = new URL(window.location);
    url.searchParams.set('key', key);
    window.history.pushState({}, '', url);

    renderAndSave(getIndex());
    activateLinks();
}

function getIndex() {
    const key = getUrlKey();

    if (!key || key === VOCAB_KEY) {
        return currentIndex[VOCAB_KEY];
    }

    if (key === SENTENCES_KEY) {
        return currentIndex[SENTENCES_KEY];
    }

    console.warn('No valid URL params found');
    return -1;
}

function setIndex(index) {
    const key = getUrlKey();
    const data = getData();

    if (!key || key === VOCAB_KEY) {
        const idx = Math.max(0, Math.min(index, data.length - 1));
        currentIndex[VOCAB_KEY] = idx;
    } else if (key === SENTENCES_KEY) {
        const idx = Math.max(0, Math.min(index, data.length - 1));
        currentIndex[SENTENCES_KEY] = idx;
    } else {
        console.warn('No valid URL params found');
    }
}

function getData() {
    const key = getUrlKey();

    if (!key || key === VOCAB_KEY) {
        return dataSource[VOCAB_KEY];
    }

    if (key === SENTENCES_KEY) {
        return dataSource[SENTENCES_KEY];
    }

    console.warn('No valid URL params found');
    return [];
}

const getLearnedWords = () => {
    const key = getUrlKey();

    let learned = {};
    if (!key || key === VOCAB_KEY) {
        learned = JSON.parse(localStorage.getItem('learnedVocab')) || {};
    } else if (key === SENTENCES_KEY) {
        learned = JSON.parse(localStorage.getItem('learnedSentences')) || {};
    }

    return learned || {};
};

function decreaseIndex() {
    setIndex((getIndex() - 1 + getData().length) % getData().length);
}

function increaseIndex() {
    setIndex((getIndex() + 1) % getData().length);
}

function canPractice(word) {
    const { nextReview } = getLearnedWords()[word] || {};

    return !nextReview || new Date(nextReview) <= new Date();
}

function hasPractice() {
    return getData().some((item) => canPractice(item.ko));
}

function prevCard() {
    const data = getData();

    if (practiceMode.checked) {
        if (hasPractice()) {
            for (let i = data.length - 1; i >= 0; i--) {
                if (canPractice(data[i].ko)) {
                    setIndex(i);
                    break;
                }
            }
        }
    } else {
        decreaseIndex();
    }

    renderAndSave(getIndex());
}

function nextCard() {
    const data = getData();

    if (practiceMode.checked) {
        if (hasPractice()) {
            for (let i = 0; i < data.length; i++) {
                if (canPractice(data[i].ko)) {
                    setIndex(i);
                    break;
                }
            }
        }
    } else {
        increaseIndex();
    }

    renderAndSave(getIndex());
}

function improveLearned(ko) {
    const key = getUrlKey();
    const learned = getLearnedWords();
    let meta = cloneDeep(learned[ko]);

    if (!meta) {
        meta = {
            level: -1,
            xp: 0,
        };
    }

    if (wrong) {
        meta.xp += XPS_INCENTIVE;
        meta.nextReview = new Date(Date.now() + SRS_RETRY);
    } else if (meta.level < SRS_INTERVALS.length - 1) {
        meta.level++;
        meta.xp += XPS[meta.level];
        meta.nextReview = new Date(Date.now() + SRS_INTERVALS[meta.level]);
    }

    learned[ko] = meta;
    wrong = false;

    if (key === VOCAB_KEY) {
        localStorage.setItem('learnedVocab', JSON.stringify(learned));
    } else if (key === SENTENCES_KEY) {
        localStorage.setItem('learnedSentences', JSON.stringify(learned));
    }

    renderAndSave(getIndex());
}

function activatePracticeMode() {
    const index = getIndex();
    const data = getData();

    if (practiceMode.checked && !canPractice(data[index].ko)) {
        nextCard();
    } else {
        renderAndSave(index);
    }
}

function updateStats() {
    const learned = Object.values(getLearnedWords());
    const totalXP = learned.reduce((sum, { xp }) => sum + xp, 0);
    const levels = [0, 1, 2, 3, 4];
    const counts = levels.map((l) => learned.filter((item) => item.level >= l).length);

    statsEl.innerHTML =
        `<span>${totalXP} XP</span>` +
        counts.map((count, i) => `<span>${count}${BADGES[i]}</span>`).join('');
}

function getQuizWords() {
    const index = getIndex();
    const data = getData();
    const total = data.length;
    const seeds = [29, 11, 19, 95];

    let distractors = [];

    for (let s of seeds) {
        let idx = (s * 3 + index * 7) % total;
        if (idx === index || distractors.includes(idx)) idx = (95 * 3 + index * 7) % total;
        if (!distractors.includes(idx) && distractors.length < 3) distractors.push(idx);
        if (distractors.length === 3) break;
    }
    const raw = [...distractors.map((i) => data[i]), data[index]];
    return raw.sort(() => 0.5 - Math.random());
}

function handleOnClickSpeak(e) {
    if (e.target.matches('[data-speak]') && !e.target.disabled) {
        const filename = `${e.target.dataset.speak}.mp3`;
        playAudio(filename);
    }
}

async function loadData() {
    const index = getIndex();

    const vocab = await fetch('../data/vocab.json');
    const sentences = await fetch('../data/sentences.json');

    dataSource = {
        vocab: await vocab.json(),
        sentences: await sentences.json(),
    };

    renderAndSave(index);
}

// TODO: REMOVE after August 27, 2025 - Migrate old learned words format
function migrate() {
    // Get old learned words
    const learned = JSON.parse(localStorage.getItem('learned')) || [];
    const learnedVocab = JSON.parse(localStorage.getItem('learnedVocab')) || {};
    const learnedSentences = JSON.parse(localStorage.getItem('learnedSentences')) || {};

    // Migrate to new format for learnedVocab
    if (learned.length) {
        const oldLearnedVocab = Object.fromEntries(
            learned.map((key) => [
                key,
                {
                    level: 0,
                    xp: XPS[0],
                    nextReview: new Date(Date.now()),
                },
            ])
        );

        if (learnedVocab && Object.keys(learnedVocab).length > 0) {
            const mergedLearnedVocab = { ...oldLearnedVocab, ...learnedVocab };
            localStorage.setItem('learnedVocab', JSON.stringify(mergedLearnedVocab));
        } else {
            localStorage.setItem('learnedVocab', JSON.stringify(oldLearnedVocab));
        }

        // Remove old learned words
        localStorage.removeItem('learned');
    }

    // Migrate to new format for learnedSentences
    if (learnedSentences && Array.isArray(learnedSentences)) {
        const oldLearnedSentences = Object.fromEntries(
            learnedSentences.map((key) => [
                key,
                {
                    level: 0,
                    xp: XPS[0],
                    nextReview: new Date(Date.now()),
                },
            ])
        );
        localStorage.setItem('learnedSentences', JSON.stringify(oldLearnedSentences));
    }
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
speakBtn.addEventListener('click', handleOnClickSpeak);
vocabLink.addEventListener('click', () => handleLinkClick('vocab'));
sentencesLink.addEventListener('click', () => handleLinkClick('sentences'));

await loadData();

// TODO: REMOVE after August 27, 2025 - Migrate old learned words format
migrate();

renderAndSave(getIndex());
activateLinks();
