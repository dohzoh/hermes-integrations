/**
 * Main Application Module
 * English Training App - 三語英語トレーニング
 */

import { generateSessionQuestions, getSituations } from './questions.js';
import { gradeAnswer } from './grading.js';

export class EnglishTrainingApp {
  constructor() {
    this.sessionQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.sessionStarted = false;
  }

  /** Start a new session with 10 questions */
  startSession() {
    this.sessionQuestions = generateSessionQuestions(10);
    this.currentIndex = 0;
    this.score = 0;
    this.sessionStarted = true;
    return this.getCurrentQuestion();
  }

  /** Get the current question */
  getCurrentQuestion() {
    if (this.currentIndex >= this.sessionQuestions.length) {
      return null;
    }
    return this.sessionQuestions[this.currentIndex];
  }

  /** Submit an answer and grade it */
  submitAnswer(userAnswer) {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    const result = gradeAnswer(question, userAnswer);
    this.score += result.score;
    this.currentIndex++;

    return {
      ...result,
      progress: `${this.currentIndex} of 10`,
      isComplete: this.currentIndex >= this.sessionQuestions.length,
      sessionScore: this.score
    };
  }

  /** Get session results */
  getResults() {
    return {
      totalQuestions: this.sessionQuestions.length,
      score: this.score,
      completed: this.currentIndex,
      percentage: Math.round((this.score / (this.sessionQuestions.length * 3)) * 100)
    };
  }

  /** Check if session is complete */
  isComplete() {
    return this.currentIndex >= this.sessionQuestions.length;
  }
}
