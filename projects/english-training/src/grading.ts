import type { Question, GradeResult } from "./types";

/**
 * Grade a user answer against a question
 * @param question - The question object
 * @param userAnswer - The user's response
 * @returns Grade result with score and feedback
 */
export function gradeAnswer(question: Question, userAnswer: string): GradeResult {
  const expectedAnswer = question.answer;
  const keywords = question.keywords;
  const normalizedAnswer = userAnswer.toLowerCase().trim();
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedAnswer.includes(keyword)) score += 1;
  }

  // Bonus points for correct grammar/structure (simplified)
  if (score === 0 && normalizedAnswer.length > 0 && normalizedAnswer.trim().length > 2) {
    score = 1;
  }

  // Determine grade
  let grade: Grade;
  if (score >= 2) grade = "Excellent";
  else if (score >= 1) grade = "Good";
  else grade = "Needs Improvement";

  // Generate feedback inline
  const feedback: string[] = [];
  if (score >= 2) {
    feedback.push("Great job! Your answer is correct and well-formed.");
  } else if (score >= 1) {
    feedback.push("Good effort! Your answer is almost correct.");
  } else {
    feedback.push("Try again. Think about the question and give a clearer answer.");
  }

  return {
    score,
    grade,
    feedback: feedback.join(" "),
    hint:
      keywords && keywords.length > 0
        ? `Hint: Try using the word "${keywords[0]}" in your answer.`
        : "Hint: Take your time and think about the question.",
    example: expectedAnswer,
  };
}
