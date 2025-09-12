import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';

env.allowLocalModels = false;

// Progress UI logic
const fileProgressMap = new Map();
const progressObj = {};

function updateProgressUI({ status, name, file, progress }) {
  const path = name + '/' + file;
  const loadingBar = document.getElementById('model-loading-bar');
  const progressDiv = document.getElementById('progress');
  const statusDiv = document.getElementById('status');

  if (status === 'progress' && progress !== undefined) {
    loadingBar.style.display = '';
    fileProgressMap.set(path, progress);
    progressObj[path] = progress;
    const values = Object.values(progressObj);
    const totalProgress = values.reduce((a, b) => a + b, 0);
    const percent = totalProgress / values.length;
    progressDiv.style.width = percent.toFixed(2) + '%';
    statusDiv.innerHTML = Array.from(fileProgressMap.entries())
      .map(([fname, prog]) => `Loading model file: ${fname} (${prog.toFixed(2)}%)`)
      .join('<br>');
  }

  if (status === 'done') {
    fileProgressMap.set(path, 1);
    progressObj[path] = 1;
    statusDiv.innerHTML = Array.from(fileProgressMap.entries())
      .map(([fname, prog]) =>
        prog === 100 ? `Model ${fname} loaded` : `${fname} (${prog.toFixed(2)}%)`
      )
      .join('<br>');
    setTimeout(() => {
      statusDiv.textContent = '';
      fileProgressMap.clear();
      for (const key in progressObj) {
        delete progressObj[key];
      }
    }, 800);
  }
}

// Main logic
const startBtn = document.getElementById('start');
const resultsDiv = document.getElementById('results');
const visualizerCanvas = document.getElementById('visualizer');
const countdownTimer = document.getElementById('countdown-timer');
const canvasCtx = visualizerCanvas.getContext('2d');
let mediaRecorder, stream;
let isRecording = false;
let audioCtx, analyser, source, animationId;
const RECORDING_TIMEOUT_MS = 29000;
let recordingTimeout = null;
let countdown = null; // Add countdown variable
let transcriber = null;
let translator = null;

function showNoSpeechMessage() {
  if (!document.querySelector('.no-speech')) {
    const p = document.createElement('p');
    p.className = 'no-speech';
    p.textContent = '[No speech detected]';
    resultsDiv.appendChild(p);
  }
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.?!\u3002])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function blobToFloat32Array(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    1,
    16000,
    16000
  );
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer.getChannelData(0);
}

async function processChunk(blob) {
  startBtn.disabled = true;
  startBtn.textContent = 'Analyzing...';
  const noSpeechEl = document.querySelector('.no-speech');
  if (noSpeechEl) noSpeechEl.remove();

  const float32Audio = await blobToFloat32Array(blob);
  try {
    const res = await transcriber(float32Audio, { language: 'ko' });
    if (!res.text || res.text.trim() === '') {
      showNoSpeechMessage();
      throw new Error('No speech detected');
    }

    const sentences = splitIntoSentences(res.text);
    for (const sentence of sentences) {
      appendSentencePair(sentence, 'Translating...');
      let translationText = sentence;
      if (translator) {
        const translationResult = await translator(sentence);
        translationText = translationResult?.[0]?.translation_text || '';
      }
      // Update the last appended sentence-pair's translation
      const lastPair = resultsDiv.querySelectorAll('.sentence-pair');
      if (lastPair.length > 0) {
        lastPair[lastPair.length - 1].querySelector('.translation').textContent = translationText;
      }
    }
  } catch (e) {
    console.error('Recognition error:', e);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start';
  }
}

function appendSentencePair(original, translation) {
  const container = document.createElement('div');
  container.className = 'sentence-pair';
  const originalP = document.createElement('p');
  originalP.className = 'original';
  originalP.textContent = original;
  const transP = document.createElement('p');
  transP.className = 'translation';
  transP.textContent = translation;
  container.appendChild(originalP);
  container.appendChild(transP);
  resultsDiv.appendChild(container);
}

function drawVisualizer() {
  if (!analyser) return;
  const WIDTH = visualizerCanvas.width;
  const HEIGHT = visualizerCanvas.height;
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = '#0078d4';
  canvasCtx.beginPath();

  let sliceWidth = (WIDTH * 1.0) / bufferLength;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    let v = dataArray[i] / 128.0;
    let y = (v * HEIGHT) / 2;
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  canvasCtx.lineTo(WIDTH, HEIGHT / 2);
  canvasCtx.stroke();

  animationId = requestAnimationFrame(drawVisualizer);
}

function updateCountdownUI(secondsLeft) {
  let countdownEl = document.getElementById('countdown-timer');
  if (!countdownEl) {
    countdownEl = document.createElement('div');
    countdownEl.id = 'countdown-timer';
    countdownEl.style.fontWeight = 'bold';
    countdownEl.style.marginTop = '1em';
    countdownEl.style.color = '#0078d4';
    countdownTimer.appendChild(countdownEl);
  }
  countdownEl.textContent = `Recording will stop in ${secondsLeft} seconds`;
}

function removeCountdownUI() {
  const countdownEl = document.getElementById('countdown-timer');
  if (countdownEl) countdownEl.remove();
}

async function startRecording() {
  if (!transcriber) {
    alert('Models are not loaded yet - please wait.');
    return;
  }

  isRecording = true;
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let mimeType = '';
  if (MediaRecorder.isTypeSupported('audio/wav')) {
    mimeType = 'audio/wav';
  } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    mimeType = 'audio/webm;codecs=opus';
  } else if (MediaRecorder.isTypeSupported('audio/webm')) {
    mimeType = 'audio/webm';
  }

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      processChunk(event.data);
    }
  };
  mediaRecorder.start();

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  drawVisualizer();

  let secondsLeft = Math.ceil(RECORDING_TIMEOUT_MS / 1000);
  updateCountdownUI(secondsLeft);
  countdown = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      updateCountdownUI(secondsLeft);
    } else {
      removeCountdownUI();
      clearInterval(countdown);
      countdown = null;
    }
  }, 1000);

  recordingTimeout = setTimeout(() => {
    stopRecording();
  }, RECORDING_TIMEOUT_MS);

  startBtn.disabled = false;
  startBtn.textContent = 'Stop';
  console.log('Recording started');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  isRecording = false;
  startBtn.textContent = 'Start';
  console.log('Recording stopped');
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  if (countdown) {
    clearInterval(countdown);
    countdown = null;
  }
  removeCountdownUI();
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  analyser = null;
  source = null;
  canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
}

// Model pipeline factory
class PipelineFactory {
  static task = null;
  static model = null;
  static quantized = null;
  static instance = null;
  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        quantized: this.quantized,
        progress_callback,
        revision: this.model && this.model.includes('/whisper-base') ? 'no_attentions' : 'main',
      });
    }
    return this.instance;
  }
  static async dispose() {
    if (this.instance !== null) {
      await this.instance.dispose();
      this.instance = null;
    }
  }
}

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
  static task = 'automatic-speech-recognition';
  static model = null;
  static quantized = null;
}

function isMobileBrowser() {
  const userAgent = navigator.userAgent;
  const mobileKeywords =
    /(iPhone|iPod|iPad|Android|BlackBerry|IEMobile|Windows Phone|webOS|Opera Mini|Mobile|Tablet)/i;
  return mobileKeywords.test(userAgent);
}

async function initModels() {
  AutomaticSpeechRecognitionPipelineFactory.model = isMobileBrowser()
    ? 'Xenova/whisper-tiny'
    : 'Xenova/whisper-base';
  AutomaticSpeechRecognitionPipelineFactory.quantized = false;
  transcriber = await AutomaticSpeechRecognitionPipelineFactory.getInstance(updateProgressUI);

  translator = await pipeline('translation', 'Xenova/opus-mt-ko-en', {
    progress_callback: updateProgressUI,
  });

  startBtn.disabled = false;
  document.getElementById('model-loading-bar').style.display = 'none';
  document.getElementById('status').textContent = '';
  console.log('[DEBUG] Models loaded.');
}

// Event bindings
startBtn.addEventListener('click', () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

startBtn.disabled = true;
initModels();
