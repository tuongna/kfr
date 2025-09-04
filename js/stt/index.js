let recognizer;
let phrases = [];

const SILENCE_TIME = 0.8;
const SAMPLE_RATE = 16000;

const getConfidenceColor = (conf) => (conf < 0.6 ? 'red' : 'blue');

async function setupBiasSelect(recBias) {
  const biasSelect = document.getElementById('bias-select');
  const biasKeys = ['none', ...Object.keys(recBias)];

  if (biasSelect.parentNode) biasSelect.parentNode.style.display = '';
  biasSelect.innerHTML = biasKeys
    .map(
      (key) =>
        `<option value="${key}">${
          key === 'it' ? 'IT' : key.charAt(0).toUpperCase() + key.slice(1)
        }</option>`
    )
    .join('');
  return biasKeys;
}

const updatePartial = (partialContainer, text) => (partialContainer.textContent = text);

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

  lineDiv.append(koDiv, enDiv);
  resultsContainer.appendChild(lineDiv);
  resultsContainer.scrollTop = resultsContainer.scrollHeight;

  (async () => {
    try {
      const inputText = textBuffer.join(' ').trim();
      enDiv.textContent = inputText ? (await translator(inputText))[0].translation_text : '';
    } catch {
      enDiv.textContent = '(translation failed)';
    }
  })();
}

const appendToCurrentKo = (resultsContainer, fragment) => {
  const currentKo = resultsContainer.querySelector('.line.latest .ko');
  if (currentKo) currentKo.appendChild(fragment);
};

function createRecognizer(
  model,
  recBias,
  selectedBias,
  resultsContainer,
  partialContainer,
  translator
) {
  phrases = recBias[selectedBias] || [];
  console.log('Using phrases:', phrases);

  recognizer = phrases?.length
    ? new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(phrases))
    : new model.KaldiRecognizer(SAMPLE_RATE);

  recognizer.setWords(true);

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
      resultsContainer.querySelector('.line.latest')?.classList.remove('latest');
      appendResultLine(resultsContainer, fragment, textBuffer, translator, ++lineId);
    } else {
      appendToCurrentKo(resultsContainer, fragment);
    }
  });

  recognizer.on('partialresult', ({ result }) =>
    updatePartial(partialContainer, result.partial || '')
  );
  return recognizer;
}

const isMobile = () => /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

async function init() {
  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');
  const biasSelect = document.getElementById('bias-select');

  const { pipeline, env } = await import('../vendors/transformers.min.js');
  const recBias = await fetch('./data/recognition-bias.json').then((r) => r.json());

  env.useBrowserCache = true;
  env.allowLocalModels = true;
  env.backends.onnx.wasm.wasmPaths = {
    'ort-wasm-simd.wasm': 'models/opus-mt-ko-en/ort-wasm-simd.wasm',
  };

  updatePartial(partialContainer, 'Loading...');

  /** =========================================
   * Monitor resource loading
   ========================================= */
  const loadedLabels = new Set();
  const loadingStatus = {};
  const translationProgress = {
    encoder: 0,
    decoder: 0,
    encoderTotal: 0,
    decoderTotal: 0,
    encoderLoaded: 0,
    decoderLoaded: 0,
  };

  function renderLoadingStatus() {
    const lines = [];
    if (loadingStatus['STT model']) lines.push(`<div>${loadingStatus['STT model']}</div>`);
    let translationLine = '';
    if (translationProgress.encoderTotal && translationProgress.decoderTotal) {
      const encoderPercent =
        translationProgress.encoderLoaded / translationProgress.encoderTotal || 0;
      const decoderPercent =
        translationProgress.decoderLoaded / translationProgress.decoderTotal || 0;
      const avgPercent = Math.round(((encoderPercent + decoderPercent) / 2) * 100);
      translationLine =
        avgPercent >= 100 ? 'Translation model loaded' : `Translation model ${avgPercent}%`;
    } else {
      if (loadingStatus['Translation encoder model'])
        lines.push(`<div>${loadingStatus['Translation encoder model']}</div>`);
      if (loadingStatus['Translation decoder model'])
        lines.push(`<div>${loadingStatus['Translation decoder model']}</div>`);
    }
    if (translationLine) lines.push(`<div>${translationLine}</div>`);
    partialContainer.innerHTML = lines.join('');
  }

  function monitorResourceLoading(url, label) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
      if (!loadedLabels.has(label)) {
        if (event.lengthComputable) {
          const percent = event.loaded / event.total;
          loadingStatus[label] = `Loading ${label}... ${Math.round(percent * 100)}%`;
          if (label === 'Translation encoder model') {
            translationProgress.encoderTotal = event.total;
            translationProgress.encoderLoaded = event.loaded;
          }
          if (label === 'Translation decoder model') {
            translationProgress.decoderTotal = event.total;
            translationProgress.decoderLoaded = event.loaded;
          }
        } else {
          loadingStatus[label] = `Loading ${label}...`;
        }
        renderLoadingStatus();
      }
    };

    xhr.onload = () => {
      loadedLabels.add(label);
      loadingStatus[label] = `${label} loaded`;
      if (label === 'Translation encoder model')
        translationProgress.encoderLoaded = translationProgress.encoderTotal;
      if (label === 'Translation decoder model')
        translationProgress.decoderLoaded = translationProgress.decoderTotal;
      renderLoadingStatus();
    };

    xhr.onerror = () => {
      loadingStatus[label] = `Failed to load ${label}`;
      renderLoadingStatus();
    };

    xhr.send();
  }

  monitorResourceLoading('models/vosk-model-small-ko-0.22.tar.gz', 'STT model');
  monitorResourceLoading(
    'models/opus-mt-ko-en/onnx/decoder_model_merged_quantized.onnx',
    'Translation decoder model'
  );
  monitorResourceLoading(
    'models/opus-mt-ko-en/onnx/encoder_model_quantized.onnx',
    'Translation encoder model'
  );
  /** =========================================
   * END: Monitor resource loading
   ========================================= */

  const translator = await pipeline('translation', 'opus-mt-ko-en', { localFilesOnly: true });
  const biasKeys = await setupBiasSelect(recBias);

  const channel = new MessageChannel();
  const model = await Vosk.createModel('models/vosk-model-small-ko-0.22.tar.gz');
  model.registerPort(channel.port1);

  const setRecognizer = (biasKey) => {
    recognizer = createRecognizer(
      model,
      recBias,
      biasKey,
      resultsContainer,
      partialContainer,
      translator
    );
  };

  setRecognizer(biasKeys[0]);
  biasSelect.onchange = (e) => setRecognizer(e.target.value);

  if (isMobile()) {
    partialContainer.innerHTML =
      '<p style="color: red; font-weight: bold;">Trên mobile, trợ lý nhận diện giọng nói sẽ không hoạt động ổn định. Hãy thử lại trên PC.</p>';
  } else {
    updatePartial(partialContainer, 'Ready');
  }

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
  const sttTrigger = document.getElementById('stt-trigger');
  if (sttTrigger)
    sttTrigger.onclick = function () {
      this.disabled = true;
      init();
    };
};
