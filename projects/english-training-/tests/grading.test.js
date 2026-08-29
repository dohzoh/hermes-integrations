import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer } from '../src/grading.js';

describe('gradeAnswer edge cases', () => {
  test('grades Excellent for 2+ keyword matches', () => {
    const q = {
      answer: 'I take the train to work.',
      keywords: ['train', 'bus', 'car', 'walk', 'bike', 'work']
    };
    const result = gradeAnswer(q, 'I take the train to work');
    assert.equal(result.grade, 'Excellent');
    assert.ok(result.score >= 2);
  });

  test('grades Good for exactly 1 keyword match', () => {
    const q = {
      answer: 'I take the train.',
      keywords: ['train', 'bus', 'car', 'walk', 'bike']
    };
    const result = gradeAnswer(q, 'I take the bus');
    assert.equal(result.grade, 'Good');
    assert.ok(result.score >= 1);
  });

  test('grades Needs Improvement for no keyword matches and short answer', () => {
    const q = {
      answer: 'I take the train.',
      keywords: ['train', 'bus', 'car', 'walk', 'bike']
    };
    const result = gradeAnswer(q, 'Hi');
    assert.equal(result.grade, 'Needs Improvement');
    assert.equal(result.score, 0);
  });

  test('grades Good for contentful non-keyword answer (fallback score)', () => {
    const q = {
      answer: 'I take the train.',
      keywords: ['train', 'bus', 'car', 'walk', 'bike']
    };
    const result = gradeAnswer(q, 'Hello world');
    assert.equal(result.grade, 'Good');
    assert.equal(result.score, 1); // Fallback bonus
  });

  test('returns hint with first keyword', () => {
    const q = {
      answer: 'I take the train.',
      keywords: ['train', 'bus', 'car']
    };
    const result = gradeAnswer(q, 'Hello');
    assert.ok(result.hint.includes('train'));
  });

  test('returns feedback string', () => {
    const q = {
      answer: 'It is sunny.',
      keywords: ['sunny', 'rainy']
    };
    const result = gradeAnswer(q, 'It is sunny');
    assert.ok(typeof result.feedback === 'string');
    assert.ok(result.feedback.length > 0);
  });

  test('handles null/undefined answer', () => {
    const q = {
      answer: 'It is sunny.',
      keywords: ['sunny', 'rainy']
    };
    const result = gradeAnswer(q, null);
    assert.equal(result.grade, 'Needs Improvement');
    assert.equal(result.score, 0);
  });
});
