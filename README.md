# KfR

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.1-lightgrey.svg)
![Demo](https://img.shields.io/badge/demo-live-brightgreen)

🔗 Live App: [https://tuongna.github.io](https://tuongna.github.io)

This project is licensed under the Apache License 2.0.

## About

KfR is a Progressive Web App (PWA) for learning Korean grammar and vocabulary.

> ⚠ **Note:** KfR uses **specialized AI models**, not general-purpose LLMs.
>
> - `vosk-model-small-ko-0.22` → speech-to-text (STT)
> - `opus-mt-ko-en` → Korean-to-English translation

All AI models run **locally in the browser via WASM**, ensuring **privacy** and **no external API calls**.

## Features

### User Authentication and Data Storage with Firebase

KfR integrates [Firebase](https://firebase.google.com/) to manage user accounts and progress:

- **Authentication:** Users can sign in with Google or email/password.
- **Progress Tracking:** User vocabulary and sentence learning progress are stored in Firestore.
- **Secure Storage:** Data is encrypted and associated with each user account.

### Speech-to-Text (STT) with Vosk

KfR uses [Vosk API](https://github.com/alphacep/vosk-api) for offline speech recognition.

- Converts user’s spoken Korean into text in real-time.
- Lightweight and fast; works directly in the browser (via WASM) or Node.js environment.
- Supports multi-platform usage without needing cloud APIs, ensuring privacy of user audio.

### Korean-to-English Translation with Hugging Face Models

KfR uses [Hugging Face](https://huggingface.co/) transformer models to provide Korean-to-English translation:

- Translates Korean sentences and vocabulary to English directly in the app.
- Runs locally in the browser using ONNX or TensorFlow.js, ensuring user privacy.
- No external API calls required; translation is fast and secure.
- Model sources and configuration details are available in the documentation.

## SPA Routing

This app uses a **hash-based SPA router**:

- URLs: `/#/vocab` or `/#/sentences`
- Navigation is handled by `data-link` attributes on `<a>` elements:

```html
<a href="/#/vocab" data-link>Vocabulary</a>
<a href="/#/sentences" data-link>Sentences</a>
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
- **Audio files:** generated using **gTTS** (MIT licensed).
- **Source code:** licensed under the **Apache License 2.0**.
- **Dependencies:** this project uses [Vosk API](https://github.com/alphacep/vosk-api), licensed under the **Apache License 2.0**.

> ⚠ **Important:** Use of the content is at your own discretion. Attribution is encouraged when possible.

## License

This project’s **source code** is licensed under the Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
