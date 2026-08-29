<script lang="ts">
  import { EnglishTrainingApp } from './main';
  import { onMount } from 'svelte';
  import type { Question, SubmitResult, Grade } from './types';

  const app = new EnglishTrainingApp();
  const SESSION_COUNT = 10;

  /* Reactive state */
  let currentQuestion: Question | null = $state(null);
  let progress = $state('');
  let answer = $state('');
  let result: SubmitResult | null = $state(null);
  let showResult = $state(false);
  let showHint = $state(false);
  let showExample = $state(false);
  let sessionComplete = $state(false);
  let isSpeaking = $state(false);

  /* Svelte mount */
  onMount(() => startSession());

  /* Start a new session */
  function startSession() {
    app.startSession();
    currentQuestion = app.getCurrentQuestion();
    progress = `Question 1 of ${SESSION_COUNT}`;
    sessionComplete = false;
    answer = '';
    showResult = false;
    showHint = false;
    showExample = false;
    resultEl.classList.add('hidden');
    hintEl.classList.add('hidden');
    exampleEl.classList.add('hidden');
  }

  /* Update progress display */
  function updateProgress() {
    if (!currentQuestion) {
      progress = '🎉 Session Complete!';
      sessionComplete = true;
      return;
    }
    progress = `Question ${currentQuestion.id} of ${SESSION_COUNT}`;
  }

  /* Submit answer */
  function submitAnswer() {
    const uAnswer = answer.trim();
    if (!uAnswer) {
      alert('Please type an answer first.');
      return;
    }

    result = app.submitAnswer(uAnswer);
    if (!result) return;

    showResult = true;
    showHint = true;
    showExample = true;

    resultEl.className = `result ${result.grade.toLowerCase()}`;
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `<strong>${result.grade}</strong> (Score: ${result.score})<br>${result.feedback}`;

    hintEl.classList.remove('hidden');
    hintEl.textContent = result.hint;

    exampleEl.classList.remove('hidden');
    exampleEl.textContent = `Example: "${result.example}"`;

    inputArea.style.display = 'none';
    nextArea.style.display = 'block';
  }

  /* Handle reveal answer */
  function handleReveal() {
    if (!currentQuestion) return;

    exampleEl.classList.remove('hidden');
    exampleEl.textContent = `Answer: "${currentQuestion.answer}"`;

    // Advance to next question
    app.currentIndex++;
    setTimeout(() => {
      currentQuestion = app.getCurrentQuestion();
      updateProgress();
      showResult = false;
      showHint = false;
      showExample = false;
      resultEl.classList.add('hidden');
      hintEl.classList.add('hidden');
      exampleEl.classList.add('hidden');
      inputArea.style.display = 'block';
      nextArea.style.display = 'none';
    }, 1500);
  }

  /* Handle speak button */
  async function handleSpeak() {
    if (!currentQuestion) return;

    speakBtn.disabled = true;
    speakBtn.textContent = '🔊 Speaking...';

    await speaker.initialize();
    await speaker.speak(currentQuestion.question);

    speakBtn.disabled = false;
    speakBtn.textContent = '🔊 Listen';
  }

  /* Handle next button */
  function handleNext() {
    currentQuestion = app.getCurrentQuestion();
    updateProgress();
    showResult = false;
    showHint = false;
    showExample = false;
    resultEl.classList.add('hidden');
    hintEl.classList.add('hidden');
    exampleEl.classList.add('hidden');
    inputArea.style.display = 'block';
    nextArea.style.display = 'none';
  }
</script>

<template>
  <div class="container">
    <header>
      <h1>🇬🇧 English Training</h1>
      <p>瞬間英作文 — Instant English Composition</p>
    </header>

    <div class="card">
      <div id="progress" class="progress">{progress}</div>
      <div class="situation" id="situation">{currentQuestion ? `📍 ${currentQuestion.situation}` : ''}</div>
      <div class="question" id="question">{currentQuestion ? currentQuestion.question : ''}</div>

      <div id="input-area">
        <textarea id="answer" placeholder="Type your 3-word answer..."></textarea>
        <div class="controls">
          <button class="btn btn-primary" id="speak-btn" onclick={handleSpeak}>🔊 Listen</button>
          <button class="btn btn-secondary" id="submit-btn" onclick={submitAnswer}>Submit</button>
          <button class="btn btn-secondary" id="reveal-btn" onclick={handleReveal}>Reveal Answer</button>
        </div>
      </div>

      <div id="result" class="result hidden"></div>
      <div id="hint" class="hint hidden"></div>
      <div id="example" class="answer-reveal hidden"></div>

      <div class="controls" id="next-area" style="display:none;">
        <button class="btn btn-primary" id="next-btn" onclick={handleNext}>Next Question →</button>
      </div>
    </div>
  </div>
</template>

<style>
  :global(.container) {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  :global(header) {
    text-align: center;
    margin-bottom: 30px;
  }
  :global(header h1) {
    color: #282e3e;
    font-size: 2rem;
    margin-bottom: 10px;
  }
  :global(header p) {
    color: #586380;
  }
  :global(.card) {
    background: #ffffff;
    border-radius: 8px;
    padding: 24px;
    box-shadow: rgba(40, 46, 62, 0.1) 0px 4px 16px 0px;
    margin-bottom: 20px;
  }
  :global(.progress) {
    text-align: center;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 10px;
  }
  :global(.situation) {
    color: #667eea;
    font-size: 0.9rem;
    margin-bottom: 10px;
  }
  :global(.question) {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 15px;
  }
  :global(textarea) {
    width: 100%;
    min-height: 80px;
    padding: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1rem;
    resize: vertical;
    margin-bottom: 15px;
    font-family: inherit;
  }
  :global(textarea:focus) {
    outline: none;
    border-color: #667eea;
  }
  :global(.controls) {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
  }
  :global(.btn) {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    margin: 5px;
  }
  :global(.btn-primary) {
    background: #4255ff;
    color: #fff;
  }
  :global(.btn-primary:hover) {
    background: #3040ce;
  }
  :global(.btn-secondary) {
    background: #f0f0f0;
    color: #333;
  }
  :global(.btn-secondary:hover) {
    background: #e0e0e0;
  }
  :global(.result) {
    margin-top: 20px;
    padding: 15px;
    border-radius: 8px;
    background: #f8f9fa;
  }
  :global(.result.excellent) { background: #d4edda; border: 1px solid #c3e6cb; }
  :global(.result.good) { background: #d1ecf1; border: 1px solid #bee5eb; }
  :global(.result.poor) { background: #f8d7da; border: 1px solid #f5c6cb; }
  :global(.hint) {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    padding: 10px;
    border-radius: 6px;
    margin-top: 10px;
  }
  :global(.hidden) { display: none !important; }
</style>
