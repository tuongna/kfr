export function playAudio(filename) {
    const audio = new Audio(`../audio/${filename}`);
    audio.play();
}
