async function init() {
  const { pipeline, env } = await import(
    'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.2/dist/transformers.min.js'
  );

  env.useBrowserCache = false;
  env.allowLocalModels = false;

  const SILENCE_TIME = 0.8; // seconds
  const SAMPLE_RATE = 48000;

  const resultsContainer = document.getElementById('recognition-result');
  const partialContainer = document.getElementById('partial');
  partialContainer.textContent = 'Loading...';

  function getConfidenceColor(conf) {
    if (conf < 0.2) return 'red';
    if (conf < 0.4) return 'red';
    if (conf < 0.6) return 'red';
    if (conf < 0.8) return 'blue';
    return 'blue';
  }

  // Hugging Face translation pipeline
  const translator = await pipeline('translation', 'Xenova/opus-mt-ko-en');

  const channel = new MessageChannel();
  const model = await Vosk.createModel('models/vosk-model-small-ko-0.22.tar.gz');
  model.registerPort(channel.port1);

  const recognizer = new model.KaldiRecognizer(SAMPLE_RATE);
  recognizer.setWords(true);

  let latestFirstResult = { start: 0 };
  let lineBuffer = '';

  recognizer.on('result', async (message) => {
    const messageResult = message.result;
    const { result } = messageResult;

    if (!result || result.length === 0) return;

    const isNextLine = result[0].start - latestFirstResult.start > SILENCE_TIME;
    latestFirstResult = { ...result[0] };

    if (isNextLine && lineBuffer.trim() !== '') {
      const translation = await translator(lineBuffer);
      const transDiv = document.createElement('div');
      transDiv.style.color = 'purple';
      transDiv.textContent = translation[0].translation_text;
      resultsContainer.appendChild(transDiv);

      resultsContainer.appendChild(document.createElement('br'));
      lineBuffer = '';
    }

    const fragment = document.createDocumentFragment();
    result.forEach((w) => {
      const span = document.createElement('span');
      span.textContent = w.word + ' ';
      span.style.color = getConfidenceColor(w.conf);
      fragment.appendChild(span);
      lineBuffer += w.word + ' ';
    });

    resultsContainer.insertBefore(fragment, partialContainer);
    partialContainer.textContent = '';
  });

  recognizer.on('partialresult', ({ result }) => {
    partialContainer.textContent = result.partial || '';
  });

  partialContainer.textContent = 'Ready';

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
      sampleRate: SAMPLE_RATE,
    },
  });

  const audioContext = new AudioContext();
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
