import { marked } from './vendors/marked.esm.js';

const selectLesson = document.getElementById('select-lesson');
const cardEl = document.getElementById('card');

const lessons = [
  { id: 'hangul', title: 'Bảng Hangul tổng hợp' },
  { id: 'number', title: 'Số' },
  { id: 'introduction', title: 'Giới thiệu bản thân/tuổi' },
];

function renderLessons() {
  selectLesson.innerHTML = '';
  lessons.forEach((lesson) => {
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = lesson.title;
    selectLesson.appendChild(option);
  });
}
function loadLesson(lessonId) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (lesson) {
    fetch(`../data/${lesson.id}.md`)
      .then((response) => response.text())
      .then((md) => {
        cardEl.innerHTML = marked.parse(md);
      })
      .catch((error) => {
        console.error('Error loading lesson:', error);
        cardEl.innerHTML = `<p>Error loading lesson: ${error.message}</p>`;
      });
  }
}

function handleSelectChange() {
  const selectedLesson = selectLesson.value;
  if (selectedLesson) {
    loadLesson(selectedLesson);
  } else {
    cardEl.innerHTML = '<p>Please select a lesson.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderLessons();
  selectLesson.addEventListener('change', handleSelectChange);

  // Load the first lesson by default
  if (lessons.length > 0) {
    loadLesson(lessons[0].id);
  } else {
    cardEl.innerHTML = '<p>No lessons available.</p>';
  }
});
