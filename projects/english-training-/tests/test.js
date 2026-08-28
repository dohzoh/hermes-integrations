import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionQuestions, getSituations } from '../src/questions.js';
import { gradeAnswer } from '../src/grading.js';
import { EnglishTrainingApp } from '../src/main.js';

// Tests for question generator
test('generateSessionQuestions returns correct count', () => {
  const questions = generateSessionQuestions(10);
  assert.equal(questions.length, 10);
});

test('generateSessionQuestions returns unique questions', () => {
  const questions = generateSessionQuestions(10);
  const ids = new Set(questions.map(q => q.id));
  assert.equal(ids.size, 10);
});

test('generateSessionQuestions includes all required fields', () => {
  const questions = generateSessionQuestions(5);
  const q = questions[0];
  assert.ok(q.id);
  assert.ok(q.situation);
  assert.ok(q.question);
  assert.ok(q.answer);
  assert.ok(q.keywords);
});

test('getSituations returns array of situation names', () => {
  const situations = getSituations();
  assert.ok(Array.isArray(situations));
  assert.ok(situations.length > 0);
  assert.ok(situations.includes('Daily Life'));
  assert.ok(situations.includes('Shopping'));
});

// Tests for grader
test('gradeAnswer scores keyword matches', () => {
  const question = {
    question: 'What is the weather like today?',
    answer: 'It is sunny and warm.',
    keywords: ['sunny', 'rainy', 'warm', 'cold', 'cloudy']
  };
  const result = gradeAnswer(question, 'It is sunny and warm.');
  assert.ok(result.score >= 2);
});

test('gradeAnswer detects partial matches', () => {
  const question = {
    question: 'How do you get to work?',
    answer: 'I take the train.',
    keywords: ['train', 'bus', 'car', 'walk', 'bike']
  };
  const result = gradeAnswer(question, 'I take the train.');
  assert.ok(result.score >= 1);
});

test('gradeAnswer handles empty answers', () => {
  const question = {
    question: 'What is the weather like today?',
    answer: 'It is sunny and warm.',
    keywords: ['sunny', 'rainy', 'warm', 'cold', 'cloudy']
  };
  const result = gradeAnswer(question, '');
  assert.ok(result.score >= 0);
});

test('gradeAnswer provides feedback', () => {
  const question = {
    question: 'Where is the train station?',
    answer: 'Go straight and turn left.',
    keywords: ['station', 'left', 'straight', 'right', 'near']
  };
  const result = gradeAnswer(question, 'Go straight.');
  assert.ok(result.feedback);
  assert.ok(result.hint);
  assert.ok(result.example);
});

// Tests for app flow
test('EnglishTrainingApp.startSession() starts a session', () => {
  const app = new EnglishTrainingApp();
  app.startSession();
  assert.ok(app.sessionStarted);
  assert.equal(app.sessionQuestions.length, 10);
  assert.equal(app.currentIndex, 0);
});

test('EnglishTrainingApp.submitAnswer() returns result', () => {
  const app = new EnglishTrainingApp();
  app.startSession();
  const question = app.getCurrentQuestion();
  const result = app.submitAnswer('Test answer');
  assert.ok(result);
  assert.ok(result.score !== undefined);
  assert.ok(result.grade);
});

test('EnglishTrainingApp.isComplete() returns false during session', () => {
  const app = new EnglishTrainingApp();
  app.startSession();
  assert.equal(app.isComplete(), false);
});

test('EnglishTrainingApp.isComplete() returns true after session', () => {
  const app = new EnglishTrainingApp();
  app.startSession();
  for (let i = 0; i < 10; i++) {
    app.submitAnswer('Test');
  }
  assert.equal(app.isComplete(), true);
});

test('EnglishTrainingApp.getResults() returns session stats', () => {
  const app = new EnglishTrainingApp();
  app.startSession();
  const results = app.getResults();
  assert.equal(results.totalQuestions, 10);
  assert.equal(results.completed, 0);
  assert.ok(results.percentage !== undefined);
});