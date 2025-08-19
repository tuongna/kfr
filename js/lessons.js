import { marked } from '../vendors/js/marked.esm.js';

async function fetchHangul() {
    const res = await fetch('../resources/hangul.md');
    return res.text();
}

const cardEl = document.getElementById('card');
fetchHangul().then((md) => {
    cardEl.innerHTML = marked.parse(md);
});
