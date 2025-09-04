import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDRmX1Eslwgarbsh0qsLI9UKle5QmNmpqQ',
  authDomain: 'kfrean.firebaseapp.com',
  projectId: 'kfrean',
  storageBucket: 'kfrean.firebasestorage.app',
  messagingSenderId: '225788695153',
  appId: '1:225788695153:web:7ac6bc58dd32c3e0c301d0',
  measurementId: 'G-X4NV041SNB',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const loginBtn = document.getElementById('loginBtn');
const greeting = document.getElementById('greeting');
const syncBtn = document.getElementById('syncBtn');
const homeLink = document.getElementById('homeLink');
const logoutBtn = document.getElementById('logoutBtn');
const output = document.getElementById('output');
const loading = document.getElementById('loading');

function showLoading() {
  loading.classList.add('show');
}
function hideLoading() {
  loading.classList.remove('show');
}

// ===== Helper =====
function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadLocal(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
function isNonEmpty(obj) {
  return obj && Object.keys(obj).length > 0;
}

async function fetchRemoteAndApply(user) {
  showLoading;

  try {
    // Merge and sync learnedVocab
    const learnedVocab = await mergeAndSync(user.uid, 'learnedVocab', 'learnedVocab');
    // Merge and sync learnedSentences
    const learnedSentences = await mergeAndSync(user.uid, 'learnedSentences', 'learnedSentences');

    return { learnedVocab, learnedSentences };
  } catch (error) {
    console.error('Error fetching remote data:', error);
  } finally {
    hideLoading();
  }
}

async function mergeAndSync(userId, localKey, fbField) {
  // Load local data
  const localData = loadLocal(localKey) || {};

  // Reference đến Firebase
  const progressRef = doc(db, 'users', userId, 'progress', 'main');
  const snap = await getDoc(progressRef);

  let fbData = {};
  if (snap.exists()) {
    fbData = snap.data()[fbField] || {};
  }

  function _max(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;

    return Math.max(a, b);
  }

  function _minDate(a, b) {
    if (!a || !b) return a || b;
    return new Date(a) < new Date(b) ? a : b;
  }

  // Merge data theo key với rule riêng
  const merged = { ...fbData };
  for (const k in localData) {
    if (merged[k]) {
      merged[k] = {
        level: _max(localData[k].level, merged[k].level),
        xp: _max(localData[k].xp, merged[k].xp),
        nextReview: _minDate(localData[k].nextReview, merged[k].nextReview),
      };
    } else {
      // key chỉ có ở local
      merged[k] = localData[k];
    }
  }

  // Lưu local và sync lên Firebase
  saveLocal(localKey, merged);
  await setDoc(progressRef, { [fbField]: merged }, { merge: true });

  return merged;
}

// ===== Login =====
loginBtn.addEventListener('click', async () => {
  showLoading();

  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error('Login error:', e);
  } finally {
    hideLoading();
  }
});

// ===== Logout =====
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Logout error:', e);
  }
});

// ===== Auth state =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // reset UI
    loginBtn.style.display = '';
    greeting.style.display = 'none';
    syncBtn.style.display = 'none';
    homeLink.style.display = 'none';
    logoutBtn.style.display = 'none';
    output.textContent = '';
    return;
  }

  // Ẩn nút login, hiện câu chào, logout
  loginBtn.style.display = 'none';
  greeting.style.display = '';
  greeting.textContent = `Xin chào, ${user.displayName}!`;
  logoutBtn.style.display = '';

  // Tạo doc metadata nếu chưa có
  const userDocRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    await setDoc(userDocRef, {
      email: user.email,
      name: user.displayName,
      avatar: user.photoURL,
      createdAt: new Date().toISOString(),
    });
  }

  const remote = await fetchRemoteAndApply(user);

  const localVocab = loadLocal('learnedVocab') || {};
  const localSent = loadLocal('learnedSentences') || {};

  const remoteHasVocab = isNonEmpty(remote.learnedVocab);
  const remoteHasSent = isNonEmpty(remote.learnedSentences);

  if (isNonEmpty(localVocab) || isNonEmpty(localSent)) {
    syncBtn.style.display = '';
  } else {
    syncBtn.style.display = 'none';
    if (remoteHasVocab || remoteHasSent) homeLink.style.display = '';
  }
});

// ===== Sync =====
syncBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Please login first!');

  showLoading();
  try {
    const vocab = await mergeAndSync(user.uid, 'learnedVocab', 'learnedVocab');
    const sent = await mergeAndSync(user.uid, 'learnedSentences', 'learnedSentences');

    output.textContent = 'Dữ liệu đã được đồng bộ!\n' + JSON.stringify({ vocab, sent }, null, 2);
    syncBtn.style.display = 'none';
    homeLink.style.display = '';
  } catch (e) {
    console.error('Sync error:', e);
  } finally {
    hideLoading();
  }
});
