import { describe, it, expect } from 'vitest';
import { gradeAnswer } from '../src/grading.js';

describe('grading module', () => {
  it('scores keyword matches', () => {
    const question = {
      question: 'What is the weather like today?',
      answer: 'It is sunny and warm.',
      keywords: ['sunny', 'rainy', 'warm', 'cold', 'cloudy']
    };
    const result = gradeAnswer(question, 'It is sunny and warm.');
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it('detects partial matches', () => {
    const question = {
      question: 'How do you get to work?',
      answer: 'I take the train.',
      keywords: ['train', 'bus', 'car', 'walk', 'bike']
    };
    const result = gradeAnswer(question, 'I take the train.');
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it('handles empty answers', () => {
    const question = {
      question: 'What is the weather like today?',
      answer: 'It is sunny and warm.',
      keywords: ['sunny', 'rainy', 'warm', 'cold', 'cloudy']
    };
    const result = gradeAnswer(question, '');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('provides feedback, hint, and example', () => {
    const question = {
      question: 'Where is the train station?',
      answer: 'Go straight and turn left.',
      keywords: ['station', 'left', 'straight', 'right', 'near']
    };
    const result = gradeAnswer(question, 'Go straight.');
    expect(result.feedback).toBeDefined();
    expect(result.hint).toBeDefined();
    expect(result.example).toBeDefined();
  });
});
