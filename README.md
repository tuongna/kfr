# KfR

🔗 Live App: [https://tuongna.github.io](https://tuongna.github.io)

Version: 0.0.1  
Developed under the MIT License.

## About

KfR is a Progressive Web App (PWA) for learning Korean grammar and vocabulary.

## SPA Routing

This app uses a **hash-based SPA router**:

- URLs: `/#vocab` or `/#sentences`
- Navigation is handled by `data-link` attributes on `<a>` elements:

```html
<a href="#vocab" data-link>Vocabulary</a>
<a href="#sentences" data-link>Sentences</a>
```

## Running Unit Tests

This project uses **Jasmine** for unit testing.

### Run tests

```bash
npm install           # install dependencies
npm test              # run all tests
```

## Content and Audio License

- **Text data (Korean, English, Vietnamese sentences):** collected from multiple public sources; no specific license applies.
- **Audio files:** generated using **gTTS**, licensed under **MIT License**.
- **Source code:** MIT License

> ⚠ **Important:** Use of the content is at your own discretion. Attribution is encouraged when possible.

## License

This project’s **source code** is licensed under the MIT License — see [LICENSE.md](LICENSE.md) for details.

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
