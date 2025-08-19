import { playAudio, genIdFromRR } from './utils.js';

const MOTHER_TONGUE = 'vi';

let sentences = [];
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

let currentIndex = parseInt(localStorage.getItem('sentencesPage'), 10) || 0;

function render(index) {
    const item = sentences[index];
    const audioFileName = genIdFromRR(item.rr);
    wordLabelEl.textContent = item.ko;
    speakBtn.dataset.speak = audioFileName;
    speakBtn.style.display = practiceMode.checked ? 'none' : '';

    const audioPath = `../audio/${audioFileName}.mp3`;
    fetch(audioPath, { method: 'HEAD' })
        .then((res) => {
            speakBtn.disabled = !res.ok;
            if (!res.ok) console.warn(`Audio missing for sentences ${item.ko}`);
        })
        .catch((err) => {
            speakBtn.disabled = true;
            console.error(`Error checking audio file: ${audioPath}`, err);
        });

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
                    nextCard();
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
    localStorage.setItem('sentencesPage', index);
}

const getLearnedWords = () => JSON.parse(localStorage.getItem('sentencesLearned')) || [];

function prevCard() {
    if (practiceMode.checked) {
        do {
            currentIndex = (currentIndex - 1 + sentences.length) % sentences.length;
        } while (
            getLearnedWords().includes(sentences[currentIndex].ko) &&
            getLearnedWords().length < sentences.length
        );
    } else {
        currentIndex = (currentIndex - 1 + sentences.length) % sentences.length;
    }

    renderAndSave(currentIndex);
}

function nextCard() {
    if (practiceMode.checked) {
        do {
            currentIndex = (currentIndex + 1) % sentences.length;
        } while (
            getLearnedWords().includes(sentences[currentIndex].ko) &&
            getLearnedWords().length < sentences.length
        );
    } else {
        currentIndex = (currentIndex + 1) % sentences.length;
    }

    renderAndSave(currentIndex);
}

function markLearned(ko) {
    if (sentences.find((i) => i.ko === ko)) {
        if (!getLearnedWords().includes(ko)) {
            localStorage.setItem('sentencesLearned', JSON.stringify([...getLearnedWords(), ko]));
            renderAndSave(currentIndex);
        }
    }
}

function activatePracticeMode() {
    if (practiceMode.checked && getLearnedWords().includes(sentences[currentIndex].ko)) {
        nextCard();
    }

    renderAndSave(currentIndex);
}

function updateStats() {
    statsEl.textContent = `Đã học: ${getLearnedWords().length} / Hiện tại: ${
        currentIndex + 1
    } / Tổng: ${sentences.length}`;
}

function getQuizWords() {
    const total = sentences.length;
    const seeds = [29, 11, 19, 95];
    let distractors = [];
    for (let s of seeds) {
        let idx = (s * 3 + currentIndex * 7) % total;
        if (idx === currentIndex || distractors.includes(idx))
            idx = (95 * 3 + currentIndex * 7) % total;
        if (!distractors.includes(idx) && distractors.length < 3) distractors.push(idx);
        if (distractors.length === 3) break;
    }
    const raw = [...distractors.map((i) => sentences[i]), sentences[currentIndex]];
    return raw.sort(() => 0.5 - Math.random());
}

function handleOnClickSpeak(e) {
    if (e.target.matches('[data-speak]') && !e.target.disabled) {
        const filename = `${e.target.dataset.speak}.mp3`;
        playAudio(filename);
    }
}

async function loadSentences() {
    const res = await fetch('../data/sentences.json');
    sentences = await res.json();

    if (currentIndex >= sentences.length) {
        currentIndex = 0;
    }

    renderAndSave(currentIndex);
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);
speakBtn.addEventListener('click', handleOnClickSpeak);

await loadSentences();
renderAndSave(currentIndex);
