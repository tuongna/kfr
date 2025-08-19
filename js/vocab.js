import { playAudio, genIdFromRR } from './utils.js';

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
const practiceMode = document.getElementById('practice-mode');

let currentIndex = parseInt(localStorage.getItem('vocabPage'), 10) || 0;

function render(index) {
    const item = vocab[index];
    const audioFileName = genIdFromRR(item.rr);
    wordLabelEl.textContent = item.ko;
    speakBtn.dataset.speak = audioFileName; // use rr for audio filename
    speakBtn.style.display = practiceMode.checked ? 'none' : '';

    // --- Check if audio exists ---
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

    // --- Render phonetic, meaning, quiz ---
    if (!practiceMode.checked || getLearnedWords().includes(item.ko)) {
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
                    markLearned(item.ko);
                } else {
                    e.target.classList.add('incorrect');
                }
            });
        });
    }

    if (getLearnedWords().includes(item.ko)) {
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

const getLearnedWords = () => JSON.parse(localStorage.getItem('learned')) || [];

function prevCard() {
    currentIndex = (currentIndex - 1 + vocab.length) % vocab.length;
    renderAndSave(currentIndex);
}

function nextCard() {
    currentIndex = (currentIndex + 1) % vocab.length;
    renderAndSave(currentIndex);
}

function markLearned(ko) {
    if (vocab.find((i) => i.ko === ko)) {
        if (!getLearnedWords().includes(ko)) {
            localStorage.setItem('learned', JSON.stringify([...getLearnedWords(), ko]));
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
        if (idx === currentIndex || distractors.includes(idx))
            idx = (95 * 3 + currentIndex * 7) % total;
        if (!distractors.includes(idx) && distractors.length < 3) distractors.push(idx);
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

// --- Event listeners ---
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
speakBtn.addEventListener('click', handleOnClickSpeak);

await loadVocab();
renderAndSave(currentIndex);
