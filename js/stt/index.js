async function init() {
  const { pipeline, env } = await import(
    'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.2/dist/transformers.min.js'
  );
  const [vocab, sentences, itBias] = await Promise.all([
    fetch('../data/vocab.json').then((r) => r.json()),
    fetch('../data/sentences.json').then((r) => r.json()),
    fetch('../data/it-bias.json').then((r) => r.json()),
  ]);

  const phrases = [...vocab, ...sentences, ...itBias].map((item) => item.ko);

  env.useBrowserCache = true;
  env.allowLocalModels = false;

  const SILENCE_TIME = 0.8;
  const SAMPLE_RATE = 16000;

  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');
  partialContainer.textContent = 'Loading...';

  function getConfidenceColor(conf) {
    return conf < 0.6 ? 'red' : 'blue';
  }

  // Enable translator
  const translator = await pipeline('translation', 'Xenova/opus-mt-ko-en');

  const channel = new MessageChannel();
  const model = await Vosk.createModel('models/vosk-model-small-ko-0.22.tar.gz');
  model.registerPort(channel.port1);

  const recognizer = new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(phrases));
  recognizer.setWords(true);

  let latestFirstResult = { start: 0 };
  let lineId = 0;

  recognizer.on('result', async (message) => {
    const { result } = message.result;
    if (!result || result.length === 0) return;

    const isNextLine = result[0].start - latestFirstResult.start > SILENCE_TIME;
    latestFirstResult = { ...result[0] };

    // Create Korean fragment
    const fragment = document.createDocumentFragment();
    const textBuffer = [];
    result.forEach((w) => {
      textBuffer.push(w.word);
      const span = document.createElement('span');
      span.textContent = w.word + ' ';
      span.style.color = getConfidenceColor(w.conf);
      fragment.appendChild(span);
    });

    if (isNextLine) {
      lineId++;

      // Remove old highlight
      const oldLatest = resultsContainer.querySelector('.line.latest');
      if (oldLatest) oldLatest.classList.remove('latest');

      // New bubble with 2 columns
      const lineDiv = document.createElement('div');
      lineDiv.className = 'line latest';
      lineDiv.id = `line-${lineId}`;

      const koDiv = document.createElement('div');
      koDiv.className = 'ko';
      koDiv.appendChild(fragment);

      const enDiv = document.createElement('div');
      enDiv.className = 'en';
      enDiv.textContent = 'Translating...';

      lineDiv.appendChild(koDiv);
      lineDiv.appendChild(enDiv);

      resultsContainer.appendChild(lineDiv);
      resultsContainer.scrollTop = resultsContainer.scrollHeight;

      // Call translation → update enDiv
      try {
        const inputText = textBuffer.join(' ').trim();
        if (inputText) {
          const output = await translator(inputText);
          enDiv.textContent = output[0].translation_text;
        } else {
          enDiv.textContent = '';
        }
      } catch (err) {
        console.error('Translation error:', err);
        enDiv.textContent = '(translation failed)';
      }
    } else {
      // Append to current ko column
      const currentKo = resultsContainer.querySelector('.line.latest .ko');
      if (currentKo) {
        currentKo.appendChild(fragment);
      }
    }
  });

  recognizer.on('partialresult', (message) => {
    partialContainer.textContent = message.result.partial || '';
  });

  partialContainer.textContent = 'Ready';

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: SAMPLE_RATE,
    },
  });

  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  await audioContext.audioWorklet.addModule('js/stt/recognizer-processor.js');

  const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', {
    channelCount: 1,
    numberOfInputs: 1,
    numberOfOutputs: 1,
  });

  recognizerProcessor.port.postMessage({ action: 'init', recognizerId: recognizer.id }, [
    channel.port2,
  ]);

  recognizerProcessor.connect(audioContext.destination);

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(recognizerProcessor);
}

window.onload = () => {
  document.getElementById('trigger').onclick = function () {
    this.disabled = true;
    init();
  };
};
