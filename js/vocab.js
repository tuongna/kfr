import { playAudio } from './utils/speech.js';

const MOTHER_TONGUE = 'vi';

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
const practiceMode = document.getElementById('practiceMode');

let currentIndex = parseInt(localStorage.getItem('vocabPage'), 10) || 0;

function render(index) {
    wordLabelEl.textContent = vocab[index].ko;
    speakBtn.dataset.speak = vocab[index].rr;
    speakBtn.style.display = practiceMode.checked ? 'none' : '';

    if (!practiceMode.checked || getLearnedWords().includes(vocab[index].ko)) {
        phoneticEl.textContent = vocab[index].rr;
        meaningEl.textContent = vocab[index][MOTHER_TONGUE];
        quizEl.innerHTML = '';
    } else {
        phoneticEl.textContent = '----';
        meaningEl.textContent = '';
        quizEl.innerHTML = `${getQuizWords()
            .map(
                (vocab) =>
                    `<button class="btn-primary" data-word="${vocab.ko}">${vocab[MOTHER_TONGUE]}</button>`
            )
            .join('')}`;

        document.querySelectorAll('.quiz-words button').forEach((button) => {
            button.addEventListener('click', (e) => {
                if (e.target.dataset.word === vocab[currentIndex].ko) {
                    e.target.classList.add('correct');
                    markLearned(vocab[currentIndex].ko);
                } else {
                    e.target.classList.add('incorrect');
                }
            });
        });
    }

    if (getLearnedWords().includes(vocab[index].ko)) {
        wordEl.classList.add('learned');
    } else {
        wordEl.classList.remove('learned');
    }

    updateStats();
}

function renderAndSave(index) {
    render(index);
    localStorage.setItem('vocabPage', index);
}

const getLearnedWords = () => {
    return JSON.parse(localStorage.getItem('learned')) || [];
};

function prevCard() {
    currentIndex = (currentIndex - 1 + vocab.length) % vocab.length;
    renderAndSave(currentIndex);
}

function nextCard() {
    currentIndex = (currentIndex + 1) % vocab.length;
    renderAndSave(currentIndex);
}

function markLearned(ko) {
    if (vocab.find((item) => item.ko === ko)) {
        if (!getLearnedWords().some((item) => item === ko)) {
            localStorage.setItem(
                'learned',
                JSON.stringify([...getLearnedWords(), ko])
            );
            renderAndSave(currentIndex);
        }
    }
}

function activatePracticeMode() {
    renderAndSave(currentIndex);
}

function updateStats() {
    statsEl.textContent = `Learned: ${getLearnedWords().length} / Current: ${
        currentIndex + 1
    } / Total: ${vocab.length}`;
}

function getQuizWords() {
    const total = vocab.length;

    const seeds = [29, 11, 19, 95];

    let distractors = [];
    for (let s of seeds) {
        let idx = (s * 3 + currentIndex * 7) % total;

        if (idx === currentIndex || distractors.includes(idx)) {
            idx = (95 * 3 + currentIndex * 7) % total;
        }

        if (!distractors.includes(idx) && distractors.length < 3) {
            distractors.push(idx);
        }

        if (distractors.length === 3) break;
    }

    const raw = [...distractors.map((i) => vocab[i]), vocab[currentIndex]];

    console.log('raw', raw);

    return raw.sort(() => 0.5 - Math.random());
}

function handleOnClickSpeak(e) {
    if (e.target.matches('[data-speak]')) {
        const filename =
            e.target.dataset.speak.replace(/\s+/g, '_').toLowerCase() + '.mp3';
        playAudio(filename);
    }
}

async function loadVocab() {
    const res = await fetch('../data/vocab.json');
    vocab = await res.json();
    renderAndSave(currentIndex);
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
speakBtn.addEventListener('click', handleOnClickSpeak);

await loadVocab();
renderAndSave(currentIndex);
