export function speak(text, lang = 'ko-KR') {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech is not supported in this browser.');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}
