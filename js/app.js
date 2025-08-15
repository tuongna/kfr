import vocab from '../data/vocab.js';

const MOTHER_TONGUE = 'vi';

const wordEl = document.getElementById('word');
const phoneticEl = document.getElementById('phonetic');
const meaningEl = document.getElementById('meaning');
const quizEl = document.getElementById('quiz');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statsEl = document.getElementById('stats');
const practiceMode = document.getElementById('practiceMode');

let currentIndex = 0;

function render(index) {
    // TODO: Refactor them
    wordEl.textContent = vocab[index].ko;
    if (!practiceMode.checked || getLearnedWords().includes(vocab[index].ko)) {
        phoneticEl.textContent = vocab[index].rr;
        meaningEl.textContent = vocab[index][MOTHER_TONGUE];
        quizEl.innerHTML = '';
    } else {
        phoneticEl.textContent = '----';
        meaningEl.textContent = '';
        quizEl.innerHTML = `<div class="quiz-words">${getQuizWords()
            .map(
                (vocab) =>
                    `<button data-word="${vocab.ko}">${vocab[MOTHER_TONGUE]}</button>`
            )
            .join('')}</div>`;

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

const getLearnedWords = () => {
    return JSON.parse(localStorage.getItem('learned')) || [];
};

function prevCard() {
    currentIndex = (currentIndex - 1 + vocab.length) % vocab.length;
    render(currentIndex);
}

function nextCard() {
    currentIndex = (currentIndex + 1) % vocab.length;
    render(currentIndex);
}

function markLearned(ko) {
    if (vocab.find((item) => item.ko === ko)) {
        if (!getLearnedWords().some((item) => item === ko)) {
            localStorage.setItem(
                'learned',
                JSON.stringify([...getLearnedWords(), ko])
            );
            render(currentIndex);
        }
    }
}

function activatePracticeMode() {
    render(currentIndex);
}

function updateStats() {
    statsEl.textContent = `Learned: ${getLearnedWords().length} / Current: ${
        currentIndex + 1
    } / Total: ${vocab.length}`;
}

function getQuizWords() {
    const raw = [
        ...vocab
            .filter((_item, idx) => idx !== currentIndex)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3),
        vocab[currentIndex],
    ];

    return raw.sort(() => 0.5 - Math.random());
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
practiceMode.addEventListener('change', activatePracticeMode);

// Initial display
render(currentIndex);
