import vocab from "./vocab.js";

const wordEl = document.getElementById("word");
const phoneticEl = document.getElementById("phonetic");
const meaningEl = document.getElementById("meaning");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const learnedBtn = document.getElementById("learnedBtn");
const statsEl = document.getElementById("stats");
const inputKr = document.getElementById("inputKr");
const inputEn = document.getElementById("inputEn");

let learned = JSON.parse(localStorage.getItem("learned")) || [];
let currentIndex = 0;

function showCard(index) {
    wordEl.textContent = vocab[index].ko;
    phoneticEl.textContent = vocab[index].rr;
    meaningEl.textContent = vocab[index].en;
    updateStats();
}

function prevCard() {
    currentIndex = (currentIndex - 1 + vocab.length) % vocab.length;
    showCard(currentIndex);
}

function nextCard() {
    currentIndex = (currentIndex + 1) % vocab.length;
    showCard(currentIndex);
}

function markLearned(ko, en) {
    if (!learned.some((item) => item.ko === ko && item.en === en)) {
        learned.push({ ko, en });
        localStorage.setItem("learned", JSON.stringify(learned));
    }
}

function updateStats() {
    statsEl.textContent = `Learned: ${learned.length} / ${vocab.length}`;
}

prevBtn.addEventListener("click", prevCard);
nextBtn.addEventListener("click", nextCard);
learnedBtn.addEventListener("click", () => markLearned());

// Initial display
showCard(currentIndex);
