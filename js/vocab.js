import { playAudio, genIdFromRR, cloneDeep } from './utils.js';

const MOTHER_TONGUE = 'vi';
const DAY = 24 * 60 * 60 * 1000;
const SRS_INTERVALS = [DAY, 3 * DAY, 10 * DAY, 30 * DAY];
const XPS = [10, 30, 100, 300];
const BADGES = ['🥉', '🥈', '🥇', '🏆', '💎'];

let vocab = [];
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

let currentIndex = parseInt(localStorage.getItem('vocabPage'), 10) || 0;

function render(index) {
    const item = vocab[index];
    const audioFileName = genIdFromRR(item.rr);
    wordLabelEl.textContent = item.ko;
    speakBtn.dataset.speak = audioFileName;
    speakBtn.style.display = practiceMode.checked ? 'none' : '';

    const audioPath = `../audio/${audioFileName}.mp3`;
    fetch(audioPath, { method: 'HEAD' })
        .then((res) => {
            speakBtn.disabled = !res.ok;
            if (!res.ok) console.warn(`Audio missing for vocab ${item.ko}`);
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
                    e.target.classList.add('incorrect');
                }
            });
        });
    }

    const meta = getLearnedWords()[item.ko];
    wordEl.classList.toggle('learned', !!meta);
    cardBadge.textContent = meta ? BADGES[meta.level] ?? '' : '';
    updateStats();
}

function renderAndSave(index) {
    render(index);
    localStorage.setItem('vocabPage', index);
}

const getLearnedWords = () => {
    const learned = JSON.parse(localStorage.getItem('learned'));

    // Migrate old learned words format
    if (Array.isArray(learned)) {
        return Object.fromEntries(
            arr.map((key) => [
                key,
                {
                    level: 0,
                    xp: XPS[0],
                    nextReview: new Date(Date.now() + SRS_INTERVALS[0]),
                },
            ])
        );
    }

    return learned || {};
};

function decreaseIndex() {
    currentIndex = (currentIndex - 1 + vocab.length) % vocab.length;
}

function increaseIndex() {
    currentIndex = (currentIndex + 1) % vocab.length;
}

function canPractice(word) {
    const { nextReview } = getLearnedWords()[word] || {};

    return !nextReview || new Date(nextReview) <= new Date();
}

function hasPractice() {
    return vocab.some((item) => canPractice(item.ko));
}

function prevCard() {
    if (practiceMode.checked) {
        if (hasPractice()) {
            do {
                decreaseIndex();
            } while (
                !canPractice(vocab[currentIndex].ko) &&
                Object.keys(getLearnedWords()).length
            );
        }
    } else {
        decreaseIndex();
    }

    renderAndSave(currentIndex);
}

function nextCard() {
    if (practiceMode.checked) {
        do {
            increaseIndex();
        } while (
            !canPractice(vocab[currentIndex].ko) &&
            Object.keys(getLearnedWords()).length
        );
    } else {
        increaseIndex();
    }

    renderAndSave(currentIndex);
}

function improveLearned(ko) {
    const learned = getLearnedWords();
    let meta = cloneDeep(learned[ko]);

    if (!meta) {
        meta = {
            level: 0,
            xp: XPS[0],
            nextReview: new Date(Date.now() + SRS_INTERVALS[0]),
        };
    } else if (meta.level < SRS_INTERVALS.length - 1) {
        meta.level++;
        meta.xp += XPS[meta.level];
        meta.nextReview = new Date(Date.now() + SRS_INTERVALS[meta.level]);
    }

    learned[ko] = meta;
    localStorage.setItem('learned', JSON.stringify(learned));
    renderAndSave(currentIndex);
}

function activatePracticeMode() {
    if (practiceMode.checked && !canPractice(vocab[currentIndex].ko)) {
        nextCard();
    }

    renderAndSave(currentIndex);
}

function updateStats() {
    const learned = Object.values(getLearnedWords());
    const totalXP = learned.reduce((sum, { xp }) => sum + xp, 0);
    const levels = [0, 1, 2, 3, 4];
    const counts = levels.map(
        (l) => learned.filter((item) => item.level === l).length
    );

    statsEl.innerHTML =
        `<span>${totalXP} XP</span>` +
        counts.map((count, i) => `<span>${count}${BADGES[i]}</span>`).join('');
}

function getQuizWords() {
    const total = vocab.length;
    const seeds = [29, 11, 19, 95];
    let distractors = [];
    for (let s of seeds) {
        let idx = (s * 3 + currentIndex * 7) % total;
        if (idx === currentIndex || distractors.includes(idx))
            idx = (95 * 3 + currentIndex * 7) % total;
        if (!distractors.includes(idx) && distractors.length < 3)
            distractors.push(idx);
        if (distractors.length === 3) break;
    }
    const raw = [...distractors.map((i) => vocab[i]), vocab[currentIndex]];
    return raw.sort(() => 0.5 - Math.random());
}

function handleOnClickSpeak(e) {
    if (e.target.matches('[data-speak]') && !e.target.disabled) {
        const filename = `${e.target.dataset.speak}.mp3`;
        playAudio(filename);
    }
}

async function loadVocab() {
    const res = await fetch('../data/vocab.json');
    vocab = await res.json();

    if (currentIndex >= vocab.length) {
        currentIndex = 0;
    }

    renderAndSave(currentIndex);
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
speakBtn.addEventListener('click', handleOnClickSpeak);

await loadVocab();
renderAndSave(currentIndex);
