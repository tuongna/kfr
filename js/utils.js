export function genIdFromRR(rr = '') {
    rr = rr.replace(/\s+/g, '_');

    if (rr.length <= 20) {
        return rr;
    }

    const extra = rr.length - 16;
    const extraStr = extra.toString().padStart(4, '0');

    return rr.slice(0, 8) + extraStr + rr.slice(12, 20);
}

export function playAudio(filename) {
    const audio = new Audio(`../assets/audio/${filename}`);
    audio.play();
}

export function cloneDeep(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    return JSON.parse(JSON.stringify(obj));
}
