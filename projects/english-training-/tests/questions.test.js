import { describe, it, expect } from 'vitest';
import { generateSessionQuestions, getSituations } from '../src/questions.js';

describe('question generator', () => {
  it('returns correct count', () => {
    const questions = generateSessionQuestions(10);
    expect(questions.length).toBe(10);
  });

  it('returns unique questions', () => {
    const questions = generateSessionQuestions(10);
    const ids = new Set(questions.map(q => q.id));
    expect(ids.size).toBe(10);
  });

  it('includes all required fields', () => {
    const questions = generateSessionQuestions(5);
    const q = questions[0];
    expect(q.id).toBeDefined();
    expect(q.situation).toBeDefined();
    expect(q.question).toBeDefined();
    expect(q.answer).toBeDefined();
    expect(q.keywords).toBeDefined();
  });

  it('getSituations returns array with expected values', () => {
    const situations = getSituations();
    expect(Array.isArray(situations)).toBe(true);
    expect(situations.length).toBeGreaterThan(0);
    expect(situations).toContain('Daily Life');
    expect(situations).toContain('Shopping');
  });
});
