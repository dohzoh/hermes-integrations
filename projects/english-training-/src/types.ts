/** Shared type definitions for the English Training app. */

export interface Question {
  id: number;
  situation: string;
  question: string;
  answer: string;
  keywords: string[];
}

export type Grade = "Excellent" | "Good" | "Needs Improvement";

export interface GradeResult {
  score: number;
  grade: Grade;
  feedback: string;
  hint: string;
  example: string;
}

export interface SubmitResult extends GradeResult {
  progress: string;
  isComplete: boolean;
  sessionScore: number;
}

export interface SessionResults {
  totalQuestions: number;
  score: number;
  completed: number;
  percentage: number;
}
