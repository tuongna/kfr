let recognizer;
let phrases = [];

const SILENCE_TIME = 0.8;
const SAMPLE_RATE = 16000;

function getConfidenceColor(conf) {
  return conf < 0.6 ? 'red' : 'blue';
}

async function setupBiasSelect(recBias) {
  const biasSelect = document.getElementById('bias-select');
  const biasKeys = Object.keys(recBias);
  if (biasSelect.parentNode) {
    biasSelect.parentNode.style.display = '';
  }
  biasSelect.innerHTML = '';
  biasKeys.forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    biasSelect.appendChild(option);
  });
  return biasKeys;
}

function updatePartial(partialContainer, text) {
  partialContainer.textContent = text;
}

function appendResultLine(resultsContainer, fragment, textBuffer, translator, lineId) {
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

  (async () => {
    try {
      const inputText = textBuffer.join(' ').trim();
      enDiv.textContent = inputText ? (await translator(inputText))[0].translation_text : '';
    } catch (err) {
      console.error('Translation error:', err);
      enDiv.textContent = '(translation failed)';
    }
  })();
}

function appendToCurrentKo(resultsContainer, fragment) {
  const currentKo = resultsContainer.querySelector('.line.latest .ko');
  if (currentKo) currentKo.appendChild(fragment);
}

function createRecognizer(
  model,
  recBias,
  selectedBias,
  resultsContainer,
  partialContainer,
  translator
) {
  phrases = recBias[selectedBias];
  recognizer = new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(phrases));
  recognizer.setWords(true);
  console.log('Bias set to:', selectedBias, phrases);

  let latestFirstResult = { start: 0 };
  let lineId = 0;

  recognizer.on('result', async (message) => {
    const { result } = message.result;
    if (!result || result.length === 0) return;

    const isNextLine = result[0].start - latestFirstResult.start > SILENCE_TIME;
    latestFirstResult = { ...result[0] };

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
      const oldLatest = resultsContainer.querySelector('.line.latest');
      if (oldLatest) oldLatest.classList.remove('latest');
      lineId++;
      appendResultLine(resultsContainer, fragment, textBuffer, translator, lineId);
    } else {
      appendToCurrentKo(resultsContainer, fragment);
    }
  });

  recognizer.on('partialresult', (message) => {
    updatePartial(partialContainer, message.result.partial || '');
  });

  return recognizer;
}

async function init() {
  const { pipeline, env } = await import('../vendors/transformers.min.js');
  const recBias = await fetch('./data/recognition-bias.json').then((r) => r.json());

  env.useBrowserCache = true;
  env.allowLocalModels = true;
  env.backends.onnx.wasm.wasmPaths = {
    'ort-wasm-simd.wasm': 'models/opus-mt-ko-en/ort-wasm-simd.wasm',
  };

  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');
  updatePartial(partialContainer, 'Loading...');

  const translator = await pipeline('translation', 'opus-mt-ko-en', { localFilesOnly: true });

  const biasKeys = await setupBiasSelect(recBias);

  const channel = new MessageChannel();
  const model = await Vosk.createModel('models/vosk-model-small-ko-0.22.tar.gz');
  model.registerPort(channel.port1);

  function setRecognizer(biasKey) {
    recognizer = createRecognizer(
      model,
      recBias,
      biasKey,
      resultsContainer,
      partialContainer,
      translator
    );
  }

  setRecognizer(biasKeys[0]);
  document.getElementById('bias-select').onchange = (e) => setRecognizer(e.target.value);

  updatePartial(partialContainer, 'Ready');
  resultsContainer.style.display = '';

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
  audioContext.createMediaStreamSource(mediaStream).connect(recognizerProcessor);
}

window.onload = () => {
  document.getElementById('trigger').onclick = function () {
    this.disabled = true;
    init();
  };
};
