import grammar from '../data/grammar.js';

const cardHeader = document.querySelector('[data-card-header]');
const cardDescription = document.querySelector('[data-card-description]');
const cardDetails = document.querySelector('[data-card-details]');
const cardRules = document.querySelector('[data-card-rules]');
const cardIrregulars = document.querySelector('[data-card-irregulars]');
const cardExamples = document.querySelector('[data-card-examples]');
const cardTags = document.querySelector('[data-card-tags]');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const statsEl = document.getElementById('stats');

let currentIndex = parseInt(localStorage.getItem('currentIndex'), 10) || 0;

function render(index) {
    const { title, summary, points, rules, irregulars, examples, tags } =
        grammar[index];

    if (title) {
        cardHeader.textContent = title;
    }

    if (summary) {
        cardDescription.textContent = summary;
    }

    if (!!points?.length) {
        cardDetails.closest('div').style.display = '';
        cardDetails.innerHTML = points
            .map((detail) => `<li>${detail}</li>`)
            .join('');
    } else {
        cardDetails.closest('div').style.display = 'none';
    }

    if (!!rules?.length) {
        cardRules.closest('div').style.display = '';
        cardRules.innerHTML = rules
            .map(
                (rule) =>
                    `<li>${rule.form}: <i>${rule.use || rule.note}</i></li>`
            )
            .join('');
    } else {
        cardRules.closest('div').style.display = 'none';
    }

    if (!!irregulars?.length) {
        cardIrregulars.closest('div').style.display = '';
        cardIrregulars.innerHTML = irregulars
            .map(
                (irregular) =>
                    `<li>${irregular.type} <i>${irregular.ex}</i></li>`
            )
            .join('');
    } else {
        cardIrregulars.closest('div').style.display = 'none';
    }

    if (!!examples?.length) {
        cardExamples.closest('div').style.display = '';
        cardExamples.innerHTML = examples
            .map((example) => `<li>${example.ko} <i>${example.vi}</i></li>`)
            .join('');
    } else {
        cardExamples.closest('div').style.display = 'none';
    }

    if (tags?.length) {
        cardTags.textContent = `Tags: ${tags.join(', ')}`;
    }

    statsEl.textContent = `Current: ${index + 1}/${grammar.length}`;
}

function renderAndSave(index) {
    render(index);
    localStorage.setItem('currentIndex', index);
}

function prevCard() {
    currentIndex = (currentIndex - 1 + grammar.length) % grammar.length;
    renderAndSave(currentIndex);
}

function nextCard() {
    currentIndex = (currentIndex + 1) % grammar.length;
    renderAndSave(currentIndex);
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);

renderAndSave(currentIndex);
