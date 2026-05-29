/**
 * Loader for javascript.info tutorial content.
 *
 * Articles are fetched lazily from the public GitHub mirror as the reader
 * navigates between sections, so the full tutorial (~300 articles) never
 * needs to be downloaded up front.
 *
 * License: CC BY-NC 4.0 — Ilya Kantor (iliakan@javascript.info)
 * Attribution required; non-commercial use only.
 */

import type { PdfBlock } from './pdfReader';

export interface JsInfoArticle {
  title: string;
  path: string; // e.g. "1-js/02-first-steps/04-variables"
}

export interface JsInfoGroup {
  title: string;
  articles: JsInfoArticle[];
}

const BASE =
  'https://raw.githubusercontent.com/javascript-tutorial/en.javascript.info/master';

// ── Table of contents ─────────────────────────────────────────────────────────
// Curated selection: Part 1 (full), Part 2 (DOM & Events), Part 5 (Network),
// Part 9 (RegExp). Paths match the GitHub repo folder names exactly.

export const JS_INFO_TOC: JsInfoGroup[] = [
  // ── Part 1: The JavaScript Language ─────────────────────────────────────────
  {
    title: 'Getting Started',
    articles: [
      { title: 'An Introduction to JavaScript',  path: '1-js/01-getting-started/01-intro' },
      { title: 'Manuals and specifications',      path: '1-js/01-getting-started/02-manuals-specifications' },
      { title: 'Developer console',               path: '1-js/01-getting-started/04-devtools' },
    ],
  },
  {
    title: 'JavaScript Fundamentals',
    articles: [
      { title: 'Hello, world!',                         path: '1-js/02-first-steps/01-hello-world' },
      { title: 'Code structure',                        path: '1-js/02-first-steps/02-structure' },
      { title: 'The modern mode, "use strict"',         path: '1-js/02-first-steps/03-strict-mode' },
      { title: 'Variables',                             path: '1-js/02-first-steps/04-variables' },
      { title: 'Data types',                            path: '1-js/02-first-steps/05-types' },
      { title: 'Interaction: alert, prompt, confirm',   path: '1-js/02-first-steps/06-alert-prompt-confirm' },
      { title: 'Type Conversions',                      path: '1-js/02-first-steps/07-type-conversions' },
      { title: 'Basic operators, maths',                path: '1-js/02-first-steps/08-operators' },
      { title: 'Comparisons',                           path: '1-js/02-first-steps/09-comparison' },
      { title: 'Conditional branching: if, "?"',        path: '1-js/02-first-steps/10-ifelse' },
      { title: 'Logical operators',                     path: '1-js/02-first-steps/11-logical-operators' },
      { title: 'Nullish coalescing operator "??"',      path: '1-js/02-first-steps/12-nullish-coalescing-operator' },
      { title: 'Loops: while and for',                  path: '1-js/02-first-steps/13-while-for' },
      { title: 'The "switch" statement',                path: '1-js/02-first-steps/14-switch' },
      { title: 'Functions',                             path: '1-js/02-first-steps/15-function-basics' },
      { title: 'Function expressions',                  path: '1-js/02-first-steps/16-function-expressions' },
      { title: 'Arrow functions, the basics',           path: '1-js/02-first-steps/17-arrow-functions-basics' },
      { title: 'JavaScript specials',                   path: '1-js/02-first-steps/18-javascript-specials' },
    ],
  },
  {
    title: 'Code Quality',
    articles: [
      { title: 'Debugging in the browser',      path: '1-js/03-code-quality/01-debugging-chrome' },
      { title: 'Coding style',                  path: '1-js/03-code-quality/02-coding-style' },
      { title: 'Comments',                      path: '1-js/03-code-quality/03-comments' },
      { title: 'Automated testing with Mocha',  path: '1-js/03-code-quality/05-testing-mocha' },
      { title: 'Polyfills and transpilers',     path: '1-js/03-code-quality/06-polyfills' },
    ],
  },
  {
    title: 'Objects: the Basics',
    articles: [
      { title: 'Objects',                          path: '1-js/04-object-basics/01-object' },
      { title: 'Object references and copying',    path: '1-js/04-object-basics/02-object-copy' },
      { title: 'Garbage collection',               path: '1-js/04-object-basics/03-garbage-collection' },
      { title: 'Object methods, "this"',           path: '1-js/04-object-basics/04-object-methods' },
      { title: 'Constructor, operator "new"',      path: '1-js/04-object-basics/05-constructor-new' },
      { title: 'Optional chaining "?."',           path: '1-js/04-object-basics/06-optional-chaining' },
      { title: 'Symbol type',                      path: '1-js/04-object-basics/07-symbol' },
      { title: 'Object to primitive conversion',   path: '1-js/04-object-basics/08-object-toprimitive' },
    ],
  },
  {
    title: 'Data Types',
    articles: [
      { title: 'Methods of primitives',        path: '1-js/05-data-types/01-primitives-methods' },
      { title: 'Numbers',                      path: '1-js/05-data-types/02-number' },
      { title: 'Strings',                      path: '1-js/05-data-types/03-string' },
      { title: 'Arrays',                       path: '1-js/05-data-types/04-array' },
      { title: 'Array methods',                path: '1-js/05-data-types/05-array-methods' },
      { title: 'Iterables',                    path: '1-js/05-data-types/06-iterable' },
      { title: 'Map and Set',                  path: '1-js/05-data-types/07-map-set' },
      { title: 'WeakMap and WeakSet',          path: '1-js/05-data-types/08-weakmap-weakset' },
      { title: 'Object.keys, values, entries', path: '1-js/05-data-types/09-keys-values-entries' },
      { title: 'Destructuring assignment',     path: '1-js/05-data-types/10-destructuring-assignment' },
      { title: 'Date and time',                path: '1-js/05-data-types/11-date' },
      { title: 'JSON methods, toJSON',         path: '1-js/05-data-types/12-json' },
    ],
  },
  {
    title: 'Advanced Functions',
    articles: [
      { title: 'Recursion and stack',                       path: '1-js/06-advanced-functions/01-recursion' },
      { title: 'Rest parameters and spread syntax',         path: '1-js/06-advanced-functions/02-rest-parameters-spread' },
      { title: 'Variable scope, closure',                   path: '1-js/06-advanced-functions/03-closure' },
      { title: 'The old "var"',                             path: '1-js/06-advanced-functions/04-var' },
      { title: 'Global object',                             path: '1-js/06-advanced-functions/05-global-object' },
      { title: 'Function object, NFE',                      path: '1-js/06-advanced-functions/06-function-object' },
      { title: 'The "new Function" syntax',                 path: '1-js/06-advanced-functions/07-new-function' },
      { title: 'Scheduling: setTimeout and setInterval',    path: '1-js/06-advanced-functions/08-settimeout-setinterval' },
      { title: 'Decorators and forwarding, call/apply',     path: '1-js/06-advanced-functions/09-call-apply-decorators' },
      { title: 'Function binding',                          path: '1-js/06-advanced-functions/10-bind' },
      { title: 'Arrow functions revisited',                 path: '1-js/06-advanced-functions/12-arrow-functions' },
    ],
  },
  {
    title: 'Object Properties Configuration',
    articles: [
      { title: 'Property flags and descriptors',  path: '1-js/07-object-properties/01-property-descriptors' },
      { title: 'Property getters and setters',    path: '1-js/07-object-properties/02-property-accessors' },
    ],
  },
  {
    title: 'Prototypes, Inheritance',
    articles: [
      { title: 'Prototypal inheritance',                          path: '1-js/08-prototypes/01-prototype-inheritance' },
      { title: 'F.prototype',                                     path: '1-js/08-prototypes/02-function-prototype' },
      { title: 'Native prototypes',                               path: '1-js/08-prototypes/03-native-prototypes' },
      { title: 'Prototype methods, objects without __proto__',    path: '1-js/08-prototypes/04-prototype-methods' },
    ],
  },
  {
    title: 'Classes',
    articles: [
      { title: 'Class basic syntax',                             path: '1-js/09-classes/01-class' },
      { title: 'Class inheritance',                              path: '1-js/09-classes/02-class-inheritance' },
      { title: 'Static properties and methods',                  path: '1-js/09-classes/03-static-properties-methods' },
      { title: 'Private and protected properties and methods',   path: '1-js/09-classes/04-private-protected-properties-methods' },
      { title: 'Extending built-in classes',                     path: '1-js/09-classes/05-extend-natives' },
      { title: 'Class checking: "instanceof"',                   path: '1-js/09-classes/06-instanceof' },
      { title: 'Mixins',                                         path: '1-js/09-classes/07-mixins' },
    ],
  },
  {
    title: 'Error Handling',
    articles: [
      { title: 'Error handling, "try...catch"',  path: '1-js/10-error-handling/1-try-catch' },
      { title: 'Custom errors, extending Error', path: '1-js/10-error-handling/3-custom-errors' },
    ],
  },
  {
    title: 'Promises, async/await',
    articles: [
      { title: 'Introduction: callbacks',         path: '1-js/11-async/01-callbacks' },
      { title: 'Promise',                         path: '1-js/11-async/02-promise-basics' },
      { title: 'Promises chaining',               path: '1-js/11-async/03-promise-chaining' },
      { title: 'Error handling with promises',    path: '1-js/11-async/04-promise-error-handling' },
      { title: 'Promise API',                     path: '1-js/11-async/05-promise-api' },
      { title: 'Promisify',                       path: '1-js/11-async/06-promisify' },
      { title: 'Microtasks',                      path: '1-js/11-async/07-microtask-queue' },
      { title: 'Async/await',                     path: '1-js/11-async/08-async-await' },
    ],
  },
  {
    title: 'Generators, Iterators',
    articles: [
      { title: 'Generators',                          path: '1-js/12-generators-iterators/1-generators' },
      { title: 'Async iteration and generators',      path: '1-js/12-generators-iterators/2-async-iterators-generators' },
    ],
  },
  {
    title: 'Modules',
    articles: [
      { title: 'Modules, introduction',   path: '1-js/13-modules/01-modules-intro' },
      { title: 'Export and Import',       path: '1-js/13-modules/02-import-export' },
      { title: 'Dynamic imports',         path: '1-js/13-modules/03-modules-dynamic-imports' },
    ],
  },

  // ── Part 2: Browser ──────────────────────────────────────────────────────────
  {
    title: 'Document (DOM)',
    articles: [
      { title: 'Browser environment, specs',               path: '2-ui/1-document/01-browser-environment' },
      { title: 'DOM tree',                                 path: '2-ui/1-document/02-dom-nodes' },
      { title: 'Walking the DOM',                          path: '2-ui/1-document/03-dom-navigation' },
      { title: 'Searching: getElement*, querySelector*',   path: '2-ui/1-document/04-searching-elements-dom' },
      { title: 'Node properties: type, tag and contents',  path: '2-ui/1-document/05-basic-dom-node-properties' },
      { title: 'Attributes and properties',                path: '2-ui/1-document/06-dom-attributes-and-properties' },
      { title: 'Modifying the document',                   path: '2-ui/1-document/07-modifying-document' },
      { title: 'Styles and classes',                       path: '2-ui/1-document/08-styles-and-classes' },
      { title: 'Element size and scrolling',               path: '2-ui/1-document/09-element-size-and-scrolling' },
      { title: 'Window sizes and scrolling',               path: '2-ui/1-document/10-window-sizes-and-scroll' },
      { title: 'Coordinates',                              path: '2-ui/1-document/11-coordinates' },
    ],
  },
  {
    title: 'Browser Events',
    articles: [
      { title: 'Introduction to browser events',   path: '2-ui/2-events/01-introduction-browser-events' },
      { title: 'Bubbling and capturing',           path: '2-ui/2-events/02-bubbling-and-capturing' },
      { title: 'Event delegation',                 path: '2-ui/2-events/03-event-delegation' },
      { title: 'Browser default actions',          path: '2-ui/2-events/04-default-browser-action' },
      { title: 'Dispatching custom events',        path: '2-ui/2-events/05-dispatch-events' },
    ],
  },
  {
    title: 'UI Events',
    articles: [
      { title: 'Mouse events',                     path: '2-ui/3-event-details/01-mouse-events-basics' },
      { title: 'Keyboard: keydown and keyup',      path: '2-ui/3-event-details/05-keyboard-events' },
      { title: 'Scroll',                           path: '2-ui/3-event-details/07-onscroll' },
    ],
  },
  {
    title: 'Forms and Controls',
    articles: [
      { title: 'Form properties and methods',              path: '2-ui/4-forms-controls/01-form-elements' },
      { title: 'Focusing: focus/blur',                     path: '2-ui/4-forms-controls/02-focus-blur' },
      { title: 'Events: change, input, cut, copy, paste',  path: '2-ui/4-forms-controls/03-events-change-input' },
      { title: 'Forms: event and method submit',           path: '2-ui/4-forms-controls/04-forms-submit' },
    ],
  },
  {
    title: 'Page Lifecycle',
    articles: [
      { title: 'Page: DOMContentLoaded, load, beforeunload, unload', path: '2-ui/5-loading/01-onload-ondomcontentloaded' },
      { title: 'Scripts: async, defer',                               path: '2-ui/5-loading/02-script-async-defer' },
    ],
  },

  // ── Part 5: Network requests ─────────────────────────────────────────────────
  {
    title: 'Network Requests',
    articles: [
      { title: 'Fetch',                          path: '5-network/01-fetch' },
      { title: 'FormData',                       path: '5-network/02-formdata' },
      { title: 'Fetch: Download progress',       path: '5-network/03-fetch-progress' },
      { title: 'Fetch: Abort',                   path: '5-network/04-fetch-abort' },
      { title: 'Fetch: Cross-Origin Requests',   path: '5-network/05-fetch-crossorigin' },
      { title: 'Fetch API',                      path: '5-network/06-fetch-api' },
      { title: 'URL objects',                    path: '5-network/07-url' },
      { title: 'XMLHttpRequest',                 path: '5-network/08-xmlhttprequest' },
      { title: 'Long polling',                   path: '5-network/10-long-polling' },
      { title: 'WebSocket',                      path: '5-network/11-websocket' },
      { title: 'Server Sent Events',             path: '5-network/12-server-sent-events' },
    ],
  },

  // ── Part 9: Regular Expressions ──────────────────────────────────────────────
  {
    title: 'Regular Expressions',
    articles: [
      { title: 'Patterns and flags',              path: '9-regular-expressions/01-regexp-introduction' },
      { title: 'Character classes',               path: '9-regular-expressions/02-regexp-character-classes' },
      { title: 'Anchors: ^ and $',               path: '9-regular-expressions/04-regexp-anchors' },
      { title: 'Word boundary: \\b',              path: '9-regular-expressions/06-regexp-boundary' },
      { title: 'Escaping, special characters',    path: '9-regular-expressions/07-regexp-escaping' },
      { title: 'Sets and ranges [...]',           path: '9-regular-expressions/08-regexp-sets-and-ranges' },
      { title: 'Quantifiers +, *, ? and {n}',    path: '9-regular-expressions/09-regexp-quantifiers' },
      { title: 'Greedy and lazy quantifiers',     path: '9-regular-expressions/10-regexp-greedy-and-lazy' },
      { title: 'Capturing groups',                path: '9-regular-expressions/11-regexp-groups' },
      { title: 'Alternation (OR) |',              path: '9-regular-expressions/13-regexp-alternation' },
      { title: 'Lookahead and lookbehind',        path: '9-regular-expressions/14-regexp-lookahead-lookbehind' },
      { title: 'Methods of RegExp and String',    path: '9-regular-expressions/17-regexp-methods' },
    ],
  },
];

export function flattenToc(): JsInfoArticle[] {
  return JS_INFO_TOC.flatMap((g) => g.articles);
}

export function articleWebUrl(path: string): string {
  const slug = path.split('/').pop()?.replace(/^\d+-/, '') ?? '';
  return `https://javascript.info/${slug}`;
}

export async function fetchJsInfoArticle(path: string): Promise<PdfBlock[]> {
  const url = `${BASE}/${path}/article.md`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return markdownToBlocks(await res.text());
}

// ── Lightweight markdown → PdfBlock[] parser ─────────────────────────────────
// Handles the subset of Markdown used by javascript.info articles:
// headings, paragraphs, fenced code blocks (skipped), lists, blockquotes,
// inline formatting (bold/italic/code/links/images).

function stripInline(s: string): string {
  return s
    .replace(/!\[.*?\]\(.*?\)/g, '')                 // images → removed
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')          // links → text only
    .replace(/`([^`]+)`/g, '$1')                      // inline code → text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')            // bold+italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')                // bold **
    .replace(/__([^_]+)__/g, '$1')                    // bold __
    .replace(/\*([^*\n]+)\*/g, '$1')                  // italic *
    .replace(/~~([^~]+)~~/g, '$1')                    // strikethrough
    .replace(/<!--[\s\S]*?-->/g, '')                  // HTML comments
    .replace(/<[^>]+>/g, '')                          // HTML tags
    .trim();
}

function markdownToBlocks(md: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  const lines = md.split('\n');
  let inCode = false;
  let inFrontmatter = false;
  let paraLines: string[] = [];

  function flushPara() {
    const text = paraLines.join(' ').trim();
    if (text.length > 2) blocks.push({ text, heading: false });
    paraLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // YAML frontmatter (first ---...---)
    if (i === 0 && line === '---') { inFrontmatter = true; continue; }
    if (inFrontmatter) {
      if (line === '---' || line === '...') inFrontmatter = false;
      continue;
    }

    // Fenced code blocks
    if (/^(`{3,}|~{3,})/.test(line)) {
      inCode = !inCode;
      if (inCode) flushPara();
      continue;
    }
    if (inCode) continue;

    // Empty line → paragraph break
    if (!line.trim()) { flushPara(); continue; }

    // ATX headings: # H1 through ###### H6, optional {#anchor}
    const hMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+\{[^}]*\})?$/);
    if (hMatch) {
      flushPara();
      const text = stripInline(hMatch[2]);
      if (text) blocks.push({ text, heading: hMatch[1].length <= 3 });
      continue;
    }

    // Setext heading underlines, horizontal rules, table rows → skip
    if (/^(={3,}|-{3,}|\*{3,}|_{3,})$/.test(line.trim())) continue;
    if (/^\|/.test(line)) continue;

    // javascript.info custom block directives (e.g. [codetabs], [demo ...]) → skip
    if (/^\[[\w-]+/.test(line)) continue;

    // Strip blockquote markers and list markers; collapse indentation
    let content = line
      .replace(/^(>\s?)+/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+\.\s+/, '')
      .trimStart();

    const stripped = stripInline(content);
    if (stripped) paraLines.push(stripped);
  }
  flushPara();

  return blocks;
}
