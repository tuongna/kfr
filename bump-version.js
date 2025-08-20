import { readFileSync, writeFileSync } from 'fs';
const path = './version.js';

let content = readFileSync(path, 'utf-8');

const regex = /(APP_VERSION\s*=\s*['"]\d+\.\d+\.\d+\+dev\.)(\d+)(['"])/;

const match = content.match(regex);

if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    const suffix = match[3];

    const newContent = content.replace(regex, `${prefix}${num}${suffix}`);
    writeFileSync(path, newContent, 'utf-8');

    console.log(`APP_VERSION bumped to: ${prefix}${num}`);
} else {
    console.warn('APP_VERSION not found in version.js');
}
