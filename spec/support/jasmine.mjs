import Jasmine from 'jasmine';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const jasmine = new Jasmine();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await jasmine.loadConfigFile(join(__dirname, 'jasmine.json'));

jasmine.execute();
