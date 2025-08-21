import { marked } from './vendors/marked.esm.js';

async function fetchHangul() {
    const res = await fetch('../data/hangul.md');
    return res.text();
}

const cardEl = document.getElementById('card');
fetchHangul().then((md) => {
    cardEl.innerHTML = marked.parse(md);
});
