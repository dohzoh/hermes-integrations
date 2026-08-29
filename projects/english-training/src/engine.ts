import type { Question, SubmitResult, SessionResults } from "./types";

export class EnglishTrainingApp {
  sessionQuestions: Question[] = [];
  currentIndex = 0;
  score = 0;
  sessionStarted = false;

  /** Start a new session with 10 questions */
  startSession(): Question | null {
    this.sessionQuestions = generateSessionQuestions(10);
    this.currentIndex = 0;
    this.score = 0;
    this.sessionStarted = true;
    return this.getCurrentQuestion();
  }

  /** Get the current question */
  getCurrentQuestion(): Question | null {
    if (this.currentIndex >= this.sessionQuestions.length) {
      return null;
    }
    return this.sessionQuestions[this.currentIndex];
  }

  /** Submit an answer and grade it */
  submitAnswer(userAnswer: string): SubmitResult | null {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    const result = gradeAnswer(question, userAnswer);
    this.score += result.score;
    this.currentIndex++;

    return {
      ...result,
      progress: `${this.currentIndex} of 10`,
      isComplete: this.currentIndex >= this.sessionQuestions.length,
      sessionScore: this.score,
    };
  }

  /** Get session results */
  getResults(): SessionResults {
    return {
      totalQuestions: this.sessionQuestions.length,
      score: this.score,
      completed: this.currentIndex,
      percentage: Math.round((this.score / (this.sessionQuestions.length * 3)) * 100),
    };
  }

  /** Check if session is complete */
  isComplete(): boolean {
    return this.currentIndex >= this.sessionQuestions.length;
  }
}
