/**
 * English Training App - Browser Controller
 * Wires up UI elements to the training logic
 */

import { EnglishTrainingApp } from './main.js';
import { speaker } from './speaker.js';

const app = new EnglishTrainingApp();

// UI elements
const progressEl = document.getElementById('progress');
const situationEl = document.getElementById('situation');
const questionEl = document.getElementById('question');
const answerEl = document.getElementById('answer');
const speakBtn = document.getElementById('speak-btn');
const submitBtn = document.getElementById('submit-btn');
const revealBtn = document.getElementById('reveal-btn');
const resultEl = document.getElementById('result');
const hintEl = document.getElementById('hint');
const exampleEl = document.getElementById('example');
const nextArea = document.getElementById('next-area');
const nextBtn = document.getElementById('next-btn');

/** Render the current question to the UI */
function renderQuestion() {
  const q = app.getCurrentQuestion();
  if (!q) {
    // Session complete
    questionEl.textContent = '🎉 Session Complete!';
    situationEl.textContent = '';
    progressEl.textContent = `Score: ${app.score}/30`;
    document.getElementById('input-area').style.display = 'none';
    nextArea.style.display = 'none';
    return;
  }
  progressEl.textContent = `Question ${q.id} of 10`;
  situationEl.textContent = `📍 ${q.situation}`;
  questionEl.textContent = q.question;
  answerEl.value = '';
  resultEl.classList.add('hidden');
  hintEl.classList.add('hidden');
  exampleEl.classList.add('hidden');
  document.getElementById('input-area').style.display = 'block';
  nextArea.style.display = 'none';
}

/** Handle answer submission */
function handleSubmit() {
  const userAnswer = answerEl.value.trim();
  if (!userAnswer) {
    alert('Please type an answer first.');
    return;
  }

  const result = app.submitAnswer(userAnswer);
  if (!result) return;

  // Show result
  resultEl.className = `result ${result.grade.toLowerCase()}`;
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `<strong>${result.grade}</strong> (Score: ${result.score})<br>${result.feedback}`;

  // Show hint
  if (result.hint) {
    hintEl.classList.remove('hidden');
    hintEl.textContent = result.hint;
  }

  // Show example
  exampleEl.classList.remove('hidden');
  exampleEl.textContent = `Example: "${result.example}"`;

  // Hide input area, show next button
  document.getElementById('input-area').style.display = 'none';
  nextArea.style.display = 'block';
}

/** Handle reveal answer */
function handleReveal() {
  const q = app.getCurrentQuestion();
  if (!q) return;

  exampleEl.classList.remove('hidden');
  exampleEl.textContent = `Answer: "${q.answer}"`;

  // Advance to next question
  app.currentIndex++;
  setTimeout(() => renderQuestion(), 1500);
}

/** Handle speak button */
async function handleSpeak() {
  const q = app.getCurrentQuestion();
  if (!q) return;

  speakBtn.disabled = true;
  speakBtn.textContent = '🔊 Speaking...';

  await speaker.initialize();
  await speaker.speak(q.question);

  speakBtn.disabled = false;
  speakBtn.textContent = '🔊 Listen';
}

/** Handle next button */
function handleNext() {
  renderQuestion();
}

// Wire up event listeners
speakBtn?.addEventListener('click', handleSpeak);
submitBtn?.addEventListener('click', handleSubmit);
revealBtn?.addEventListener('click', handleReveal);
nextBtn?.addEventListener('click', handleNext);
answerEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
});

// Start the session
app.startSession();
renderQuestion();