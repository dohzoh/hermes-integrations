#!/usr/bin/env node

/**
 * CLI for English Training
 */

import { generateSessionQuestions } from './questions.js';
import { gradeAnswer } from './grading.js';

console.log('=== English Training CLI ===');
console.log('Generating 5 questions...');

const questions = generateSessionQuestions(5);

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  console.log(`\n--- Question ${i + 1} (${q.situation}) ---`);
  console.log('Q:', q.question);
  console.log('Expected answer:', q.answer);
  console.log('Hint keywords:', q.keywords.join(', '));
}
