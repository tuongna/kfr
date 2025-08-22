import Jasmine from 'jasmine';

const jasmine = new Jasmine();

await jasmine.loadConfigFile(
  new URL('./jasmine.json', import.meta.url).pathname
);

jasmine.execute();
